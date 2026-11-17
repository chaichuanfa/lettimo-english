# Lettimo 英语

每天一点，英语更进一步。

Lettimo 英语是从小学英语基础到四六级词汇的学习网站：63 节自然拼读课、77 节语法课、4 万词的拼读词典，以及中考、高考、四级、六级四本词书的背单词功能。使用 React + TypeScript + Vite 实现全部页面，构建为静态网站，继续使用浏览器本地存储保存学习记录。

导航：首页（`/`，各门课的进度和继续学习入口）、拼读（`/phonics`）、语法（`/grammar`）、单词（`/words`，背单词：选词书、每日学习、单词列表）、复习（`/review`，三门课的复习入口：单词到期复习、语法错题本、拼读练习玩法和错词本；旧地址 `/practice` 仍可用）。词典、音标总表、学习指南以及朗读速度、主题切换在右上角的“更多”里。手机上主导航显示为底部标签栏。

## 运行

```bash
cd phonics-learning
npm ci
npm run dev
# 浏览器打开 http://127.0.0.1:5173/
```

需要 Node.js 22.12+（推荐 24）。使用 `npm run build` 生成 `dist/`，`npm run preview` 本地预览生产构建。部署时只发布 `dist/`；默认路径为 `/`，其他托管路径可通过 Vite 的 `--base` 参数调整。不能直接发布源码目录或双击 `index.html`。

运行 `npm run typecheck` 可单独执行严格类型检查。`npm run check` 会执行 Node 测试、类型检查、生产构建、发布资源检查和浏览器验收。字体输入检查需要 Python 3；首次运行浏览器测试前执行 `npx playwright install chromium`。

## 首页每日一句

搜索框下方显示金山词霸的英文句子、中文意思、日期和来源。点击播放按钮朗读，再点停止；优先播放来源音频，加载失败时使用浏览器英语朗读，并沿用站内朗读速度。没有自动播放或配图。

页面只读取站内的 `data/daily-quote.json`，不直接跨域请求词典 API。浏览器按北京时间缓存当天内容，获取失败时保留最近一次成功内容；首次访问且没有可用数据时显示空状态。

运行 `node --experimental-strip-types scripts/update-daily-quote.ts` 可手动更新快照。`.github/workflows/daily-quote.yml` 在北京时间每天 08:17 自动获取，12:17 补试（GitHub 定时任务可能延迟），也可从 Actions 手动运行；当日已有内容时不重复请求。获取失败或内容不完整时不覆盖旧文件。更新后仅提交这个 JSON，并显式触发 `deploy.yml` 的 React 构建和 Pages 发布；即便快照未改变也能重试之前失败的发布。无需 API Key。

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

每节课包含：发音卡片（音素录音 + 口型要领）、规则讲解、短长音对比、示例单词（逐音拼读动画）、10 个中英对照例句（共 630 句，可整句或点词朗读）、15 题小测验（答对 10 题完成本课）。顶栏可搜索单词、中文意思、字母组合、音标和课程（快捷键 `/` 或 `Ctrl/⌘+K`），点击结果直接跳到对应课程并高亮该单词或例句。另有音标总表、练习场（听音选词 / 听写 / 闪卡 / 听音辨字母 / 错词本）和学习指南。学习进度保存在浏览器 localStorage 中。

