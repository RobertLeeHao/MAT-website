# 上线步骤：域名、托管、等候名单、统计（askmat.app · Cloudflare）

这份清单是给 Robert 照着点的。要你本人做的只有：付款、登录、复制粘贴几个密钥。其余的代码、配置和数据库表都已经在仓库里写好了。
全部做完大约 40 分钟。

整体结构：一个 Cloudflare Worker 同时负责两件事。

- 官网页面：仓库根目录的 `index.html`、`og.png` 和几个图标，作为静态文件发布。
- 等候名单 API：`/api/*`，代码在 `worker/index.js`。数据存在 D1 数据库里，确认邮件通过 Resend 发出。

仓库连上 Cloudflare 之后，每次运行 `publish.sh` 推到 GitHub，Cloudflare 就会自动重新部署。

---

## 0. 准备

- 一张能付美元的国际信用卡（Visa 或 Mastercard），用来买域名。其余服务都在免费额度内。
- 本机已经装好 Node（`node -v` 能看到版本号）。没有的话先运行 `brew install node`。

## 1. 注册 Cloudflare，买 askmat.app（约 10 分钟）

1. 打开 <https://dash.cloudflare.com/sign-up>，用常用邮箱注册并验证。
2. 左侧菜单进入 **Domain Registration → Register Domains**，搜索 `askmat.app`。
   - 2026-10-09 查询时，askmat.app 还没有人注册（askmat.com 和 askmat.ai 已被注册）。
   - 如果显示为 premium（溢价）域名或已被注册，先停下来告诉我，我们换名字，比如 `getmat.app` 或 `usemat.app`，这两个当时也都没人注册。
3. 填写联系人信息并付款。Cloudflare 按成本价卖，续费价格和首年一样。WHOIS 隐私保护默认开启。
   - `.app` 域名强制使用 HTTPS，Cloudflare 会自动签发证书，不需要你做任何事。

## 2. 把仓库连到 Cloudflare（约 10 分钟）

在终端里运行：

```sh
cd ~/code/MAT-website
npm install                          # 装 wrangler（Cloudflare 的命令行工具）
npx wrangler login                   # 浏览器里点 Allow
npx wrangler d1 create mat-waitlist  # 建数据库
```

最后一条命令会打印一个 `database_id`。把它填进 `wrangler.jsonc`，替换 `REPLACE_WITH_DATABASE_ID`。然后继续运行：

```sh
npm run db:init                      # 建表（worker/schema.sql）
npx wrangler secret put ADMIN_TOKEN  # 输入一串只有你知道的长密码，用来看后台统计、导出名单
npx wrangler secret put IP_SALT      # 随便输入一串乱码，用来对访客 IP 做哈希，不存原始 IP
npx wrangler deploy                  # 第一次部署
```

部署完成后会打印一个 `https://mat-website.<你的子域>.workers.dev` 地址。打开它应该能看到官网，在这个地址上等候名单已经是真的了。

**绑定域名**：在 Cloudflare 后台进入 **Workers & Pages → mat-website → Settings → Domains & Routes → Add → Custom domain**，填 `askmat.app` 并保存。再加一条 `www.askmat.app`。

**把页面里的网址换成新域名**：域名生效前，分享卡片、canonical 这几个绝对地址指向 GitHub Pages（这样现在分享出去也有图）。绑好 askmat.app 后运行一次：

```sh
sed -i '' 's#https://robertleehao.github.io/MAT-website/#https://askmat.app/#g' index.html
```

**以后自动部署**：在同一页面进入 **Settings → Build → Connect**，选 GitHub 上的 `RobertLeeHao/MAT-website`，分支选 `main`，构建命令留空，部署命令填 `npx wrangler deploy`。之后照常运行 `sh publish.sh` 就行。

## 3. 确认邮件：Resend（约 10 分钟）

1. 打开 <https://resend.com/signup> 注册。免费额度是每月 3,000 封、每天 100 封。
2. 进入 **Domains → Add Domain**，填 `askmat.app`，区域选离用户近的。
3. Resend 会列出几条 DNS 记录（SPF、DKIM，以及一条用来收退信的 MX）。
   - 如果 Resend 提供 "Sign in to Cloudflare" 一键添加，直接点。
   - 否则就逐条复制到 Cloudflare 的 **askmat.app → DNS → Records → Add record**。
   - 记录的 Proxy 状态一律选 **DNS only**，也就是灰色云朵。
4. 等 Resend 显示 Verified，一般几分钟。然后在 **API Keys → Create** 里新建一个只有 Sending 权限的 key，再运行：

```sh
npx wrangler secret put RESEND_API_KEY   # 粘贴 re_ 开头的 key
```

