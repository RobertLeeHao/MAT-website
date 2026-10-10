// MAT website · one Worker: serves the static site and the waitlist API.
//
//   POST /api/join      {email, src, ref, hp}     → always {ok:true, state:"check"} (no account enumeration)
//   GET  /api/confirm?t → 303 to /#confirm=t      (the page POSTs it back, so mail scanners can't confirm)
//   POST /api/confirm   {t}                       → {ok, position, total, code, refs}
//   GET  /api/me?t                                → same shape, for the welcome sheet
//   POST /api/want      {t, want}                 → saves the answer to "What would you hand MAT first?"
//   GET  /api/leave?t   → a page with one button;  POST /api/leave {t} → the row is deleted
//   GET  /api/admin/stats         (basic auth, password = ADMIN_TOKEN)
//   GET  /api/admin/export.csv    (basic auth)
//   cron (every 10 min) → sends queued mails, never more than DAILY_MAIL_CAP a day
//
// Bindings (wrangler.jsonc): DB (D1), ASSETS (static files).
// Secrets:  RESEND_API_KEY, ADMIN_TOKEN, IP_SALT.   Vars: SITE_URL, MAIL_FROM, DAILY_MAIL_CAP, REF_BONUS.

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const MAIL_GAP_MS = 10 * 60 * 1000;   // at most one mail per address per 10 minutes
const JOINS_PER_IP_HOUR = 20;   // generous: offices, campuses and mobile carriers put many people behind one address

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      return await route(req, env, ctx, url);
    } catch (e) {
      console.error('api error', e && e.stack || e);
      return json({ ok: false, error: 'server' }, 500);
    }
  },
  async scheduled(_ev, env, ctx) {
    ctx.waitUntil(drainMail(env, 40));
  },
};

async function route(req, env, ctx, url) {
  const p = url.pathname, m = req.method;

  if (p === '/api/join' && m === 'POST') return join(req, env, ctx);
  if (p === '/api/confirm' && m === 'GET') {
    const t = clean(url.searchParams.get('t'), 64);
    return Response.redirect(`${site(env)}/#confirm=${encodeURIComponent(t)}`, 303);
  }
  if (p === '/api/confirm' && m === 'POST') return confirm(req, env);
  if (p === '/api/me' && m === 'GET') return me(env, clean(url.searchParams.get('t'), 64));
  if (p === '/api/want' && m === 'POST') return want(req, env);
  if (p === '/api/leave' && m === 'GET') return leavePage(env, clean(url.searchParams.get('t'), 64));
  if (p === '/api/leave' && m === 'POST') return leave(req, env);
  if (p.startsWith('/api/admin/')) {
    if (!adminOK(req, env)) return new Response('Auth required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="MAT waitlist"' } });
    if (p === '/api/admin/stats') return stats(env);
    if (p === '/api/admin/export.csv') return exportCsv(env);
  }
  return json({ ok: false, error: 'not_found' }, 404);
}

// ─── join ────────────────────────────────────────────────────────────────
async function join(req, env, ctx) {
  const b = await body(req);
  if (b.hp) return json({ ok: true, state: 'check' });           // honeypot: bots fill every field
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'email' }, 400);

  const now = Date.now();
  const ipHash = await hash((req.headers.get('CF-Connecting-IP') || '') + (env.IP_SALT || 'mat'));
  const recent = await env.DB.prepare('SELECT COUNT(*) n FROM signups WHERE ip_hash=? AND created_at>?')
    .bind(ipHash, now - 3600e3).first('n');
  if (recent >= JOINS_PER_IP_HOUR) return json({ ok: false, error: 'rate' }, 429);

  const src = clean(b.src, 40) || null;
  const refBy = /^[a-z0-9]{6,12}$/.test(b.ref || '') ? b.ref : null;
  const row = await env.DB.prepare('SELECT id,status,last_mail_at FROM signups WHERE email=?').bind(email).first();

  if (!row) {
    await env.DB.prepare(`INSERT INTO signups (email,token,code,status,ref_by,src,ip_hash,mail_state,mail_kind,created_at)
      VALUES (?,?,?,?,?,?,?,'queued','confirm',?)`)
      .bind(email, rand(32), rand(8, true), 'pending', refBy, src, ipHash, now).run();
  } else if (!row.last_mail_at || now - row.last_mail_at > MAIL_GAP_MS) {
    // known address: pending gets the confirm link again, confirmed gets its own links back
    await env.DB.prepare(`UPDATE signups SET mail_state='queued', mail_kind=? WHERE id=?`)
      .bind(row.status === 'confirmed' ? 'already' : 'confirm', row.id).run();
  }
  ctx.waitUntil(drainMail(env, 5));        // send now if today's cap allows; the cron catches the rest
  return json({ ok: true, state: 'check' });
}