**语法**（`/grammar`）：9 个阶段 77 节课——名词与代词、数量描述与连接（数词、数量表达、形容词与副词、介词、时间与日期、连词、构词法）、基本句子（be 动词、There be、do/does、have / has、can、一般疑问句、特殊疑问句、祈使句、感叹句等）、基本时态（六种基本时态，加过去完成、过去将来、将来进行、现在完成进行）、句子结构（句子成分、基本句型、主谓一致、反意疑问句、短语结构）、动词进阶（情态动词及其推测和完成式用法、被动语态、比较级）、非谓语动词（不定式、-ing 形式、-ed 形式的各种用法，独立主格）、复合句（并列句、状语从句、名词性从句、定语从句、间接引语、长难句分析）、特殊句式（省略、倒装、强调、虚拟语气）。每课包含规则讲解、句型公式、时间标志词、带预录发音的例句（重点高亮，句型课用颜色标出主语 / 谓语 / 宾语等成分）、易错提醒，以及 15 题的小测验（选择题 + 连词成句）。每课入口带"小学""初中"或"高中"学段标签（数据里的 `grade` 字段），目录页可以按学段筛选。其中 14 课（id 为 `gp-N`）是对照《义务教育英语课程标准（2022 年版）》一、二级语法要求和附录 4 语法项目表补充的，9 课（id 为 `gj-N`）是初中阶段的补充，24 课（id 为 `gs-N`）是高中内容，依据《普通高中英语课程标准（2017 年版 2025 年修订）》表 6 和附录 3。课程内容在 `js/grammar.js`。

**词典**（`/dict`）：收录约 4 万个常用词（2.5 万词条 + 1.5 万常见变形，如 went → go）。每个词显示美式音标、中文释义、考试标签、词形变化、例句，可以朗读；还会根据词典读音把单词拆成字母组合（night → n · igh · t），点"拼读"逐个播放音素并同步高亮音标，并标出魔法 e、不发音字母、音节划分和讲这个字母组合的课程。读法不符合常规规则的词（如 colonel）会特别提示。顶栏搜索输入英文单词时也可以直接跳到词典。

## 目录结构

