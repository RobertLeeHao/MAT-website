# MAT · 官网

**一个对话，用上你已经付费的所有 AI。** 小事 MAT 当场回答；一件活，MAT 判断是一个模型做完，还是排一支团队分头去做，每一步都复核，只在需要你拍板时打扰你。

🌐 **官网：<https://askmat.app>**（域名开通前：<https://robertleehao.github.io/MAT-website/>）

这个仓库是 MAT 的官网：一个自包含的 [`index.html`](index.html)，加一个很小的 Cloudflare Worker（[`worker/`](worker)）负责等候名单。推送到 `main` 后 Cloudflare 自动部署；上线步骤见 [`worker/SETUP.md`](worker/SETUP.md)。MAT 的 macOS 应用源码在另一个仓库，暂不公开。

> English summary: MAT is a macOS app that turns the AI subscriptions and API keys you already have into one chat. Every message is judged first: a question gets an answer right there; a job one model can finish runs on one model; a job that splits gets a crew — strong models plan and check, cheaper models do the steps in parallel, and a gate checks every stage before the next one starts. What worked is remembered locally, by kind of work, and belongs to you rather than to any model vendor. Minimised, MAT is a single line under the MacBook notch. Status: working prototype, closed beta not yet open. This repository holds the website only.

---

## 1. MAT 是什么

MAT 是一个 macOS 桌面应用。你只跟它说话，像用任何一个大模型聊天应用一样：左边是对话列表，中间是对话，下面是输入框。不同的是，MAT 背后接的不是一家模型，而是你手上所有的模型——Claude、GPT、Gemini、DeepSeek、Kimi、Qwen、智谱、Mistral、Grok、MiniMax、OpenRouter、Groq、Cerebras，以及跑在你自己电脑上的本地模型。

每条消息，MAT 先判断它是什么：

| 你说的 | MAT 做的 | 你得到的 |
|---|---|---|
| 一个问题（"RAG 还是微调？"） | 当场回答 | 几秒钟，一个答案 |
| 一件一个模型能做完的活（"写一封 200 字以内的发布邮件"） | 挑一个合适的模型写，复核后再给你 | 一份能直接用的稿子 |
| 一件能拆开的活（"看看 12 个 AI 笔记应用谁在赢、怎么收费"） | 排一支团队：强模型规划和复核，便宜模型并行干活 | 一份带来源的报告，附上花了多少钱、多久，和"一个强模型从头做到尾"的对比 |

"MAT"既是产品名，也是你在对话里唯一需要面对的对象。团队里的"员工"在右侧抽屉里干活，你想看才看。

## 2. 它解决什么问题

多数人已经同时为好几个 AI 付费，但真正用它们干活，工作量还在自己身上：

- **你在当工作流。** 每一步选哪个模型、把上一个对话的上下文复制到下一个、记住谁说过什么，都是你在做。
- **什么都带不走。** 每家模型只记得自己的对话；换工具或额度用完，上下文和你教过它的东西就没了。
- **一个模型包办一切。** 强模型在简单步骤上又慢又贵，便宜模型在难的步骤上会出错。
- **没人检查。** 一步出错会流进下一步，发现它、返工，都是你的事。

MAT 的核心判断是：**大部分需要 AI 完成的工作，并不需要最聪明的模型。** 合理的工作流、完整精确的指令、每一步的复核，比单个模型的智商更决定质量。所以强模型只做需要判断的地方（规划、签字），其余步骤交给小而快的模型并行做——活越大，相对"全程用强模型"省得越多。

它也诚实：**小活上拆团队反而更贵更慢**，所以不是所有活都拆，一个模型能做完的就一个模型。

## 3. 它怎么工作

```
你 ──▶ MAT（判断）
         ├─ 问题 ───────────────▶ 直接回答
         ├─ 需要先问一句 ────────▶ 一个问题 + 2–3 个快捷选项
         ├─ 一个模型能做完 ──────▶ 一个座位 → 复核 → 交付
         └─ 能拆开 ─────────────▶ 2–5 个阶段，每阶段 1–3 个座位，每个座位按排行榜配模型
                                    ▼
                                 阶段 1 ──闸门──▶ 阶段 2 ──闸门──▶ … ──▶ MAT 签字 ──▶ 交付
                                    │
                                    └── 需要你拍板时：输入框原地变成琥珀色的提问，相关座位暂停
                                                                       │
                                               做成的活按「活的类型」记下做法 ──▶ 下次同类活直接用上
```

