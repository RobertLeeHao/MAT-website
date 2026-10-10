# 上线步骤：讨论区、beta 下载、（以后）域名（v3.7 · 2026-10-10）

现在官网只有两个入口：**Download for Mac**（GitHub Releases）和 **Discuss on GitHub**（GitHub Discussions）。
没有等候名单，也就不需要数据库、发信服务和密钥。原来的等候名单代码原样留在 `archive/waitlist-worker/`，不再使用。

要你本人做的：在 GitHub 网页上点几下、在终端跑两条命令。下面按顺序来，第一次大约 20 分钟。

---

## 1. 打开讨论区（约 5 分钟）

> **2026-10-10 已做好**（Claude 在你的 Chrome 里操作）：
> - 两个仓库已改名：官网 `MAT-website` → **`MAT`**（公开），app `MAT` → **`MAT-App`**（私有）。GitHub 会把旧地址自动跳转过来，但 Pages 地址变成了 <https://robertleehao.github.io/MAT/>，旧地址 `/MAT-website/` 不会跳转。
> - 本机两个仓库的 `origin` 已改成新地址；`publish.sh`、`release.sh`、README、issue 表单里的链接也都已更新。本机文件夹名（`~/code/MAT-website`、`~/code/MATDemo`）没有改。
> - Discussions 已开启，**Use cases** 分类已建好（地址 `use-cases`），About 的简介和标签已更新。
>
> 还剩：下面第 2 步里的可选清理；第 3 步的置顶讨论，等第一个 release 发出来再发（帖子里的下载链接要先能用）。

1. 打开 <https://github.com/RobertLeeHao/MAT/settings>，在 **General → Features** 里勾上 **Discussions**。
2. 进入仓库的 **Discussions** 标签页，点左侧分类旁的铅笔图标（Edit categories），整理成下面四个：

| 分类 | 格式 | 说明（填进 Description） |
|---|---|---|
| Announcements | Announcement（只有你能发） | Builds and news from us. |
| Ideas | Open-ended discussion | What should MAT do next? |
| Use cases | Open-ended discussion | One job you'd hand MAT first. |
| Q&A | Question / Answer | Ask anything about using MAT. |

   - Ideas、Q&A、Announcements 是默认就有的；**Use cases** 要新建，名字就写 `Use cases`，GitHub 会把它的地址写成 `use-cases`，和仓库里的表单 `.github/DISCUSSION_TEMPLATE/use-cases.yml` 对得上。
   - General、Polls、Show and tell 可以删掉，分类少一点，大家更知道往哪发。
3. 在 Use cases 里发第一条讨论并置顶（讨论页右侧 **Pin discussion**）。文案见本文末尾附录 A。
4. 仓库首页右侧的 About 齿轮里，Website 填官网地址，Topics 加上 `macos`、`ai`、`multi-agent`、`llm`。

仓库里已经写好的：
- `.github/ISSUE_TEMPLATE/`：两种 issue 表单（Bug in the beta、A crew for your company），不允许空白 issue；想法和提问会被引导到 Discussions。
- `.github/DISCUSSION_TEMPLATE/`：Ideas 和 Use cases 的发帖表单。

## 2. 发第一个 beta（约 10 分钟）

```sh
sh ~/code/MATDemo/release.sh 0.1.0
```

它会：
1. 编译 Release，生成 Apple 芯片和 Intel 都能用的通用版；
2. 打包成 `MAT-macOS.zip`，检查签名，并扫一遍包里有没有像 key 的东西；
3. 在**这个公开仓库**建一个 GitHub Release（app 源码仍在私有仓库），再把版本号写进 `index.html`。

想先看一眼再公开，就加 `--draft`，然后在 GitHub 上点 Publish。

然后发布官网：

```sh
sh ~/code/MAT-website/publish.sh
```

- 下载链接永远是 `…/releases/latest/download/MAT-macOS.zip`，所以以后发新版只要再跑一次 `release.sh 0.1.1`，官网不用改链接，只会更新版本号那一行。
- 还没发过 release 时，下载按钮会显示 "Get the beta on GitHub" 并打开 Releases 页，不会指向一个不存在的文件。

**关于"无法验证开发者"**：没有 Apple 开发者账号（$99/年）就没法公证，所以别人第一次打开时 macOS 会拦一下，要到「系统设置 › 隐私与安全性」点「仍要打开」。官网的 **How to open it**（`#install`）和每个 release 的说明里都写了这几步。以后买了账号，在 `release.sh` 里加上公证，这一步就没了。

## 3. 以后再做：askmat.app 域名（可选）

现在官网用的是 GitHub Pages：<https://robertleehao.github.io/MAT/>，什么都不用配。想换成 askmat.app 时：

1. 在 Cloudflare 注册并买下 `askmat.app`：**Domain Registration → Register Domains**。
2. **Workers & Pages → Create → Import a repository**，选 `RobertLeeHao/MAT`，部署命令填 `npx wrangler deploy`。`wrangler.jsonc` 已经改成只发静态文件，不需要数据库，也不需要密钥。
3. 进入这个项目的 **Settings → Domains & Routes → Add → Custom domain**，加上 `askmat.app` 和 `www.askmat.app`。
4. 把页面和 issue 表单里的旧地址换掉：

   ```sh
   cd ~/code/MAT-website
   sed -i '' 's#https://robertleehao.github.io/MAT/#https://askmat.app/#g' index.html .github/ISSUE_TEMPLATE/config.yml
   ```

5. 统计（可选）：**Analytics & Logs → Web Analytics → Add a site**，把给出的 token 填进 `index.html` 里的 `beacon:''`。它只在 askmat.app 上加载。
6. 收信（可选）：**askmat.app → Email → Email Routing**，把 `hello@askmat.app` 转发到你的邮箱。页面上 Contact 页、企业那张卡片和 issue 表单里都写了这个地址，在开通之前寄过来的信会丢。

---

## 附录 A · 置顶讨论（发在 Use cases）

**Title:** What's the first job you'd hand MAT?

**Body:**

> MAT is in an open beta. Download it from the [latest release](https://github.com/RobertLeeHao/MAT/releases/latest), connect the AIs you already pay for, and ask.
>
> We're tuning the crews, the checks and the model picks on real work, so the most useful thing you can tell us is **one job you'd hand MAT first** — and how often you'd run it.
>
> A few we're already testing: a competitor teardown with prices and sources; a weekly brief from 40 updates; "RAG or fine-tuning for our support bot?".
>
> Reply below with yours. Bugs go in [issues](https://github.com/RobertLeeHao/MAT/issues/new/choose). Please never paste an API key.

## 附录 B · 第一条公告（发在 Announcements，和第一个 release 同时）

**Title:** MAT 0.1 is out — free beta for Mac

**Body:**

> One chat for every AI you already pay for. A question gets an answer; a job gets one model, or a crew when the work splits — checked at every step, running on your own computer.
>
> - Download: [MAT-macOS.zip](https://github.com/RobertLeeHao/MAT/releases/latest/download/MAT-macOS.zip) · macOS 13 or later
> - First open: System Settings › Privacy & Security › Open Anyway (the beta isn't notarized yet)
> - Tell us what breaks, and what you'd hand it first: [Use cases](https://github.com/RobertLeeHao/MAT/discussions/categories/use-cases)