```
index.html        Vite 入口（静态内容脚本由 Vite 插件按顺序注入）
src/main.tsx      React 挂载入口
src/App.tsx       布局、History 路由、主题/速度和复习汇总
src/pages/        首页、拼读、语法、单词、词典、指南的 React 页面
src/components/   可复用朗读/拼读组件、搜索弹窗、每日一句
src/state.ts      原有 phonics-path.* 记录的兼容存储和订阅
src/vocab-store.ts 背单词持久化和跨标签页更新
src/services/     按需词典加载、搜索索引
vite.config.ts   构建配置与静态资源发布白名单
css/style.css     样式（明亮扁平风格：白底、亮绿主色、2px 描边、立体按钮；含深色模式）
fonts/            Nunito 字体（SIL Open Font License，见 fonts/OFL.txt），本地加载、离线可用；
                  中文圆体 ep-rounded-*.woff2（400–900 字重，覆盖正文与标题） 是思源柔黑的子集（OFL，见 fonts/OFL-ResourceHanRounded.txt），
                  由 scripts/build-cn-font.py 按网站用到的汉字生成，同时生成 css/fonts-cn.css；新增中文内容后重新运行
js/data.js        课程数据（音素表 SOUNDS + 阶段与课程 STAGES）—— 改内容只改这里
js/grammar.js     语法课程数据（GRAMMAR）
js/ipa.js         单词音标（由 CMU 发音词典自动生成）
js/phonics.js     拼读引擎：切分字母组合、推断每个组合的读音、高亮本课重点
js/g2p.js         词典拼读：按词典读音把任意单词对齐成字母组合，并划分音节
js/dict/          词典数据（自动生成）：index.js 为按词频排序的词表，其余按单词前两个字母分片、查词时才加载
js/audio.js       播放：优先用预生成音频，缺失时退回浏览器语音合成
js/vocab-core.js  背单词核心逻辑：排期、每日队列、出题选项、进度合并。纯逻辑，不碰 DOM 和存储，可在 Node 里直接运行
js/vocab/core.js  词书数据（自动生成）：单词、音标、短释义、所属词书，按词频排序；进入单词页时才加载
css/words.css     单词页的样式
tests/            核心逻辑、兼容性与工作流测试；e2e/ 包含全页面浏览器验收
audio/p/          音素音频（45 个，截自 Cambridge / 朗文 / 牛津的美式真人录音，见 authoritative-report.json）
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

## 语法错题本

语法测验（课内测验和复习页的重做）里答错的题记进错题本，存在 localStorage 的 `phonics-path.gwrong`，格式是 `课程 id|题干`——不记题号，所以往课里加题、调顺序不会对错题；题干改了的旧记录在打开复习页时自动清掉。之后在任何地方把这道题做对，就移出错题本。复习页一次重做 10 道，最早答错的先做。

## 背单词

- **词书**：中考、高考、四级、六级，按词典里 ECDICT 的考试标签划分（不是官方大纲词表），六级只收四级以外的词；词典页点"加入生词本"的词组成生词本。每本书按词频从高到低学习。
- **每天一次学习**：先复习到期的词，再学新词。新词 5 个一组——摸底（不问认不认识，直接出选义题：连对两次算认识并跳过，答错的进入学习）、看单词卡片、当场巩固（看词选义和听音选词各过一遍，答错的隔几题重考）。
- **复习**：间隔 1、2、4、7、15、30、60 天，题型依次是看词选义、听音选义、听音拼写（可在设置里改成回忆后自评）。答对升一级，答错降两级并当次重考；通过 60 天那一关算已掌握。待复习超过每日上限（100）时新词减半，超过两倍时停学新词。
- **从复习页进入**：`/words/study?only=review` 只复习到期的词，不学新词。
- **进度**：按单词记录（不按词书），保存在当前浏览器的 `phonics-path.vocab` 里。开始背单词后，课程测验答错的词也会进入复习。
- **分层**：规则全部在 `js/vocab-core.js`（纯逻辑），`src/pages/Words.tsx` 和 `src/vocab-store.ts` 分别负责界面和存储。以后做 Android / iOS 时核心逻辑和词书数据可以直接复用，`tests/` 里的用例就是规格。

```bash
node scripts/build-books.mjs        # 由 js/dict/ 重新生成词书数据 js/vocab/core.js（重新生成词典数据后要再跑一次）
npm test        # 核心逻辑测试
```

词书里的词大多没有预录音频，目前由浏览器语音合成朗读。

## 音频来源与校验

单词、例句是 macOS 的 Ava（高级）美式女声合成（声音名写在 `scripts/voice.json`，构建与复查脚本都读它；需在 系统设置 → 辅助功能 → 朗读内容 → 系统声音 → 管理声音 里下载）；音素是权威词典的美式真人录音（男声）。

- 音素（`scripts/import_authoritative.py`，记录在 `audio/p/authoritative-report.json`）：原始录音放在 `audio-src/authoritative/`（词典版权录音，已 gitignore，不入库；下载清单见该目录的 manifest.json）。
  - 40 个来自 Cambridge Dictionary 美式音标页（https://dictionary.cambridge.org/help/phonetics.html）的单音素录音；Cambridge 没有的 ar or air ear u_l 用 Longman 的 are / air / ear / ewe、Oxford Learner's 的 oar（这几个词本身只由这些音组成）。
  - 只截取、不拉长、不合成。元音去掉前后静音。Cambridge 的辅音都读成"辅音 + ə"，截到进入 ə 之前：清音截到元音开始振动；浊音截到 F1 升过 430Hz 处；b d g j 去掉爆破前 80–90ms 的浊音杠（单独听像 m/n），只留爆破前 15ms；l w ð 主要靠过渡辨认，截止点依次后移 10–60ms，取第一个接上同一发音人 /ɑ/ 能稳定辨认（≥4/6）的。响度统一到 78dB（f θ h 74dB）。
  - 校验（`verify_phonemes.py` 的权威录音分支）：元音查开头无送气噪声、长度正常；辅音查结尾没有超出允许过渡的元音、接上同一发音人的 /ɑ/ 能辨认。θ ŋ 连未截取的原录音识别模型都识别不出（θ→s、ŋ→u），改用声学判断（θ 在原录音里比后面的 ə 弱 11dB 而 /s/ 比 ə 还响、频谱更散；ŋ 是持续的低 F1 浊音）。识别模型对这位发音人的孤立元音有偏差（æ ʌ ə 判成 ɑ，起音处幻听 h/b/m），所以元音不用识别结果判定。
- 以下是改用权威录音之前的音素做法（Samantha 截取；脚本保留，重跑会覆盖 audio/p，需再跑一次 import_authoritative.py）：

- 单词、例句：用 `say` 直接合成（`scripts/build-audio.mjs`，每次调用超时 60 秒、重试 3 次——say 偶尔会卡死）。单个字母会被合成成 "capital X"，所以字母名一律用小写合成。Ava 会读错的文字只换朗读写法、不改页面文字（`SPEAK_AS` / `SPEAK_WORD`）：our→hour、exit→eksit、camera→kam-er-uh、shin→shinn、单独的 use→yooz、elected→electid（单独和例句里都读成 oh-lected）、"use to"→"yoos to"、"I used my camera"→"I yoozd my camera"、"tears running"→"teers running" 等；改写拼写也读不对的 ox（单独读成 /oʊks/）从整句 "Ox and box." 截取前 0.303 秒（`CARRIER`，附 md5 校验）。实际合成用的文字记在 `audio/speak-as.json`。
- 旧做法·音素：无法直接合成，从 Samantha 朗读的单词里截取，分三类处理（结果分别在 `audio/p/report.json`、`refine-report.json`、`sustain-report.json`）：
  - 单元音（`scripts/sustain_phonemes.py`）：从浊音起点截（不带前一个辅音的送气），去掉滑向后一个辅音的过渡，优先 h_d / 元音开头的词；松元音 ɪ ɛ ʌ ʊ 保持自然长度（拉长了 ɛ 会被听成 æ、ʌ 听成 ɑ），æ ɑ 等放慢到约 0.32 秒。
  - 二合元音、r 化元音（同上脚本）：保留完整滑动，不用 h 开头的词（会残留 h 的气流）；放慢不超过约 1.3 倍（滑动变缓会被听成单元音）。
  - 可持续辅音 f v s z θ ð ʃ ʒ m n ŋ l r：慢语速朗读，用逐帧声学特征（浊音、F1、频带能量）切出辅音本体 + 最短的元音过渡，本体不足 0.25 秒的保持音高拉长（浊音 PSOLA，清擦音用按原声频谱整形的噪声）；l 取自 look 的词首 l（其他词的 l 拉长后识别模型听成 m/n）。θ ð 拉长后被听成 /s/（这两个音主要靠与元音之间的过渡辨认），保留自然长度。
  - 塞音 p b t k d g 和塞擦音 ch 本来就是一下爆破、没法延长，不带 "uh"（念成 buh、duh 拼读时会多出一个元音）：清音 p t k ch 从爆破截到后面元音开始振动为止（整段送气 / 摩擦，55–90ms，extract 的 asp 模式）；浊音 b d g 截爆破 + 元音最开头 2–4 个声门周期（约 40ms，vstop 模式）。
  - 塞音、塞擦音、半元音、h（`scripts/extract_phonemes.py`、`refine_phonemes.py`）：无法单独持续，带极短的弱元音或过渡。
- 校验（`scripts/audit_all.sh` 一次跑完下面全部）：
  - `verify_phonemes.py`：元音做严格识别（识别结果只能是目标元音，多出 h、m 等辅音说明带着送气或过渡）且开头无清音；ɛ 例外——识别模型对孤立的 ɛ 一律判成 æ，改用共振峰判定；辅音做辨认测试 + 声学标准；塞音等做拼读测试。拼读 / 辨认测试接的参考元音是固定文件 `scripts/ref/ref_vowel_a.mp3`（不能用会被重做的 `audio/p/o_s.mp3`，否则基准会跟着变）。
  - `audit_words.mjs`：每个课程单词拼读时播放的音 = 显示的音标（多音节词：每个音标都分到了音节且有音素录音）。
  - `audit_dict.mjs`：词典 4 万词的拼读拆解，每一块播放的音素 = 显示的音标，且每个音标都有音素录音（词典的整词发音用浏览器语音合成，不在核查范围）。
  - `verify_lexicon.py`：有多种读法的词（多音词、强弱读、带不带某个音）录音选的读法与音标一致。
  - `verify_heteronyms.py`：例句里的多音词按语境读对。
  - `verify_letters.py`：字母名。
  - `verify_words.py`：全部单词录音（课程单词，以及例句点读、最小对立词、关键词等，共 2000 多个）逐音做发音质量检查（GOP）；被标记的词必须用对照合成证实是按常规读法读的——与规则拼写合成完全相同（`scripts/ref/word-respellings.json`），或与"误读版"拼写合成不同（`scripts/ref/word-misreadings.json`，shin 就是这样查出与 sheen 完全相同的）；证明不了的列为待复核。
  - 对照合成：合成声音对同一串音素每次合成的音频完全相同（Ava、Samantha 都是），所以录音与哪种"只能那样读"的拼写合成出相同音频，就确定读成了哪种——这是确定的结论，不受识别模型偏差影响。单词：与"正确读法"拼写相同 → 读对；把识别模型怀疑的音换掉拼出"误读写法"，相同 → 读错、全都不同 → 没有读成那样（r 前元音、元音间 t/d 闪音、弱读 ə 这几类本来就不区分，不算误读）。
  - 例句：Ava 改一个词整句韵律都会微调，对照合成常常不会逐字节相同，这时要求强制对齐与声学距离（`scripts/acoustic_compare.py`，MFCC 动态时间规整）结论一致；冲突的由人工逐项测量（共振峰、擦音时长与浊音比例）裁决，证据与录音 md5 一起记在 `scripts/ref/heteronym-reviewed.json`，录音一变自动失效。
- 多音节词按音节拼读时用音素录音逐个读出，不单独合成音节（TTS 会把 "tle" 读成字母名、把 table 的 "ta" 读成 /tɑ/）。
- 校验脚本需要单独的 Python 环境：

```bash
uv venv -p 3.12 .venv-asr && uv pip install -p .venv-asr/bin/python torch transformers numpy praat-parselmouth
.venv-asr/bin/python scripts/extract_phonemes.py      # 重新截取（可指定音素 id）
.venv-asr/bin/python scripts/refine_phonemes.py       # 重新截取 θ ð z ʒ v l r ŋ h（声学切分）
.venv-asr/bin/python scripts/sustain_phonemes.py      # 重做单元音、二合元音和可持续辅音（可指定音素 id）
.venv-asr/bin/python scripts/acoustic_check.py        # 打印 r/l/w 共振峰与摩擦音特征
scripts/audit_all.sh                                  # 全面复查（音素、拼读与音标、读音选择、例句多音词、字母名、整词录音）
```

## React 部署

`.github/workflows/deploy.yml` 在 main 更新或手动触发时安装依赖、运行 Node 测试、构建并校验允许发布的资源，然后发布 `dist/`。本地与默认构建从 `/` 提供页面。Pages 工作流根据实际托管域名自动设置资源根路径；若要线上首页也位于域名根路径，需要根域站点或自定义域名。GitHub 仓库的 Settings → Pages → Source 需为 **GitHub Actions**；`bash scripts/deploy-github.sh` 会设置此发布模式，推送本地 main 并监控本次新触发的构建。

页面使用无 `#` 的 History 路由，构建同时生成 `404.html` 供 GitHub Pages 直接访问子路径时加载应用（该回退响应的 HTTP 状态仍为 404）。在其他静态服务器部署时，应配置未知路径回退到 `index.html`。

`/lesson/...`、`/grammar/...`、`/words/...` 和旧 `/practice` 地址保持兼容。学习进度和词书记录沿用原存储格式，不需要手工迁移。其他标签页修改词书数据时，正在进行的学习会提示重新开始当前轮次，从最新已保存记录继续，避免覆盖外部修改。

React 源码、构建配置与测试使用 TypeScript，并开启 `strict`。课程数据、自动生成的词典分片和原有纯逻辑引擎暂保留 JS 格式，通过 `src/types/` 与全局声明提供类型边界；新界面和业务模块使用 `.ts` / `.tsx`。

音频、字体、词典分片和课程数据保留原文件。`audio-src/` 始终被 Git 忽略，也不在构建发布白名单中。旧 `js/app.js`、`js/words.js` 渲染器已由 React 页面替代。