// ─── confirm / me / want / leave ─────────────────────────────────────────
async function confirm(req, env) {
  const t = clean((await body(req)).t, 64);
  const row = await byToken(env, t);
  if (!row) return json({ ok: false, error: 'token' }, 404);
  if (row.status !== 'confirmed') {
    // seq = next number; the WHERE keeps a double click from taking two
    await env.DB.prepare(`UPDATE signups SET status='confirmed', confirmed_at=?,
        seq=(SELECT COALESCE(MAX(seq),0)+1 FROM signups) WHERE id=? AND status!='confirmed'`)
      .bind(Date.now(), row.id).run();
  }
  return me(env, t);
}

async function me(env, t) {
  const row = await byToken(env, t);
  if (!row) return json({ ok: false, error: 'token' }, 404);
  if (row.status !== 'confirmed') return json({ ok: true, state: 'pending' });
  return json({ ok: true, state: 'confirmed', ...(await standing(env, row)), code: row.code, want: row.want || '' });
}

async function want(req, env) {
  const b = await body(req);
  const row = await byToken(env, clean(b.t, 64));
  if (!row) return json({ ok: false, error: 'token' }, 404);
  const w = String(b.want || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  await env.DB.prepare('UPDATE signups SET want=? WHERE id=?').bind(w || null, row.id).run();
  return json({ ok: true });
}

async function leavePage(env, t) {
  const row = await byToken(env, t);
  const ok = !!row;
  return html(page(ok ? 'Leave the waitlist' : 'Already gone',
    ok ? `<p>This removes <b>${esc(row.email)}</b> and everything stored with it. It can’t be undone.</p>
          <form method="post" action="/api/leave"><input type="hidden" name="t" value="${esc(t)}"><button>Remove me</button></form>`
       : `<p>This link doesn’t match anyone on the list — it may have been used already.</p>`, env));
}

async function leave(req, env) {
  const t = clean((await body(req)).t, 64);
  await env.DB.prepare('DELETE FROM signups WHERE token=?').bind(t).run();
  return html(page('You’re off the list', '<p>Your email and everything stored with it have been deleted.</p>', env));
}

// ─── standing: position counts confirmed people only; each confirmed invite moves you up REF_BONUS places ──
async function standing(env, row) {
  const bonus = Number(env.REF_BONUS || 5);
  const r = await env.DB.prepare(`
    WITH c AS (
      SELECT s.id, s.seq, s.seq - ?1 * (SELECT COUNT(*) FROM signups x WHERE x.ref_by = s.code AND x.status='confirmed') AS score,
             (SELECT COUNT(*) FROM signups x WHERE x.ref_by = s.code AND x.status='confirmed') AS refs
      FROM signups s WHERE s.status='confirmed'
    )
    SELECT (SELECT COUNT(*) FROM c) AS total,
           me.refs AS refs,
           1 + (SELECT COUNT(*) FROM c o WHERE o.score < me.score OR (o.score = me.score AND o.seq < me.seq)) AS position
    FROM c me WHERE me.id = ?2`).bind(bonus, row.id).first();
  return { position: r.position, total: r.total, refs: r.refs, bonus };
}

// ─── mail ────────────────────────────────────────────────────────────────
async function drainMail(env, max) {
  if (!env.RESEND_API_KEY) return;   // no mail key yet: everything waits in the queue and goes out once the key is set
  const cap = Number(env.DAILY_MAIL_CAP || 95);
  const day = new Date().toISOString().slice(0, 10);
  const sent = (await env.DB.prepare('SELECT sent FROM mail_days WHERE day=?').bind(day).first('sent')) || 0;
  const room = Math.min(max, cap - sent);
  // a row left 'sending' by a Worker that died mid-send goes back in the queue after 15 minutes
  await env.DB.prepare(`UPDATE signups SET mail_state='queued' WHERE mail_state='sending' AND last_mail_at<?`).bind(Date.now() - 15 * 60e3).run();
  if (room <= 0) return;
  const { results } = await env.DB.prepare(`SELECT * FROM signups WHERE mail_state='queued' AND mail_tries<5 ORDER BY created_at LIMIT ?`).bind(room).all();
  for (const row of results) {
    // claim the row first so the cron and a join can't both send it
    const claim = await env.DB.prepare(`UPDATE signups SET mail_state='sending', last_mail_at=? WHERE id=? AND mail_state='queued'`).bind(Date.now(), row.id).run();
    if (!claim.meta.changes) continue;
    let state = 'sent';
    try { state = await sendMail(env, row); }
    catch (e) { console.error('mail', row.id, e && e.message); state = row.mail_tries >= 4 ? 'failed' : 'queued'; }
    await env.DB.prepare(`UPDATE signups SET mail_state=?, mail_tries=mail_tries+1, last_mail_at=? WHERE id=?`)
      .bind(state, Date.now(), row.id).run();
    if (state === 'sent') await env.DB.prepare(`INSERT INTO mail_days(day,sent) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET sent=sent+1`).bind(day).run();
  }
}

async function sendMail(env, row) {
  const s = site(env), api = s;   // the API lives on the site's own origin
  const confirmUrl = `${api}/api/confirm?t=${row.token}`;
  const leaveUrl = `${api}/api/leave?t=${row.token}`;
  const meUrl = `${s}/#welcome=${row.token}`;
  const m = row.mail_kind === 'already'
    ? { subject: 'You’re already on the MAT waitlist',
        lines: ['You’re already on the list — nothing else to do.', 'Your place and your invite link are here:'],
        cta: ['See your place', meUrl] }
    : { subject: 'Confirm your place on the MAT waitlist',
        lines: ['One click and you’re on the list for MAT — one chat, and a crew on the models you already pay for.', 'If you didn’t ask for this, ignore this email and nothing happens.'],
        cta: ['Confirm my email', confirmUrl] };

  const r = await fetch(env.RESEND_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM, to: [row.email], subject: m.subject,
      html: mailHtml(m, leaveUrl), text: `${m.lines.join('\n\n')}\n\n${m.cta[0]}: ${m.cta[1]}\n\n—\nMAT · runs locally · free while in beta\nLeave the waitlist: ${leaveUrl}`,
      headers: { 'List-Unsubscribe': `<${leaveUrl}>` },
    }),
  });
  if (r.status === 429 || r.status >= 500) throw new Error(`resend ${r.status}`);
  if (!r.ok) { console.error('resend', r.status, await r.text()); return 'failed'; }
  return 'sent';
}