- **按排行榜配人**：九个类别（Agents、Search、Reasoning、Writing、Factuality、Image generation 用于配人；Coding、Instruction following、Vision 仅供参考），按 Arena 和 Artificial Analysis 的类别和打法计分。调研座位看 Search，写作看 Writing，复核看 Factuality。
- **模型接力**：一个模型失败换下一个；额度用完自动跳过那一家，下线的模型自动找同档替代。
- **每一步都复核**：每个阶段过闸门才继续；复核结论 MAT 签字也推翻不了。交付附来源，查不到就直说，不凭记忆答。
- **花销可控**：开跑前预估时间和花销并和"一个强模型"对比；太贵就自动缩成一个模型；有单次上限。
- **记忆归你**：做成的活按类型记下做法，存在你的电脑上，与任何一家模型无关。

## 4. 和常规 AI 产品的不同

| | MAT | 常规 AI 产品 |
|---|---|---|
| 对话 | 做过的活按类型留下做法，下次同类活直接用上 | 每个对话从零开始 |
| 记忆 | 存在你的电脑上，换模型什么都不丢 | 厂商功能，带不走 |
| 配置 | 说出需要什么，MAT 选座位、配模型、排流程 | 模板、提示词、流程自己维护 |
| 沟通对象 | 只有 MAT | 更多 Agent、更多标签页 |
| 成本 | 强模型只规划与复核，活越大越省 | 每一步都在高价模型上 |
| 并行 | 一件活里多个座位同时做；多个对话同时跑 | 一次一条线性对话 |
| 质检 | 每阶段复核门，交付附来源 | 质检是你的事 |
| 打扰 | 只在需要你拍板时提问 | 守在窗口前等 |
| 供应商 | 所有订阅一支团队，用完自动跳过 | 单一供应商，到额度就停 |

它**不是**聊天客户端，**不是**手绘工作流的编辑器，也**不是**消失一小时的全自动 Agent。它是一个会判断的对话。

## 5. 官网的结构

首屏只有标语、一句话和等候名单。往下滑，一段一镜到底的演示视频（36 秒，`media/`）从下面升起、长到屏幕宽度并自动播放；再往下，01 从下面盖上来，视频退后、变暗、暂停。以前首屏右侧随滚动播放的对话和团队（下面这段描述）仍在代码里，但已关掉（`HERO_FILM`）。原来的首屏是一个窗口：左边是和 MAT 的对话（回答 / 一个模型做 / 排团队），右边是 MAT 为这件活雇的团队——先排出阶段，再把座位一个个雇上（每个座位标着用的是哪家模型），然后团队按阶段开工，每段过闸门才进下一段。随滚动播放、可倒放。往下依次是：

| # | 段落 | 讲什么 |
|---|---|---|
| 01 | The problem | 四个问题，每张卡标着 Problem 和它让你付出的代价：你在当工作流、什么都带不走、一个模型包办、没人检查 |
| 02 | The answer | 一张随滚动重新连线的图：从"你夹在六个应用中间"到"一个对话、一份记忆、每步一道闸门" |
| 03 | MAT decides | 三种判断：回答、一个模型做、排团队（第三种高亮：MAT 最强的地方） |
| 04 | What it saves | 一个例子（能拆开并行的活）三种做法的时间与花销；并注明大多数活不会同时更省钱又更快 |
| 05 | Why it works | 三个好团队的习惯：强模型规划和复核、座位并行、闸门防返工 |
| 06 | How it works | 应用窗口随滚动播放：提需求、排团队、中途提问、交付 |
| 07 | Models and memory | 各家订阅绑在一起当一个团队用：同一件活的座位坐在各自用的订阅上；余量、本地记忆 |
| 08 | The ranking | 九个类别的模型排行 |
| 09 | Dock | 最小化后刘海下的一条线 |
| 10 | Coming soon | 接下来要做的三件事：多端调用本地服务、聊天软件里的 bot、自定义团队并分享 |
| 11 | Questions | 问答 |
| 12 | Waitlist | 等候名单 |

- 动效只有一套：默认会动（几段由滚动驱动），系统开了"减弱动态效果"时整页静止。原先导航右侧的 Quiet / Bold / Loud 切换已经去掉——让访客挑动效强度不是正式网站该有的东西；评审时可在网址后加 `?motion=quiet`、`?motion=bold` 或 `?motion=loud` 强制某一档。按 **G**（或网址加 `?grid`）显示 12 栏网格。
- 手机上（宽度 ≤ 699 px）是一栏安静的版本：什么都不钉住，不用滚好几屏去推动画；首屏的对话自己把三个例子播一遍（点对话上方的 01 / 02 / 03 可以重播那一段）；每段只留编号、标题、一句话和一块内容，04 的赛跑图、06 的应用窗口、10 的示意图、字母编号、交叉引用和数据表只在宽屏上出现；列表统一成一种样式；问答折叠；导航只有标志和一个"Join the waitlist"按钮（滑过首屏的输入框后出现），底部不再有常驻条。
- 导航右上角的 "Join the waitlist" 一直在。
- 页脚的 Changelog / About / Privacy / Terms / Contact 打开同一张覆盖页（网址带 `#changelog` 等，可直接分享；Esc 或 Close 关闭）。Privacy 和 Terms 是测试期的简要版，Contact 指向本仓库的 GitHub Issues。
- 等候名单在 askmat.app 上是真的：填邮箱 → 收到确认邮件 → 点链接后看到自己的排位、专属邀请链接（每邀请一个人确认，前进 5 位）和一个问题"你最想先让 MAT 做什么"。在其它地址（GitHub Pages、预览）上它仍是预览，不发送任何东西。
- 页面里的数字（时间、花销）是按各家公开价格算的示意，不是实测。

