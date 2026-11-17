#!/usr/bin/env bash
# 发音全面复查：依次运行所有检查，任何一项有问题都会在最后列出。
# 用法：scripts/audit_all.sh [识别模型虚拟环境的 python]（默认 .venv-asr/bin/python）
set -uo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
PY="${1:-.venv-asr/bin/python}"
LOG="${AUDIT_LOG:-/tmp/phonics-audit}"
mkdir -p "$LOG"
fail=()

step() {
  local name="$1"; shift
  printf '\n==== %s ====\n' "$name"
  if "$@" 2>&1 | grep -v 'Warn\|NOTE\|Loading weights\|Advice\|snd.save' | tee "$LOG/$name.txt"; then :; fi
}

step 1-音素 "$PY" scripts/verify_phonemes.py
grep -q '45/45 通过' "$LOG/1-音素.txt" || fail+=("音素录音")

step 2-拼读与音标 node scripts/audit_words.mjs
grep -q '问题 0 处' "$LOG/2-拼读与音标.txt" || fail+=("拼读与音标")

step 2b-词典拼读 node scripts/audit_dict.mjs
grep -q '问题 0 处' "$LOG/2b-词典拼读.txt" || fail+=("词典拼读拆解")

step 3-读音选择 "$PY" scripts/verify_lexicon.py
grep -q '不一致 0' "$LOG/3-读音选择.txt" || fail+=("单词读音选择")

step 4-例句多音词 "$PY" scripts/verify_heteronyms.py
grep -q '读错 0；无法判断 0' "$LOG/4-例句多音词.txt" || fail+=("例句多音词")

step 5-字母名 "$PY" scripts/verify_letters.py
grep -q '不一致 0' "$LOG/5-字母名.txt" || fail+=("字母名")

step 6-整词逐音 "$PY" scripts/verify_words.py "$LOG/words.json"
grep -q '待复核 0 个' "$LOG/6-整词逐音.txt" || fail+=("整词录音")

printf '\n==== 结果 ====\n'
if [ ${#fail[@]} -eq 0 ]; then
  echo '全部通过'
else
  echo "未通过：${fail[*]}"
  exit 1
fi