发件人是 `MAT <hello@askmat.app>`，在 `wrangler.jsonc` 的 `MAIL_FROM` 里改。没配 key 之前，报名照样会记进数据库，邮件会排队，配好 key 后在 10 分钟内自动补发。

**每天 100 封的上限**：代码里默认每天最多发 95 封（`DAILY_MAIL_CAP`），超出的会排队，第二天由定时任务每 10 分钟补发一批。如果哪天发帖火了，可以把 Resend 升级到 Pro（$20/月，5 万封），同时把 `DAILY_MAIL_CAP` 改大。

## 4. 让别人能回信：hello@askmat.app（约 3 分钟）

进入 Cloudflare 的 **askmat.app → Email → Email Routing → Get started**，把 `hello@askmat.app` 转发到你现在的邮箱，并点击验证邮件。

如果 Cloudflare 提示 MX 记录和 Resend 的冲突，就保留 Resend 那条用于退信的 `send` 子域记录。两者用的是不同的子域，正常情况下可以共存。

## 5. 访问统计：Cloudflare Web Analytics（约 3 分钟）

1. 进入 Cloudflare 后台的 **Analytics & Logs → Web Analytics → Add a site**，填 `askmat.app`。
2. 它会给你一段代码，复制里面 `"token": "…"` 的那串值。
3. 打开 `index.html`，搜索 `beacon:''`，把它改成 `beacon:'你的token'`，然后推上去。

这套统计不用 cookie，也不追踪个人，所以页面上不需要弹 cookie 提示，隐私页里也已经写明了。

## 6. 日常怎么看

- **报名统计**：打开 `https://askmat.app/api/admin/stats`，用户名随便填，密码填 `ADMIN_TOKEN`。可以看到总数、已确认数、每个来源的报名数、每天的报名数，以及邀请人数最多的人。
- **导出名单**：打开 `https://askmat.app/api/admin/export.csv`，下载的 CSV 可以直接用 Excel 打开。
- **每个渠道发不同的链接**，这样就知道是哪里带来的人：
  - `https://askmat.app/?s=x`（X / Twitter）
  - `https://askmat.app/?s=jike`（即刻）
  - `https://askmat.app/?s=v2ex`
  - `https://askmat.app/?s=reddit-localllama`
  - `https://askmat.app/?s=hn`
  - `https://askmat.app/?s=ph`（Product Hunt）

  也可以用标准的 `?utm_source=`。
- **发邀请码时**：在 CSV 里挑人，发出邀请后记得把 `invited_at` 标上。用命令行标：`npx wrangler d1 execute mat-waitlist --remote --command "UPDATE signups SET invited_at=strftime('%s','now')*1000 WHERE email='…'"`。

## 7. 旧地址怎么办

`robertleehao.github.io/MAT-website` 可以继续留着，那上面的表单仍然只是预览、不会发出任何东西，因为页面只在 askmat.app、workers.dev 和本地调试时才连接 API。域名生效后，有两种处理方式：

- 在 GitHub 仓库的 Settings → Pages 里关掉 Pages；
- 或者保留它，把 `README` 和 `publish.sh` 里的官网链接都换成 askmat.app。

## 8. 本地调试（可选）

```sh
cp .dev.vars.example .dev.vars
npx wrangler d1 execute mat-waitlist --local --persist-to ../.mat-wl-state --file worker/schema.sql
npx wrangler dev --persist-to ../.mat-wl-state
```

打开 <http://localhost:8787>。`--persist-to` 必须指向仓库外面，否则 wrangler 会因为数据库文件变化反复重载。

---

### 接口一览（worker/index.js）

| 路径 | 作用 |
|---|---|
| `POST /api/join` | 报名。无论邮箱是否已在名单上，都返回同样的结果，这样别人没法借此探测某个邮箱有没有报名。附带 honeypot 防机器人，同一 IP 每小时最多 20 次 |
| `GET /api/confirm?t=` | 邮件里的确认链接。先跳回首页，由页面再提交一次确认，这样邮件安全扫描器自动点开链接时不会误确认 |
| `POST /api/confirm` · `GET /api/me` | 确认，并返回排位、总人数、邀请码和已邀请人数 |
| `POST /api/want` | 保存"你最想先让 MAT 做什么" |
| `GET/POST /api/leave` | 退出名单，删除这个人的全部数据。每封邮件底部都有这个链接 |
| `GET /api/admin/stats` · `/export.csv` | 后台统计和导出，需要 ADMIN_TOKEN |
| 定时任务（每 10 分钟） | 补发排队中的邮件 |

排位规则：只统计已经确认的人；每成功邀请一个人（对方也确认了），排位前进 5 位（`REF_BONUS`）。
