#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

if ! command -v gh >/dev/null 2>&1; then
  printf '请先安装 GitHub CLI（gh），然后运行 gh auth login。\n' >&2
  exit 1
fi

remote_url=$(git remote get-url --push origin)
repository=$(gh repo view "$remote_url" --json nameWithOwner --jq .nameWithOwner)
site_url=$(gh api "repos/$repository/pages" --jq \
  'select(.build_type == "legacy" and .source.branch == "main" and .source.path == "/") | .html_url')

if [[ -z "$site_url" ]]; then
  printf '请在 %s 的 Settings → Pages 中选择从 main 分支的根目录发布。\n' "$repository" >&2
  exit 1
fi

commit=$(git rev-parse --verify 'refs/heads/main^{commit}')
printf '发布 %s 的 main 提交 %s…\n' "$repository" "${commit:0:7}"
git push origin "$commit:refs/heads/main"

printf '等待 GitHub Pages 创建部署任务…\n'
for (( attempt = 0; attempt < 30; attempt++ )); do
  run_id=$(gh run list --repo "$repository" --workflow pages-build-deployment \
    --branch main --commit "$commit" --limit 1 --json databaseId --jq '.[0].databaseId // empty')
  if [[ -n "$run_id" ]]; then
    gh run watch "$run_id" --repo "$repository" --exit-status
    printf '部署成功：%s\n' "$site_url"
    exit 0
  fi
  sleep 4
done

printf '提交已推送，暂未找到部署任务。请检查 https://github.com/%s/actions\n' "$repository" >&2
exit 1
