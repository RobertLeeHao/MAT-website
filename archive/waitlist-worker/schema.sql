-- MAT waitlist · D1 schema
-- Apply once:  npx wrangler d1 execute mat-waitlist --remote --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS signups (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,          -- lower-cased, trimmed
  token         TEXT    NOT NULL UNIQUE,          -- private: confirm / manage / leave links
  code          TEXT    NOT NULL UNIQUE,          -- public: the invite link (?ref=code)
  status        TEXT    NOT NULL DEFAULT 'pending', -- pending | confirmed
  seq           INTEGER,                          -- order of confirmation (1, 2, 3 …)
  ref_by        TEXT,                             -- code of the person who invited them
  src           TEXT,                             -- channel: utm_source / ?s= / referrer host
  want          TEXT,                             -- "What would you hand MAT first?"
  ip_hash       TEXT,                             -- salted hash, only for rate limiting
  mail_state    TEXT    NOT NULL DEFAULT 'queued',  -- queued | sent | failed | skipped
  mail_kind     TEXT    NOT NULL DEFAULT 'confirm', -- confirm | already
  mail_tries    INTEGER NOT NULL DEFAULT 0,
  last_mail_at  INTEGER,
  created_at    INTEGER NOT NULL,
  confirmed_at  INTEGER,
  invited_at    INTEGER                           -- set by hand when a seat is sent
);

CREATE INDEX IF NOT EXISTS idx_signups_status ON signups(status, seq);
CREATE INDEX IF NOT EXISTS idx_signups_ref    ON signups(ref_by, status);
CREATE INDEX IF NOT EXISTS idx_signups_mail   ON signups(mail_state);
CREATE INDEX IF NOT EXISTS idx_signups_ip     ON signups(ip_hash, created_at);

-- emails sent per UTC day, so the free mail plan's daily cap is never exceeded
CREATE TABLE IF NOT EXISTS mail_days (
  day   TEXT PRIMARY KEY,   -- YYYY-MM-DD
  sent  INTEGER NOT NULL DEFAULT 0
);
