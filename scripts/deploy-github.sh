#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

if ! command -v gh >/dev/null 2>&1; then
  printf '请先安装 GitHub CLI（gh），然后运行 gh auth login。\n' >&2
  exit 1
fi

remote_url=$(git remote get-url --push origin)
repository=$(gh repo view "$remote_url" --json nameWithOwner --jq .nameWithOwner)
# React requires the Actions build instead of publishing unbuilt source files.
gh api --method PUT "repos/$repository/pages" -f build_type=workflow >/dev/null
site_url=$(gh api "repos/$repository/pages" --jq '.html_url')

commit=$(git rev-parse --verify 'refs/heads/main^{commit}')
printf '发布 %s 的 main 提交 %s…\n' "$repository" "${commit:0:7}"
git push origin "$commit:refs/heads/main"
# Distinguish this request from a previous deployment of the same commit.
prior_run_ids=$(gh run list --repo "$repository" --workflow deploy.yml \
  --event workflow_dispatch --branch main --commit "$commit" --limit 10 \
  --json databaseId --jq '.[].databaseId')
prior_run_ids=${prior_run_ids//$'\n'/ }
# Also works when main was already pushed and the previous build failed.
gh workflow run deploy.yml --repo "$repository" --ref main

printf '等待 GitHub Pages 创建部署任务…\n'
for (( attempt = 0; attempt < 30; attempt++ )); do
  run_id=$(gh run list --repo "$repository" --workflow deploy.yml \
    --event workflow_dispatch --branch main --commit "$commit" --limit 1 --json databaseId --jq '.[0].databaseId // empty')
  if [[ -n "$run_id" && " $prior_run_ids " != *" $run_id "* ]]; then
    gh run watch "$run_id" --repo "$repository" --exit-status
    printf '部署成功：%s\n' "$site_url"
    exit 0
  fi
  sleep 4
done

printf '提交已推送，暂未找到部署任务。请检查 https://github.com/%s/actions\n' "$repository" >&2
exit 1
