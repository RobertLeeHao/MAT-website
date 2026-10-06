#!/bin/sh
# 把官网发到 GitHub（公开仓库）并用 GitHub Pages 托管：
#   仓库 https://github.com/RobertLeeHao/MAT-website
#   官网 https://robertleehao.github.io/MAT-website/
#
# 用法： sh ~/code/MAT-website/publish.sh
# 第一次跑会建仓库并推上去、打开 Pages；以后再跑就是提交改动并推送（推送后官网自动更新）。
# 需要 GitHub CLI：没有就先  brew install gh  然后  gh auth login
cd "$(dirname "$0")" || exit 1

OWNER=RobertLeeHao
REPO=MAT-website
SITE="https://robertleehao.github.io/$REPO/"

command -v gh >/dev/null 2>&1 || { echo "❌ 没有 gh。先跑： brew install gh && gh auth login"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "❌ gh 还没登录。先跑： gh auth login"; exit 1; }

# 发布流程：推送到 main 后，GitHub Actions 只把 index.html 发布到 Pages。
# （写在这里而不是直接放进文件夹，是因为 Claude 没法往 .github/ 里写文件。）
mkdir -p .github/workflows
cat > .github/workflows/pages.yml <<'WORKFLOW'
name: Website

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Only the page goes out
        run: mkdir _site && cp index.html _site/
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site
      - id: deployment
        uses: actions/deploy-pages@v4
WORKFLOW

[ -d .git ] || git init -b main
git config user.name  >/dev/null || git config user.name  "Robert Lee"
git config user.email >/dev/null || git config user.email "$OWNER@users.noreply.github.com"
git add -A
git diff --cached --quiet || git commit -m "Update website $(date +%Y-%m-%d)"

if ! gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  gh repo create "$OWNER/$REPO" --public \
    --description "Website for MAT — one chat for every AI you already pay for." \
    --homepage "$SITE" --source . --remote origin --push || exit 1
  gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
    || gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1
  gh repo edit "$OWNER/$REPO" --add-topic website --add-topic llm --add-topic multi-agent >/dev/null 2>&1
  gh workflow run Website -R "$OWNER/$REPO" >/dev/null 2>&1
else
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
  git push -u origin main || exit 1
fi

echo ""
echo "✅ 仓库： https://github.com/$OWNER/$REPO"
echo "✅ 官网： $SITE   （第一次发布要等 1–2 分钟）"
