# Translating the MAT website

MAT is a free beta desktop app for Mac. You talk to MAT in one chat. A question gets an answer; a job gets one AI model, or, when the work splits, a "crew" of several models (each "seat" on the model that suits its step), with MAT planning and checking every stage (a "gate" between stages). It runs on the AI subscriptions the user already pays for (Claude, ChatGPT, Gemini…), locally on their own computer. The site is written like Apple's product pages: short, plain, confident, never salesy. Titles are very large, so keep them short.

## Input
`i18n/en.json` has five sections:
- `units` (list): page text. Inline markup is replaced by numbered tokens: `<3>text</3>` wraps text in tag 3, `<5/>` is a line break, `<0></0>` is an empty element (an icon). 
- `attrs` (list): accessibility labels and similar.
- `meta` (list): page title, descriptions for search and sharing.
- `dynamic` (list): short labels and sentences the page writes while it animates (status lines, chat messages inside a demo window).
- `templates` (object key → example): strings with numbers. `{0}`, `{1}` … are numbers filled in at runtime. Translate the key.

## Output
Write `i18n/<CODE>.json`:
```json
{"units":{"<English key>":"<translation>", …},"attrs":{…},"meta":{…},"dynamic":{…},"templates":{"<English key>":"<translation>", …}}
```
Every key of every section, exactly as in en.json (copy keys byte for byte). Then run `python3 i18n/check.py i18n/<CODE>.json` and fix until it prints `missing 0` and `bad 0`. Write the file with a Python script (json.dump with ensure_ascii=False) so quoting is safe; build it in parts if it is long.

## Rules
1. Keep every token (`<n>`, `</n>`, `<n/>`) and every placeholder (`{n}`) — same set, each exactly once. You may move them to where the grammar needs them; keep the text that a token wraps inside it (a link's words stay inside the link's token). Empty tokens like `<0></0>` or `<1><2></2></1>` (icons) stay empty and in place.
2. Do not translate: MAT, product and model names (Claude, ChatGPT, GPT-6.1 Sol, Gemini, DeepSeek, Qwen, Copilot, Perplexity, Mistral, Opus, Haiku, Sonnet…), company names, people's names (Robert, Bo, Ivy, Tess, Juno, Otto, Lin, Nia, Kai, Wren), app names (Otter, Granola, Fireflies, Notion AI), file names, `#AI note-taking apps`-style chat names may be translated after the `#`, macOS, GitHub, Discussions (as a GitHub feature name you may translate it), Arena, Artificial Analysis, keyboard symbols (⌘ ⇧ ■ ↑ ↓ ↗ ×), URLs, version numbers, prices ($0.60 stays in dollars), times like 14:14.
3. Keep the separators `·` and `—` and the numbering like `01`, `Q 05`, `A`–`D`.
4. Menu paths in the Mac UI (System Settings › Privacy & Security › Open Anyway, Settings › Providers, Documents › MAT): use the official localized macOS names for System Settings / Privacy & Security / Open Anyway / Applications / Documents in your language; for MAT's own settings (Settings › Providers, Settings › Memory) keep the English names, since the app is in English.
5. Same term for the same thing everywhere. Glossary:
   - crew → zh-Hans 团队 · zh-Hant 團隊 · ja チーム · ko 팀 · es equipo · fr équipe · de Team
   - seat (a place in the crew, one model) → zh-Hans 座位 · zh-Hant 座位 · ja 席 · ko 자리 · es puesto · fr poste · de Platz
   - gate / check between stages → zh-Hans 闸门/检查 · zh-Hant 閘門/檢查 · ja チェック · ko 검문/검사 (choose one and keep it) · es control · fr contrôle · de Prüfung
   - subscription → 订阅 / 訂閱 / サブスクリプション / 구독 / suscripción / abonnement / Abo
   - beta → 测试版 / 測試版 / ベータ版 / 베타 / beta / bêta / Beta
   - waitlist is gone; "Get the beta" = the main call to action.
   - "runs locally" → on the user's own computer.
6. Tone: second person, short sentences, no exclamation marks. Chinese: natural mainland (zh-Hans) or Taiwan (zh-Hant) usage, not a word-for-word conversion between them; use full-width punctuation in Chinese and Japanese. Japanese: です/ます for body, plain noun phrases for titles and labels. Korean: 합니다/해요 consistently (prefer -합니다 for body, noun phrases for labels). German/French/Spanish: use the form Apple uses on its own pages — German "du", French "vous", Spanish "tú".
7. Very short labels (status words like "Running", "Waiting", "Checked", axis labels like "Quality", "Value", "Speed") must stay short; they sit in tight boxes.
8. Headings with a `<n/>` break: keep the break where a natural break falls.
