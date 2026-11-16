# 拼读之路 · Phonics Path

英语自然拼读学习网站：10 个阶段、63 节课，从字母音一直讲到多音节词。纯静态页面，不依赖任何框架，打开就能用。

## 运行

```bash
cd phonics-learning
python3 -m http.server 8765
# 浏览器打开 http://localhost:8765
```

需要通过本地服务器访问（直接双击 index.html 也能打开，但部分浏览器会限制音频加载）。部署时把整个目录上传到任意静态托管即可（GitHub Pages、Vercel、Nginx 等）。

## 学习路径

| 阶段 | 级别 | 内容 | 建议时长 |
|---|---|---|---|
| 1 字母发音 | 入门 | 26 个字母的字母音（分 5 组） | 3 周 |
| 2 短元音与 CVC | 入门 | 五个短元音、词族、高频词 | 3 周 |
| 3 辅音连缀 | 基础 | L/R/S 连缀、tw、尾部连缀、三字母连缀 | 2 周 |
| 4 辅音二合字母 | 基础 | sh/shr、ch/tch、th/thr、wh、ph、ck、ng、nk、FLOSS 双写规则、-dge/-ge | 3 周 |
| 5 魔法 e | 进阶 | a_e i_e o_e u_e e_e、开音节、kind old 例外（-ild -ind -old -ost） | 3 周 |
| 6 元音组合 | 进阶 | ai/ay ee/ea oa/ow/ou ie/igh/y oo ue/ew y/ey、eigh/ei/ey/ea 读 /eɪ/、ie/ei 读 /iː/、ui/ou 读 /uː/ | 4 周 |
| 7 R 控制元音 | 进阶 | ar or er/ir/ur air/are ear/eer、war/wor、ear 读 /ɝ/、ire ure our oar oor | 3 周 |
| 8 双元音与特殊元音 | 高级 | oi/oy ou/ow au/aw/al、o/ou 读 /ʌ/、u 读 /ʊ/、wa 读 /wɑ/、ough/augh | 3 周 |
| 9 进阶规则 | 高级 | 软音 c/g、不发音字母（kn wr mb gn h t w b l u）、-le、-ed/-s、-tion/-sion/-ture、ch 读 /k/ /ʃ/、gh 读 /f/、/ʒ/ 的拼写 | 4 周 |
| 10 音节与长单词 | 精通 | 六种音节、音节划分、前后缀、重音与弱读、加后缀的拼写规则、常见词尾 | 4 周 |

共 63 节课、1452 个示例单词，按每天 15–20 分钟约 32 周学完。

每节课包含：发音卡片（音素录音 + 口型要领）、规则讲解、短长音对比、示例单词（逐音拼读动画）、例句（可点词朗读）、6 题小测验。顶栏可搜索单词、中文意思、字母组合、音标和课程（快捷键 `/` 或 `Ctrl/⌘+K`），点击结果直接跳到对应课程并高亮该单词或例句。另有音标总表、练习场（听音选词 / 听写 / 闪卡 / 听音辨字母 / 错词本）和学习指南。学习进度保存在浏览器 localStorage 中。

## 目录结构

```
index.html
css/style.css
js/data.js        课程数据（音素表 SOUNDS + 阶段与课程 STAGES）—— 改内容只改这里
js/ipa.js         单词音标（由 CMU 发音词典自动生成）
js/phonics.js     拼读引擎：切分字母组合、推断每个组合的读音、高亮本课重点
js/audio.js       播放：优先用预生成音频，缺失时退回浏览器语音合成
js/app.js         路由与页面
audio/p/          音素音频（45 个，从 Samantha 朗读的单词中截取并经识别模型校验；report.json 为校验记录）
audio/t/          单词、音节、例句音频（约 1000 个）
audio/manifest.js 文本 → 音频文件映射（自动生成）
scripts/          音频、音标生成与校验脚本
```

## 修改课程 / 重新生成音频

单词格式 `"word|中文|emoji|覆盖"`：

- `-` 手动切分字母组合（`or-a-n-ge`），`·` 切分音节（`'rab·bit`，`'` 表示重读音节）
- 覆盖：`ea:e_s` 表示本词中 ea 读短音 e（音素 id 见 `SOUNDS`）

改完 `js/data.js` 后重新生成音频（需要 macOS 的 `say` 和 `ffmpeg`，只生成缺失的文件）：

```bash
node scripts/build-audio.mjs        # 单词/音节/例句；加 --force 全部重建
```

新增单词后也要重新生成音标（读 CMU 发音词典，美式；多音词或词典缺词在脚本顶部的 `PICK` / `MANUAL` 表里指定）：

```bash
node scripts/build-ipa.mjs
```

新增的单词即使没有生成音频，网站也会用浏览器语音合成朗读。

## 音频来源与校验

全部声音来自同一个美式女声（macOS Samantha），口音一致。

- 单词、音节、例句：用 `say` 直接合成（`scripts/build-audio.mjs`）。单个字母会被合成成 "capital X"，所以字母名一律用小写合成。
- 音素：无法直接合成，由 `scripts/extract_phonemes.py` 从含该音的单词里截取（如 /æ/ 取自 cat，/ʃ/ 取自 fish），并用英语音素识别模型校验——元音须识别为目标元音；辅音与元音 /ɑ/ 拼读须识别为"该辅音 + ɑ"；每项在 6 种识别条件下至少通过 5 次。校验结果在 `audio/p/report.json`。
- 校验脚本需要单独的 Python 环境：

```bash
uv venv -p 3.12 .venv-asr && uv pip install -p .venv-asr/bin/python torch transformers numpy
.venv-asr/bin/python scripts/extract_phonemes.py      # 重新截取（可指定音素 id）
.venv-asr/bin/python scripts/verify_phonemes.py       # 复查全部音素
.venv-asr/bin/python scripts/verify_words.py          # 检查单词音频与词典音标是否一致
```
