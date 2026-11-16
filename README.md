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

**语法**（`#/grammar`）：6 个阶段 30 节课——词类基础、基本句子（be 动词、There be、do/does、特殊疑问句、祈使句）、基本时态（一般现在 / 现在进行 / 一般过去 / 一般将来 / 过去进行 / 现在完成 / 时态对比）、五大基本句型、动词进阶（情态动词、不定式与动名词、被动语态、比较级）、复合句（并列句、状语从句、宾语从句、定语从句）。每课包含规则讲解、句型公式、时间标志词、带预录发音的例句（重点高亮，句型课用颜色标出主语 / 谓语 / 宾语等成分）、易错提醒，以及选择题 + 连词成句的小测验。课程内容在 `js/grammar.js`。

**词典**（`#/dict`）：收录约 4 万个常用词（2.5 万词条 + 1.5 万常见变形，如 went → go）。每个词显示美式音标、中文释义、考试标签、词形变化、例句，可以朗读；还会根据词典读音把单词拆成字母组合（night → n · igh · t），点"拼读"逐个播放音素并同步高亮音标，并标出魔法 e、不发音字母、音节划分和讲这个字母组合的课程。读法不符合常规规则的词（如 colonel）会特别提示。顶栏搜索输入英文单词时也可以直接跳到词典。

## 目录结构

```
index.html
css/style.css     样式（明亮扁平风格：白底、亮绿主色、2px 描边、立体按钮；含深色模式）
fonts/            Nunito 字体（SIL Open Font License，见 fonts/OFL.txt），本地加载、离线可用
js/data.js        课程数据（音素表 SOUNDS + 阶段与课程 STAGES）—— 改内容只改这里
js/grammar.js     语法课程数据（GRAMMAR）
js/ipa.js         单词音标（由 CMU 发音词典自动生成）
js/phonics.js     拼读引擎：切分字母组合、推断每个组合的读音、高亮本课重点
js/g2p.js         词典拼读：按词典读音把任意单词对齐成字母组合，并划分音节
js/dict/          词典数据（自动生成）：index.js 为按词频排序的词表，其余按单词前两个字母分片、查词时才加载
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
node scripts/build-audio.mjs        # 单词/音节/例句（含语法课例句和测验答案句）；加 --force 全部重建
```

新增单词后也要重新生成音标（读 CMU 发音词典，美式；多音词或词典缺词在脚本顶部的 `PICK` / `MANUAL` 表里指定）：

```bash
node scripts/build-ipa.mjs
```

新增的单词即使没有生成音频，网站也会用浏览器语音合成朗读。

## 重新生成词典数据

数据来源：[ECDICT](https://github.com/skywind3000/ECDICT)（释义，MIT）、[Tatoeba](https://tatoeba.org)（中英例句，CC BY 2.0 FR）、[CMUdict](https://github.com/cmusphinx/cmudict)（音标，BSD）。首次运行会自动下载到 `scripts/cache/`（约 100MB，不提交到仓库）。

```bash
uv run --with opencc-python-reimplemented python3 scripts/build-dict-data.py   # 选词、清洗释义、挑例句（繁体例句转简体）
node scripts/build-dict.mjs                                                    # 生成 js/dict/*.js
```

收录范围：COCA/BNC 词频前 2.5 万、带考试标签（中考 / 高考 / 四六级 / 考研 / 托福 / 雅思 / GRE）、牛津 3000、柯林斯星级词，以及全部课程单词。例句优先用课程例句，其次是 Tatoeba 的中英对照句，都没有时用 Tatoeba 的英文句子。拼读拆解的对照表在 `js/g2p.js` 顶部的 `TABLE`。

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