// plain, table-based, light ground: mail clients ignore most CSS and many force their own dark mode
function mailHtml(m, leaveUrl) {
  const p = m.lines.map(l => `<p style="margin:0 0 16px;font:15px/1.5 -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#111112">${esc(l)}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#F4EFE6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE6"><tr><td style="padding:40px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
<tr><td style="padding-bottom:32px;font:600 17px -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#111112;letter-spacing:.02em">MAT</td></tr>
<tr><td style="border-top:0.5px solid rgba(17,17,18,.2);padding-top:24px">${p}
<a href="${esc(m.cta[1])}" style="display:inline-block;margin-top:8px;padding:12px 20px;background:#111112;color:#F4EFE6;text-decoration:none;font:600 15px -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif">${esc(m.cta[0])} →</a>
</td></tr>
<tr><td style="padding-top:40px;font:13px/1.5 -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:rgba(17,17,18,.55)">MAT · runs locally · free while in beta<br><a href="${esc(leaveUrl)}" style="color:rgba(17,17,18,.55)">Leave the waitlist</a></td></tr>
</table></td></tr></table></body></html>`;
}

// ─── admin ───────────────────────────────────────────────────────────────
function adminOK(req, env) {
  if (!env.ADMIN_TOKEN) return false;
  const h = req.headers.get('Authorization') || '';
  if (h === `Bearer ${env.ADMIN_TOKEN}`) return true;
  if (!h.startsWith('Basic ')) return false;
  try { return atob(h.slice(6)).split(':').slice(1).join(':') === env.ADMIN_TOKEN; } catch { return false; }
}

async function stats(env) {
  const q = s => env.DB.prepare(s).all().then(r => r.results);
  const [tot] = await q(`SELECT COUNT(*) all_rows, SUM(status='confirmed') confirmed, SUM(status='pending') pending,
      SUM(want IS NOT NULL) answered, SUM(ref_by IS NOT NULL AND status='confirmed') via_invite FROM signups`);
  const bySrc = await q(`SELECT COALESCE(src,'(direct)') src, COUNT(*) joined, SUM(status='confirmed') confirmed FROM signups GROUP BY 1 ORDER BY joined DESC`);
  const byDay = await q(`SELECT date(created_at/1000,'unixepoch') day, COUNT(*) joined, SUM(status='confirmed') confirmed FROM signups GROUP BY 1 ORDER BY 1 DESC LIMIT 60`);
  const mail = await q(`SELECT mail_state, COUNT(*) n FROM signups GROUP BY 1`);
  const topInviters = await q(`SELECT s.email, COUNT(x.id) invites FROM signups s JOIN signups x ON x.ref_by=s.code AND x.status='confirmed' GROUP BY s.id ORDER BY invites DESC LIMIT 20`);
  return json({ ok: true, totals: tot, by_source: bySrc, by_day: byDay, mail, top_inviters: topInviters });
}

async function exportCsv(env) {
  const { results } = await env.DB.prepare(`SELECT s.seq, s.email, s.status, s.src, s.ref_by, s.code, s.want,
      datetime(s.created_at/1000,'unixepoch') created, datetime(s.confirmed_at/1000,'unixepoch') confirmed,
      (SELECT COUNT(*) FROM signups x WHERE x.ref_by=s.code AND x.status='confirmed') invites, s.invited_at
    FROM signups s ORDER BY s.status='confirmed' DESC, s.seq, s.created_at`).all();
  const cols = ['seq', 'email', 'status', 'src', 'ref_by', 'code', 'invites', 'want', 'created', 'confirmed', 'invited_at'];
  const cell = v => v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const csv = '﻿' + [cols.join(','), ...results.map(r => cols.map(c => cell(r[c])).join(','))].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="mat-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
}

// ─── helpers ─────────────────────────────────────────────────────────────
const site = env => (env.SITE_URL || '').replace(/\/$/, '');
const byToken = (env, t) => t && t.length >= 20 ? env.DB.prepare('SELECT * FROM signups WHERE token=?').bind(t).first() : null;
const clean = (v, n) => String(v || '').replace(/[^\w.\-]/g, '').slice(0, n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function body(req) {
  const ct = req.headers.get('Content-Type') || '';
  try {
    if (ct.includes('application/json')) return await req.json();
    return Object.fromEntries(await req.formData());
  } catch { return {}; }
}

function rand(n, lower = false) {
  const abc = lower ? 'abcdefghjkmnpqrstuvwxyz23456789' : 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, x => abc[x % abc.length]).join('');
}

async function hash(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d).slice(0, 12), x => x.toString(16).padStart(2, '0')).join('');
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
function html(s, status = 200) {
  return new Response(s, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function page(title, inner, env) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} · MAT</title>
<style>body{margin:0;background:#111112;color:#F4EFE6;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
main{max-width:480px;padding:80px 24px}a.l{font-weight:600;color:#F4EFE6;text-decoration:none;letter-spacing:.02em}
h1{font-size:40px;line-height:1.1;font-weight:600;margin:64px 0 24px;letter-spacing:-.01em}p{color:rgba(244,239,230,.66)}b{color:#F4EFE6}
button{margin-top:16px;padding:12px 20px;border:0;background:#F4EFE6;color:#111112;font:600 15px inherit;font-family:inherit;cursor:pointer}</style></head>
<body><main><a class="l" href="${esc(site(env) || '/')}">MAT</a><h1>${esc(title)}</h1>${inner}</main></body></html>`;
}