## 6. 技术说明

- 单个 HTML 文件，CSS 和 JS 都内联；唯一的外部依赖是 jsDelivr 上的 [Lenis](https://github.com/darkroomengineering/lenis)（平滑滚动，加载失败时页面照常工作）。
- 各家标志：`<body>` 开头内联一份 SVG sprite（21 个 `<symbol id="lg-…">`），同一套 24 网格、同一视觉体积，颜色跟随文字（`fill: currentColor`）。02 的六个模型框、07 的各家订阅列和悬停卡片、08 排行的每一行都用它：订阅和产品用产品标志（Claude、ChatGPT → OpenAI、Gemini…），排行用厂商标志。来源 LobeHub Icons（MIT）、Simple Icons（CC0）、svglogos.dev（CC0）、Lucide（ISC），归一化方法见 MAT 项目文档 `MAT-logos.md`。标志的商标权归各家：Microsoft（Copilot）要书面许可，Google、Meta、MiniMax 要先批准——正式公开前取得许可，或删掉对应的 `<symbol>` 和 `MODELS` / `MKLG` 里的 id，那一处只显示文字。
- 没有构建步骤、没有 cookie。统计用 Cloudflare Web Analytics（不用 cookie、不识别个人），token 填在 `index.html` 的 `MAT_SITE.beacon`。`localStorage` 只记这台浏览器上的便利信息：等候名单状态（`mat-wl`）、自己的查看链接（`mat-wl-t`）、来源渠道和邀请码（`mat-src` / `mat-ref`）（以前存过的动效强度，打开页面时会被清掉）。
- 等候名单：`worker/index.js`（接口）+ `worker/schema.sql`（D1 表）+ `wrangler.jsonc`（配置）。双重确认、排队发信（不超过 Resend 免费版每天 100 封）、按渠道统计、CSV 导出、一键退出并删除数据。`.assetsignore` 保证只有页面和图片作为静态文件发出去，代码、README、密钥都不会。
- 分享卡片和图标：`og.png`（2400×1260）、`favicon.svg` / `favicon-32.png` / `apple-touch-icon.png`；社交素材在 `social/`（GitHub 社交预览、X 头图和头像、build log 帖子模板）。设计源文件在 Figma：MAT 文件 › Brand & Website › "Social · share card, GitHub, X (2026-10-09)"。
- 本地预览：直接用浏览器打开 `index.html`。
- 发布：`sh publish.sh`。提交并推送到 GitHub；Cloudflare 连上仓库后自动部署 askmat.app。`.github/workflows/pages.yml` 仍把 `index.html` 发布到旧的 GitHub Pages 地址（那里的表单只是预览）。

## 7. 现状

MAT 是可以日常运行的原型，还没有发布，也没开始公测。应用源码暂不公开。

## 8. 未来方向

**近期**
- 根据你已有的订阅推荐"加哪一家能顶上哪些座位"。
- 用 ChatGPT / Claude 套餐账号直接登录；同一家可以加两个账号（工作 / 个人）。
- 排行榜每周自动重抓、重算，座位换人前先给你看。

**中期**
- **你的电脑就是服务器。** 手机、平板、另一台电脑，任何浏览器都能交活、回答它的问题、取结果。
- **在聊天软件里用 MAT。** Slack、Telegram、WhatsApp、飞书：一条消息交出一件活，提问和结果回到同一个线程。
- **记忆更聪明。** 用评价、返工记录和每次判断持续校准，路由越用越贴合你。

**长期**
- **团队社区。** 分享你搭好的团队（座位、模型、复核规则），也可以从别人分享的团队开始。
- **开放格式。** 做法和记忆可以完整导出带走。
- **按步骤做隐私路由。** 敏感步骤只交给本地模型。

## 9. 设计原则

- **只和 MAT 说话。** 工作流再复杂，也不会变成沟通的复杂度。
- **颜色只表达一件事。** 蓝 = 进行中，琥珀 = 需要你，绿 = 通过 / 做完，红 = 出错。
- **诚实的数字。** 每件活都和"一个强模型"对比；更贵就直说，小活就用一个模型。
- **不拉走你。** 需要你时，问题出现在那个对话的输入框位置，不切走你正在看的对话。
- **瑞士风格的版面。** 12 栏网格，标题很大、正文很小，左对齐，平面色，插图只用来解释。

---

© 2026 Robert Lee. 保留所有权利。
