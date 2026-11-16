/* 自然拼读课程数据
 * SOUNDS：音素表（id → 音标、发音要领、常见拼写、关键词）
 * STAGES：10 个阶段的学习路径，每个阶段含若干课
 *
 * 单词格式  "word|中文|emoji|覆盖"
 *   - word 中可用 "-" 手动切分字母组合（o-r-a-n-ge），用 "·" 切分音节（rab·bit），音节前加 ' 表示重读
 *   - 覆盖：逗号分隔的 "字母组合:音素id"，如 "ea:e_s" 表示本词中的 ea 读短音 e
 * 例句格式  "English|中文"
 */
window.SOUNDS = {
  /* ---------- 辅音 ---------- */
  p:   { ipa: 'p',  type: 'consonant', zh: '清辅音', tip: '双唇紧闭，突然张开送出一股气，声带不振动。手放在嘴前能感到气流。', spell: ['p', 'pp'], kw: 'pig' },
  b:   { ipa: 'b',  type: 'consonant', zh: '浊辅音', tip: '口型同 /p/，双唇紧闭后张开，但声带振动，送气比 /p/ 弱。', spell: ['b', 'bb'], kw: 'bed' },
  t:   { ipa: 't',  type: 'consonant', zh: '清辅音', tip: '舌尖抵住上齿龈（上门牙后面的牙床），突然放开送气，声带不振动。', spell: ['t', 'tt', '-ed'], kw: 'top' },
  d:   { ipa: 'd',  type: 'consonant', zh: '浊辅音', tip: '舌位同 /t/，但声带振动。', spell: ['d', 'dd', '-ed'], kw: 'dog' },
  k:   { ipa: 'k',  type: 'consonant', zh: '清辅音', tip: '舌根抬起抵住软腭，突然放开送气，声带不振动。', spell: ['c', 'k', 'ck'], kw: 'cat' },
  g:   { ipa: 'g',  type: 'consonant', zh: '浊辅音', tip: '舌位同 /k/，但声带振动。', spell: ['g', 'gg'], kw: 'gum' },
  f:   { ipa: 'f',  type: 'consonant', zh: '清辅音', tip: '上齿轻触下唇，气流从唇齿缝隙中摩擦而出，声带不振动。', spell: ['f', 'ff', 'ph'], kw: 'fan' },
  v:   { ipa: 'v',  type: 'consonant', zh: '浊辅音', tip: '口型同 /f/，但声带振动，下唇会有麻麻的感觉。', spell: ['v'], kw: 'van' },
  s:   { ipa: 's',  type: 'consonant', zh: '清辅音', tip: '舌尖靠近上齿龈，气流从舌尖的窄缝挤出，发出蛇一样的"嘶嘶"声。', spell: ['s', 'ss', 'c(e/i/y)'], kw: 'sun' },
  z:   { ipa: 'z',  type: 'consonant', zh: '浊辅音', tip: '口型同 /s/，但声带振动，像蜜蜂"嗡嗡"。', spell: ['z', 'zz', 's'], kw: 'zip' },
  th:  { ipa: 'θ',  type: 'consonant', zh: '清辅音', tip: '舌尖轻放在上下门牙之间，从舌齿缝隙送气，声带不振动。注意不要读成 /s/。', spell: ['th'], kw: 'thin' },
  th_v:{ ipa: 'ð',  type: 'consonant', zh: '浊辅音', tip: '舌位同 /θ/，但声带振动。常见于 this、that、the 等高频词。', spell: ['th'], kw: 'this' },
  sh:  { ipa: 'ʃ',  type: 'consonant', zh: '清辅音', tip: '双唇向前突出呈喇叭状，舌身抬高，送气发出"嘘——"。', spell: ['sh', 'ti', 'ci'], kw: 'ship' },
  zh:  { ipa: 'ʒ',  type: 'consonant', zh: '浊辅音', tip: '口型同 /ʃ/，但声带振动。', spell: ['s', 'si'], kw: 'vision' },
  ch:  { ipa: 'tʃ', type: 'consonant', zh: '清辅音', tip: '双唇突出，舌尖先抵住上齿龈后部，再突然放开，像短促、圆唇的"吃"。', spell: ['ch', 'tch'], kw: 'chip' },
  j:   { ipa: 'dʒ', type: 'consonant', zh: '浊辅音', tip: '口型同 /tʃ/，但声带振动，像圆唇的"之"。', spell: ['j', 'g(e/i/y)', 'dge'], kw: 'jam' },
  h:   { ipa: 'h',  type: 'consonant', zh: '清辅音', tip: '张开嘴轻轻呼气，像对着镜子哈气，喉咙不要用力。', spell: ['h'], kw: 'hat' },
  m:   { ipa: 'm',  type: 'consonant', zh: '鼻音', tip: '双唇紧闭，气流从鼻腔出来，像闭着嘴说"嗯"。', spell: ['m', 'mm', 'mb'], kw: 'map' },
  n:   { ipa: 'n',  type: 'consonant', zh: '鼻音', tip: '舌尖抵住上齿龈，嘴巴微张，气流从鼻腔出来。', spell: ['n', 'nn', 'kn', 'gn'], kw: 'net' },
  ng:  { ipa: 'ŋ',  type: 'consonant', zh: '鼻音', tip: '舌根抵住软腭，嘴巴张开，气流从鼻腔出来，像汉语"昂"的尾音。', spell: ['ng', 'n(k)'], kw: 'ring' },
  l:   { ipa: 'l',  type: 'consonant', zh: '舌侧音', tip: '舌尖抵住上齿龈，气流从舌头两侧流出，声带振动。', spell: ['l', 'll'], kw: 'leg' },
  r:   { ipa: 'r',  type: 'consonant', zh: '卷舌音', tip: '双唇略圆，舌尖向上卷起但不碰上颚，声带振动。不要读成汉语的"日"。', spell: ['r', 'rr', 'wr'], kw: 'red' },
  w:   { ipa: 'w',  type: 'consonant', zh: '半元音', tip: '双唇收圆向前突出（像要吹蜡烛），然后迅速向两边滑开。', spell: ['w', 'wh'], kw: 'web' },
  y:   { ipa: 'j',  type: 'consonant', zh: '半元音', tip: '舌面抬向硬腭，像汉语"耶"的开头。注意音标写作 /j/。', spell: ['y'], kw: 'yes' },
  x:   { ipa: 'ks', type: 'consonant', zh: '组合音', tip: '先发 /k/ 再快速接 /s/，两个音连成一个。', spell: ['x'], kw: 'box', seq: ['k', 's'] },
  qu:  { ipa: 'kw', type: 'consonant', zh: '组合音', tip: 'q 后面几乎总跟着 u，qu 一起读 /kw/：先 /k/ 再快速接 /w/。', spell: ['qu'], kw: 'queen', seq: ['k', 'w'] },

  /* ---------- 短元音 ---------- */
  a_s: { ipa: 'æ',  type: 'short', zh: '短元音 a', tip: '嘴巴张大，嘴角向两边拉开，舌尖抵住下齿，比汉语"哎"开口更大，短促有力。', spell: ['a'], kw: 'apple' },
  e_s: { ipa: 'ɛ',  type: 'short', zh: '短元音 e', tip: '嘴巴半开，嘴角略向两侧，比 /æ/ 开口小，像短促的"哎"。', spell: ['e', 'ea'], kw: 'egg' },
  i_s: { ipa: 'ɪ',  type: 'short', zh: '短元音 i', tip: '嘴巴微张，舌头放松，短而松的"一"，介于"一"和"诶"之间。', spell: ['i', 'y'], kw: 'in' },
  o_s: { ipa: 'ɑ',  type: 'short', zh: '短元音 o', tip: '嘴巴张大成竖椭圆，舌头放低后缩，美式发音接近"啊"。（英式读 /ɒ/，嘴唇略圆）', spell: ['o'], kw: 'octopus' },
  u_s: { ipa: 'ʌ',  type: 'short', zh: '短元音 u', tip: '嘴巴半开，舌头放松居中，短促的"阿"，像突然被吓到时发出的声音。', spell: ['u', 'o'], kw: 'up' },

  /* ---------- 长元音（读字母名） ---------- */
  a_l: { ipa: 'eɪ', type: 'long', zh: '长元音 a', tip: '读字母 A 的名字：从"诶"自然滑向"一"。', spell: ['a_e', 'ai', 'ay'], kw: 'cake' },
  e_l: { ipa: 'iː', type: 'long', zh: '长元音 e', tip: '读字母 E 的名字：嘴角向两边拉开像微笑，发长长的"衣"。', spell: ['ee', 'ea', 'e_e', 'y', 'ey'], kw: 'tree' },
  i_l: { ipa: 'aɪ', type: 'long', zh: '长元音 i', tip: '读字母 I 的名字：从"啊"滑向"一"，像汉语"爱"。', spell: ['i_e', 'ie', 'igh', 'y'], kw: 'kite' },
  o_l: { ipa: 'oʊ', type: 'long', zh: '长元音 o', tip: '读字母 O 的名字：从"欧"开始，嘴唇逐渐收圆。', spell: ['o_e', 'oa', 'ow', 'oe'], kw: 'boat' },
  u_l: { ipa: 'juː',type: 'long', zh: '长元音 u', tip: '读字母 U 的名字：像汉语"优"。', spell: ['u_e', 'ue', 'ew'], kw: 'cube' },
  oo_l:{ ipa: 'uː', type: 'long', zh: '长 oo', tip: '嘴唇收圆向前突出，发长长的"乌"。', spell: ['oo', 'ue', 'ew', 'u_e'], kw: 'moon' },
  oo_s:{ ipa: 'ʊ',  type: 'other', zh: '短 oo', tip: '嘴唇稍圆，舌头放松，短促的"乌"，比 /uː/ 短而松。', spell: ['oo', 'u'], kw: 'book' },

  /* ---------- 其他元音 / 双元音 ---------- */
  oi:  { ipa: 'ɔɪ', type: 'other', zh: '双元音', tip: '从"哦"滑向"一"，嘴唇先圆后展。', spell: ['oi', 'oy'], kw: 'coin' },
  ow:  { ipa: 'aʊ', type: 'other', zh: '双元音', tip: '从"啊"滑向"乌"，嘴巴由大到小、由扁到圆，像被扎到时喊"嗷"。', spell: ['ou', 'ow'], kw: 'cow' },
  aw:  { ipa: 'ɔː', type: 'other', zh: '长元音', tip: '嘴巴张大略圆，舌头后缩，发长长的"奥"。（很多美国人读得接近 /ɑ/）', spell: ['aw', 'au', 'al'], kw: 'saw' },
  schwa:{ipa: 'ə',  type: 'other', zh: '弱读元音', tip: '最轻、最放松的元音：嘴巴微张，轻轻"呃"一下。它是英语中出现最多的音，只出现在非重读音节里。', spell: ['a', 'e', 'o', 'u'], kw: 'about' },

  /* ---------- R 控制元音 ---------- */
  ar:  { ipa: 'ɑr', type: 'r', zh: 'R 控制', tip: '先发张大嘴的"啊"，然后舌尖向上卷起。', spell: ['ar'], kw: 'car' },
  or:  { ipa: 'ɔr', type: 'r', zh: 'R 控制', tip: '先发圆唇的"哦"，然后舌尖向上卷起。', spell: ['or', 'ore'], kw: 'fork' },
  er:  { ipa: 'ɝ',  type: 'r', zh: 'R 控制', tip: '嘴巴微张，舌尖卷起悬空，发卷舌的"儿"。三种拼法 er / ir / ur 读音完全相同。', spell: ['er', 'ir', 'ur'], kw: 'bird' },
  air: { ipa: 'ɛr', type: 'r', zh: 'R 控制', tip: '先发"哎"，然后舌尖卷起。', spell: ['air', 'are', 'ear'], kw: 'chair' },
  ear: { ipa: 'ɪr', type: 'r', zh: 'R 控制', tip: '先发短促的"一"，然后舌尖卷起，像"一儿"。', spell: ['ear', 'eer'], kw: 'ear' },

  /* ---------- 组合（用于拼读块，不在音标总表显示） ---------- */
  ed_id: { ipa: 'ɪd',  type: 'combo', zh: '-ed', seq: ['i_s', 'd'] },
  tion:  { ipa: 'ʃən', type: 'combo', zh: '-tion', seq: ['sh', 'schwa', 'n'] },
  sion:  { ipa: 'ʒən', type: 'combo', zh: '-sion', seq: ['zh', 'schwa', 'n'] },
  ture:  { ipa: 'tʃər',type: 'combo', zh: '-ture', seq: ['ch', 'er'] },
  le:    { ipa: 'əl',  type: 'combo', zh: '-le', seq: ['schwa', 'l'] },
  nk:    { ipa: 'ŋk',  type: 'combo', zh: 'nk', seq: ['ng', 'k'] },
  silent:{ ipa: '',    type: 'combo', zh: '不发音', seq: [] },
  ire:   { ipa: 'aɪr',  type: 'combo', zh: 'ire', seq: ['i_l', 'er'] },
  ure:   { ipa: 'jʊr',  type: 'combo', zh: 'ure', seq: ['u_l', 'er'] },
  our:   { ipa: 'aʊr',  type: 'combo', zh: 'our', seq: ['ow', 'er'] },
  sure:  { ipa: 'ʒər',  type: 'combo', zh: '-sure', seq: ['zh', 'er'] },
  uf:    { ipa: 'ʌf',   type: 'combo', zh: 'ough', seq: ['u_s', 'f'] },
  awf:   { ipa: 'ɔf',   type: 'combo', zh: 'ough', seq: ['aw', 'f'] },
  af:    { ipa: 'æf',   type: 'combo', zh: 'augh', seq: ['a_s', 'f'] },
  age:   { ipa: 'ɪdʒ',  type: 'combo', zh: '-age', seq: ['i_s', 'j'] },
  ous:   { ipa: 'əs',   type: 'combo', zh: '-ous', seq: ['schwa', 's'] },
  ive:   { ipa: 'ɪv',   type: 'combo', zh: '-ive', seq: ['i_s', 'v'] },
  cial:  { ipa: 'ʃəl',  type: 'combo', zh: '-cial', seq: ['sh', 'schwa', 'l'] },
  able:  { ipa: 'əbəl', type: 'combo', zh: '-able', seq: ['schwa', 'b', 'schwa', 'l'] },
};

window.LEVELS = [
  { key: '入门', en: 'Starter', color: '#E8743B' },
  { key: '基础', en: 'Foundation', color: '#2E9E6E' },
  { key: '进阶', en: 'Developing', color: '#2F7FC1' },
  { key: '高级', en: 'Advanced', color: '#8A5CC2' },
  { key: '精通', en: 'Mastery', color: '#C2405C' },
];

window.STAGES = [
  /* ====================================================== */
  {
    id: 1, level: '入门', title: '字母发音', en: 'Letter Sounds', weeks: 3, icon: '🔤',
    goal: '掌握 26 个字母最常见的"字母音"，能听音找字母、看字母发音。',
    intro: '每个字母都有"名字"（如 A 读 /eɪ/）和"声音"（如 a 在 apple 里读 /æ/）。自然拼读读的是<b>声音</b>。本阶段按使用频率把字母分成 5 组，学完第一组就能拼出 sat、pin、tap 这样的单词。',
    lessons: [
      {
        id: '1-1', title: 's a t p i n', en: 'Group 1',
        rule: '这 6 个字母组合起来能拼出最多的简单单词，所以先学它们。注意 <b>a</b> 和 <b>i</b> 是元音字母，这里读<b>短音</b>。',
        cards: [
          { g: 's', s: 's', kw: 'sun' }, { g: 'a', s: 'a_s', kw: 'ant' }, { g: 't', s: 't', kw: 'top' },
          { g: 'p', s: 'p', kw: 'pig' }, { g: 'i', s: 'i_s', kw: 'in' }, { g: 'n', s: 'n', kw: 'net' },
        ],
        words: ['sat|坐（过去式）|🪑', 'tap|轻拍；水龙头|🚰', 'nap|小睡|😴', 'pan|平底锅|🍳', 'pin|别针|📌', 'tin|锡罐|🥫', 'sit|坐|🧘', 'tip|尖端；小费|☝️', 'ant|蚂蚁|🐜', 'pat|轻拍|👋', 'sip|小口喝|🥤', 'nip|轻咬|🦀', 'pit|坑|🕳️', 'tan|棕褐色|🟫', 'an|一个|☝️', 'in|在……里面|📥', 'it|它|👉', 'at|在|📍', 'spin|旋转|🌀', 'snap|啪地折断|🫰', 'snip|剪|✂️', 'pants|裤子|👖', 'tint|色调|🎨', 'sap|树液|🌳'],
        sentences: ['Pat sat.|帕特坐下了。', 'A pin is in a tin.|一枚别针在罐子里。', 'Tap, tap, tap!|拍拍拍！', 'An ant is in a pan.|一只蚂蚁在平底锅里。'],
      },
      {
        id: '1-2', title: 'c k e h r m d', en: 'Group 2',
        rule: '<b>c</b> 和 <b>k</b> 读同一个音 /k/。<b>e</b> 是元音字母，读短音 /ɛ/。<b>m</b> 闭嘴发音，<b>h</b> 只是轻轻呼气。',
        cards: [
          { g: 'c', s: 'k', kw: 'cat' }, { g: 'k', s: 'k', kw: 'kid' }, { g: 'e', s: 'e_s', kw: 'egg' },
          { g: 'h', s: 'h', kw: 'hat' }, { g: 'r', s: 'r', kw: 'red' }, { g: 'm', s: 'm', kw: 'map' }, { g: 'd', s: 'd', kw: 'dad' },
        ],
        words: ['cat|猫|🐱', 'cap|帽子|🧢', 'kid|小孩|🧒', 'hen|母鸡|🐔', 'red|红色|🔴', 'ten|十|🔟', 'map|地图|🗺️', 'hat|帽子|👒', 'dad|爸爸|👨', 'men|男人们|👬', 'rat|老鼠|🐀', 'pet|宠物|🐶', 'can|能；罐头|🥫', 'mat|垫子|🧘', 'ram|公羊|🐏', 'ham|火腿|🍖', 'hit|打|👊', 'hid|藏（过去式）|🙈', 'rip|撕破|📃', 'kit|成套工具|🧰', 'dim|昏暗的|🔅', 'mad|生气的|😠', 'him|他|👦', 'den|兽穴|🦊'],
        sentences: ['The cat is red.|这只猫是红色的。', 'Dad has a hat.|爸爸有一顶帽子。', 'Ten men ran.|十个男人跑了。', 'The hen sat on a mat.|母鸡坐在垫子上。'],
      },
      {
        id: '1-3', title: 'g o u l f b', en: 'Group 3',
        rule: '<b>o</b> 和 <b>u</b> 是元音字母：o 读 /ɑ/（美式，像张大嘴的"啊"），u 读 /ʌ/（放松的短"阿"）。<b>f</b> 上齿咬下唇，<b>b</b> 双唇爆破。',
        cards: [
          { g: 'g', s: 'g', kw: 'gum' }, { g: 'o', s: 'o_s', kw: 'hot' }, { g: 'u', s: 'u_s', kw: 'up' },
          { g: 'l', s: 'l', kw: 'leg' }, { g: 'f', s: 'f', kw: 'fan' }, { g: 'b', s: 'b', kw: 'bed' },
        ],
        words: ['dog|狗|🐶', 'log|木头|🪵', 'hot|热的|🔥', 'pot|锅|🍲', 'bug|虫子|🐛', 'sun|太阳|☀️', 'cup|杯子|☕', 'fun|乐趣|🎉', 'leg|腿|🦵', 'fan|风扇|🪭', 'bed|床|🛏️', 'bus|公交车|🚌', 'big|大的|🐘', 'bag|包|👜', 'fog|雾|🌫️', 'gum|口香糖|🍬', 'lot|很多|📦', 'mud|泥|🟤', 'hug|拥抱|🤗', 'fit|合身|👕', 'lab|实验室|🧪', 'lip|嘴唇|👄', 'nut|坚果|🥜', 'gas|气体|⛽'],
        sentences: ['The dog is on the log.|狗在木头上。', 'A bug is in the cup.|一只虫子在杯子里。', 'The sun is hot.|太阳很热。', 'Get on the bus!|上公交车！'],
      },
      {
        id: '1-4', title: 'j z w v y', en: 'Group 4',
        rule: '<b>z</b> 是带声带振动的 /s/，<b>v</b> 是带声带振动的 /f/。<b>y</b> 在词首读 /j/（像"耶"的开头），<b>w</b> 要先把嘴唇收圆。',
        cards: [
          { g: 'j', s: 'j', kw: 'jam' }, { g: 'z', s: 'z', kw: 'zip' }, { g: 'w', s: 'w', kw: 'web' },
          { g: 'v', s: 'v', kw: 'van' }, { g: 'y', s: 'y', kw: 'yes' },
        ],
        words: ['jam|果酱|🍓', 'jet|喷气式飞机|✈️', 'jog|慢跑|🏃', 'zip|拉链|🤐', 'zap|快速击打|⚡', 'web|网|🕸️', 'wet|湿的|💧', 'win|赢|🏆', 'van|面包车|🚐', 'vet|兽医|🩺', 'yes|是|✅', 'yum|好吃|😋', 'jug|水罐|🫗', 'jab|戳|👉', 'job|工作|💼', 'zigzag|之字形|〰️', 'wag|摇（尾巴）|🐕', 'wig|假发|💇', 'vat|大桶|🛢️', 'yak|牦牛|🐃', 'yap|狂吠|🐶', 'yell|大喊|📢', 'wind|风|🌬️', 'jazz|爵士乐|🎷'],
        sentences: ['Jim has jam.|吉姆有果酱。', 'The van is wet.|面包车湿了。', 'Yes, we win!|是的，我们赢了！', 'Zip up the bag.|把包拉上。'],
      },
      {
        id: '1-5', title: 'x qu', en: 'Group 5',
        rule: '<b>x</b> 读两个音 /ks/，通常出现在词尾（box、six）。<b>q</b> 几乎总是和 <b>u</b> 一起出现，<b>qu</b> 读 /kw/。至此 26 个字母的基本发音全部学完！',
        cards: [{ g: 'x', s: 'x', kw: 'box' }, { g: 'qu', s: 'qu', kw: 'quiz' }],
        words: ['box|盒子|📦', 'fox|狐狸|🦊', 'six|六|6️⃣', 'mix|混合|🥣', 'wax|蜡|🕯️', 'fix|修理|🔧', 'quiz|小测验|📝', 'quit|放弃|🚪', 'quack|嘎嘎叫|🦆', 'quilt|被子|🛏️', 'ox|公牛|🐂', 'tax|税|🧾', 'fax|传真|📠', 'sax|萨克斯|🎷', 'next|下一个|⏭️', 'text|文字；短信|💬', 'exit|出口|🚪', 'taxi|出租车|🚕|i:e_l', 'quest|探索|🗺️', 'quick|快的|⚡', 'quill|羽毛笔|🪶'],
        sentences: ['The fox is in the box.|狐狸在盒子里。', 'Six ducks quack.|六只鸭子嘎嘎叫。', 'Mix it up!|把它搅匀！', 'Can you fix the quilt?|你能修补这条被子吗？'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 2, level: '入门', title: '短元音与 CVC 单词', en: 'Short Vowels & CVC', weeks: 3, icon: '🍎',
    goal: '熟练拼读"辅音-元音-辅音"(CVC) 结构的单词，认识常用高频词。',
    intro: 'CVC 指 <b>C</b>onsonant-<b>V</b>owel-<b>C</b>onsonant，比如 c-a-t。夹在两个辅音中间的元音通常读<b>短音</b>。本阶段按"词族"(word family) 练习：只换开头字母，就能读出一串单词，比如 cat、hat、mat、sat。',
    lessons: [
      {
        id: '2-1', title: '短元音 a', en: 'Short a',
        rule: '词族：<b>-at -an -ap -ag -ad -am</b>。张大嘴，嘴角向两边拉，发有力的 /æ/。中国学生常把它读成"哎"/ɛ/，注意嘴巴要张得更大。',
        cards: [{ g: 'a', s: 'a_s', kw: 'cat' }],
        words: ['cat|猫|🐱', 'bat|蝙蝠|🦇', 'fan|风扇|🪭', 'man|男人|👨', 'van|面包车|🚐', 'cap|帽子|🧢', 'map|地图|🗺️', 'bag|包|👜', 'tag|标签|🏷️', 'jam|果酱|🍓', 'ham|火腿|🍖', 'sad|难过的|😢', 'hat|帽子|👒', 'rat|老鼠|🐀', 'mat|垫子|🧘', 'can|罐头|🥫', 'pan|平底锅|🍳', 'nap|小睡|😴', 'tap|水龙头|🚰', 'rag|抹布|🧽', 'wag|摇摆|🐕', 'ram|公羊|🐏', 'dad|爸爸|👨', 'pad|垫子；便笺本|📝'],
        sentences: ['The fat cat sat on a mat.|胖猫坐在垫子上。', 'Sam has a bag and a cap.|山姆有一个包和一顶帽子。', 'The man ran to the van.|那个男人跑向面包车。', 'Dad had a nap.|爸爸小睡了一会儿。'],
      },
      {
        id: '2-2', title: '短元音 e', en: 'Short e',
        rule: '词族：<b>-et -en -ed -eg</b>。/ɛ/ 开口比 /æ/ 小，嘴角稍微向两边。对比：<b>pan</b> 平底锅 / <b>pen</b> 钢笔。',
        cards: [{ g: 'e', s: 'e_s', kw: 'bed' }],
        words: ['bed|床|🛏️', 'red|红色|🔴', 'hen|母鸡|🐔', 'pen|钢笔|🖊️', 'ten|十|🔟', 'net|网|🥅', 'wet|湿的|💧', 'jet|喷气机|✈️', 'pet|宠物|🐶', 'leg|腿|🦵', 'web|网|🕸️', 'yes|是|✅', 'men|男人们|👬', 'den|兽穴|🦊', 'beg|乞求|🙏', 'peg|挂钩|🪝', 'fed|喂（过去式）|🍼', 'led|带领（过去式）|🧭', 'get|得到|🤲', 'let|让|👌', 'set|一套|🧩', 'vet|兽医|🩺', 'bell|铃|🔔', 'egg|鸡蛋|🥚'],
        sentences: ['Ten red hens.|十只红母鸡。', 'My pet is on the bed.|我的宠物在床上。', 'Get the pen, Ben.|本，去拿那支笔。', 'The net is wet.|网湿了。'],
        pairs: ['pan>pen', 'bad>bed', 'man>men', 'bat>bet'],
      },
      {
        id: '2-3', title: '短元音 i', en: 'Short i',
        rule: '词族：<b>-it -in -ig -ip -id</b>。/ɪ/ 短促放松，不要拉长成"衣"。对比：<b>bit</b> 一点儿 / <b>beat</b> 打。',
        cards: [{ g: 'i', s: 'i_s', kw: 'pig' }],
        words: ['pig|猪|🐷', 'big|大的|🐘', 'dig|挖|⛏️', 'wig|假发|💇', 'sit|坐|🧘', 'kit|成套工具|🧰', 'pin|别针|📌', 'fin|鱼鳍|🦈', 'win|赢|🏆', 'lip|嘴唇|👄', 'zip|拉链|🤐', 'lid|盖子|🫙', 'bit|一点儿|🤏', 'hit|打|👊', 'fit|合身|👕', 'tin|罐|🥫', 'bin|垃圾桶|🗑️', 'hip|臀部|🕺', 'rip|撕|📃', 'sip|小口喝|🥤', 'hid|藏（过去式）|🙈', 'mix|混合|🥣', 'six|六|6️⃣', 'jig|快步舞|💃'],
        sentences: ['The big pig can dig.|大猪会挖土。', 'Put the lid on the tin.|把盖子盖在罐子上。', 'Six pigs sit in a pit.|六只猪坐在坑里。', 'I win! I win!|我赢了！我赢了！'],
      },
      {
        id: '2-4', title: '短元音 o', en: 'Short o',
        rule: '词族：<b>-ot -op -og -ox -ob</b>。美式发音嘴巴张大成竖椭圆，接近"啊"；英式嘴唇略圆，接近短"哦"。本站采用美式发音。',
        cards: [{ g: 'o', s: 'o_s', kw: 'dog' }],
        words: ['dog|狗|🐶', 'log|木头|🪵', 'fog|雾|🌫️', 'hot|热的|🔥', 'pot|锅|🍲', 'dot|点|⚫', 'top|顶部|🔝', 'mop|拖把|🧹', 'hop|跳|🐇', 'box|盒子|📦', 'fox|狐狸|🦊', 'mom|妈妈|👩', 'cot|小床|🛏️', 'lot|很多|📦', 'not|不|🚫', 'rot|腐烂|🍂', 'pop|砰|🎈', 'cop|警察|👮', 'job|工作|💼', 'rob|抢劫|🦹', 'sob|啜泣|😭', 'nod|点头|🙂', 'rod|竿|🎣', 'ox|公牛|🐂'],
        sentences: ['The pot is hot.|锅很烫。', 'Mom has a mop.|妈妈有一把拖把。', 'Hop on top of the box.|跳到盒子上面。', 'The dog got a log.|狗叼到一根木头。'],
      },
      {
        id: '2-5', title: '短元音 u', en: 'Short u',
        rule: '词族：<b>-ug -un -ut -ub -ud -up</b>。/ʌ/ 嘴巴半开、舌头放松，短促有力。对比：<b>cap</b> 帽子 / <b>cup</b> 杯子。',
        cards: [{ g: 'u', s: 'u_s', kw: 'sun' }],
        words: ['bug|虫子|🐛', 'hug|拥抱|🤗', 'mug|马克杯|☕', 'rug|地毯|🟫', 'sun|太阳|☀️', 'run|跑|🏃', 'bun|小圆面包|🍞', 'nut|坚果|🥜', 'cut|切|✂️', 'tub|浴缸|🛁', 'mud|泥|🟤', 'pup|小狗|🐶', 'cub|幼崽|🐻', 'rub|擦|🧽', 'fun|乐趣|🎉', 'hut|小屋|🛖', 'but|但是|↔️', 'bus|公交车|🚌', 'cup|杯子|☕', 'gum|口香糖|🍬', 'hum|哼唱|🎶', 'dug|挖（过去式）|⛏️', 'jug|水罐|🫗', 'up|向上|⬆️'],
        sentences: ['The pup is in the mud.|小狗在泥里。', 'Run in the sun!|在阳光下奔跑！', 'A bug is on the rug.|一只虫子在地毯上。', 'Hug me, Mum.|妈妈，抱抱我。'],
        pairs: ['cap>cup', 'hat>hut', 'bag>bug', 'fan>fun'],
      },
      {
        id: '2-6', title: 'CVC 综合与高频词', en: 'CVC Review & Sight Words',
        rule: '把五个短元音混在一起练习。另外，英语里有一些<b>高频词</b>（sight words）不完全符合拼读规则，或者使用频率极高，需要整体认读，比如 the、is、was、said。每天认读几遍，很快就能记住。',
        cards: [{ g: 'a', s: 'a_s', kw: 'cat' }, { g: 'e', s: 'e_s', kw: 'bed' }, { g: 'i', s: 'i_s', kw: 'pig' }, { g: 'o', s: 'o_s', kw: 'dog' }, { g: 'u', s: 'u_s', kw: 'sun' }],
        words: ['cat|猫|🐱', 'bed|床|🛏️', 'pig|猪|🐷', 'dog|狗|🐶', 'bus|公交车|🚌', 'pen|钢笔|🖊️', 'sit|坐|🧘', 'hop|跳|🐇', 'cup|杯子|☕', 'fan|风扇|🪭', 'wet|湿的|💧', 'hut|小屋|🛖', 'hen|母鸡|🐔', 'log|木头|🪵', 'rug|地毯|🟫', 'kid|小孩|🧒', 'jet|喷气机|✈️', 'mop|拖把|🧹', 'wig|假发|💇', 'van|面包车|🚐', 'nut|坚果|🥜', 'web|网|🕸️', 'ham|火腿|🍖', 'fox|狐狸|🦊'],
        sight: ['the', 'a', 'I', 'is', 'to', 'you', 'he', 'she', 'we', 'my', 'of', 'said', 'was', 'are', 'have', 'do', 'go', 'no', 'and', 'it'],
        sentences: ['I have a big red bag.|我有一个大红包。', 'The dog and the cat are wet.|狗和猫都湿了。', 'She said, "Get the cup."|她说："去拿杯子。"', 'We had fun in the sun.|我们在阳光下玩得很开心。'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 3, level: '基础', title: '辅音连缀', en: 'Consonant Blends', weeks: 2, icon: '🔗',
    goal: '能流畅拼读含有两个或三个相邻辅音的单词，如 frog、stop、hand、string。',
    intro: '<b>连缀</b>(blend) 是两三个辅音挨在一起，<b>每个辅音的音都要发出来</b>，只是连得很快。最常见的错误是在辅音之间加元音：把 <b>bl</b> 读成"布-勒"、把 <b>st</b> 读成"思-特"。练习时先慢慢分开读，再逐渐加快。',
    lessons: [
      {
        id: '3-1', title: 'L 连缀', en: 'bl cl fl gl pl sl',
        rule: '辅音 + <b>l</b>。发完前一个辅音，舌尖立刻抵住上齿龈发 /l/，中间不要停顿、不要加"呃"。',
        cards: [
          { g: 'bl', s: ['b', 'l'], blend: true, kw: 'black' }, { g: 'cl', s: ['k', 'l'], blend: true, kw: 'clap' },
          { g: 'fl', s: ['f', 'l'], blend: true, kw: 'flag' }, { g: 'gl', s: ['g', 'l'], blend: true, kw: 'glad' },
          { g: 'pl', s: ['p', 'l'], blend: true, kw: 'plum' }, { g: 'sl', s: ['s', 'l'], blend: true, kw: 'sled' },
        ],
        words: ['black|黑色|⚫', 'block|积木|🧱', 'clap|拍手|👏', 'clock|时钟|🕰️', 'flag|旗子|🚩', 'flip|翻转|🤸', 'glad|高兴的|😊', 'glass|玻璃杯|🥛', 'plan|计划|📋', 'plum|李子|🫐', 'sled|雪橇|🛷', 'slip|滑倒|🍌', 'blend|混合|🥤', 'clip|夹子|📎', 'clam|蛤蜊|🦪', 'class|班级|🏫', 'flat|平的|🫓', 'flop|扑通落下|🐟', 'plug|插头|🔌', 'plus|加号|➕', 'slam|砰地关上|🚪', 'slim|苗条的|🧍', 'slot|狭槽|🎰', 'plot|情节|📖'],
        sentences: ['Clap, clap! I am glad.|拍拍手！我很高兴。', 'The flag is black.|那面旗是黑色的。', 'Do not slip off the sled.|别从雪橇上滑下来。', 'Put the plum in the glass.|把李子放进玻璃杯里。'],
      },
      {
        id: '3-2', title: 'R 连缀', en: 'br cr dr fr gr pr tr',
        rule: '辅音 + <b>r</b>。发 /r/ 时嘴唇略圆、舌尖卷起。注意 <b>tr</b> 听起来接近"chr"、<b>dr</b> 接近"jr"，这是自然的连读现象。',
        cards: [
          { g: 'br', s: ['b', 'r'], blend: true, kw: 'brick' }, { g: 'cr', s: ['k', 'r'], blend: true, kw: 'crab' },
          { g: 'dr', s: ['d', 'r'], blend: true, kw: 'drum' }, { g: 'fr', s: ['f', 'r'], blend: true, kw: 'frog' },
          { g: 'gr', s: ['g', 'r'], blend: true, kw: 'grass' }, { g: 'pr', s: ['p', 'r'], blend: true, kw: 'press' },
          { g: 'tr', s: ['t', 'r'], blend: true, kw: 'truck' },
        ],
        words: ['brick|砖|🧱', 'crab|螃蟹|🦀', 'crib|婴儿床|🛏️', 'drum|鼓|🥁', 'dress|连衣裙|👗', 'frog|青蛙|🐸', 'grab|抓|✊', 'grass|草|🌱', 'grin|咧嘴笑|😁', 'press|按|👆', 'trip|旅行|🧳', 'truck|卡车|🚚', 'crop|庄稼|🌾', 'cross|交叉|❌', 'drip|滴水|💧', 'drop|掉落|🫳', 'frill|褶边|🎀', 'from|从|📤', 'grip|握紧|✊', 'grill|烤架|🍖', 'prop|支撑|🪵', 'trap|陷阱|🪤', 'trim|修剪|✂️', 'track|轨道|🛤️'],
        sentences: ['The frog is on the grass.|青蛙在草地上。', 'Fred has a red drum.|弗雷德有一面红鼓。', 'A crab is in the trap.|一只螃蟹在陷阱里。', 'We went on a trip in a truck.|我们坐卡车去旅行。'],
      },
      {
        id: '3-3', title: 'S 连缀与 tw', en: 'sc sk sm sn sp st sw tw',
        rule: '<b>s</b> + 辅音。先发"嘶"，再接后面的辅音。注意：<b>sp st sk</b> 中的 p、t、k 送气很弱，听起来像 b、d、g，这是正常的（如 stop 听起来像"sdop"）。',
        cards: [
          { g: 'sc', s: ['s', 'k'], blend: true, kw: 'scan' }, { g: 'sk', s: ['s', 'k'], blend: true, kw: 'skip' }, { g: 'sm', s: ['s', 'm'], blend: true, kw: 'smell' },
          { g: 'sn', s: ['s', 'n'], blend: true, kw: 'snack' }, { g: 'sp', s: ['s', 'p'], blend: true, kw: 'spin' },
          { g: 'st', s: ['s', 't'], blend: true, kw: 'stop' }, { g: 'sw', s: ['s', 'w'], blend: true, kw: 'swim' },
          { g: 'tw', s: ['t', 'w'], blend: true, kw: 'twin' },
        ],
        words: ['skip|跳；跳过|⏭️', 'skin|皮肤|🖐️', 'smell|闻|👃', 'snack|零食|🍪', 'snap|啪地折断|🫰', 'spot|斑点|🐆', 'spin|旋转|🌀', 'stop|停|🛑', 'step|台阶；步|👣', 'swim|游泳|🏊', 'scan|扫描|📠', 'smog|雾霾|🌫️', 'skid|打滑|🛞', 'skunk|臭鼬|🦨', 'smack|拍打|👋', 'snip|剪|✂️', 'sniff|嗅|👃', 'spell|拼写|🔤', 'spill|洒出|🥛', 'stem|茎|🌱', 'stack|一堆|📚', 'swam|游泳（过去式）|🏊', 'swell|膨胀|🎈', 'scab|痂|🩹', 'twin|双胞胎|👯', 'twig|细枝|🌿', 'twist|扭转|🌀'],
        sentences: ['Stop and smell the plum.|停下来闻闻李子。', 'Can you swim and skip?|你会游泳和跳绳吗？', 'The dog has a black spot.|那只狗有一块黑斑。', 'I had a snack.|我吃了点零食。'],
      },
      {
        id: '3-4', title: '尾部连缀', en: 'nd nt mp st sk ft lt lk',
        rule: '连缀也会出现在<b>词尾</b>。读到最后一个辅音时要发完整，但不要在后面加"呃"（hand 不要读成"hand-de"）。',
        cards: [
          { g: 'nd', s: ['n', 'd'], blend: true, kw: 'hand' }, { g: 'nt', s: ['n', 't'], blend: true, kw: 'tent' },
          { g: 'mp', s: ['m', 'p'], blend: true, kw: 'lamp' }, { g: 'st', s: ['s', 't'], blend: true, kw: 'nest' },
          { g: 'sk', s: ['s', 'k'], blend: true, kw: 'desk' }, { g: 'ft', s: ['f', 't'], blend: true, kw: 'gift' },
          { g: 'lt', s: ['l', 't'], blend: true, kw: 'belt' }, { g: 'lk', s: ['l', 'k'], blend: true, kw: 'milk' },
        ],
        words: ['hand|手|✋', 'sand|沙子|🏖️', 'pond|池塘|🦆', 'tent|帐篷|⛺', 'plant|植物|🪴', 'lamp|灯|💡', 'jump|跳|🦘', 'nest|鸟巢|🪺', 'desk|书桌|🗄️', 'mask|面具|🎭', 'gift|礼物|🎁', 'milk|牛奶|🥛', 'band|乐队|🎸', 'bend|弯曲|↩️', 'hunt|打猎|🏹', 'camp|露营|🏕️', 'bump|撞|💥', 'fast|快的|⚡', 'list|清单|📋', 'dust|灰尘|🌫️', 'tusk|象牙|🐘', 'soft|柔软的|🧸', 'left|左边|⬅️', 'melt|融化|🫠'],
        sentences: ['Jump in the sand!|跳进沙子里！', 'The lamp is on the desk.|灯在书桌上。', 'An egg is in the nest.|鸟巢里有一个蛋。', 'This gift is the best!|这份礼物是最棒的！'],
      },
      {
        id: '3-5', title: '三字母连缀', en: 'scr spl spr str squ',
        rule: '三个辅音连在一起，都以 <b>s</b> 开头。先分段读 s-tr、s-pr，再合成一口气读出。',
        cards: [
          { g: 'scr', s: ['s', 'k', 'r'], blend: true, kw: 'scrub' }, { g: 'spl', s: ['s', 'p', 'l'], blend: true, kw: 'split' },
          { g: 'spr', s: ['s', 'p', 'r'], blend: true, kw: 'spring' }, { g: 'str', s: ['s', 't', 'r'], blend: true, kw: 'string' },
          { g: 'squ', s: ['s', 'k', 'w'], blend: true, kw: 'squid' },
        ],
        words: ['scrub|擦洗|🧽', 'scrap|碎片|📃', 'split|劈开|🪓', 'splash|溅水|💦', 'spring|春天|🌸', 'sprint|冲刺|🏃', 'string|绳子|🧵', 'strap|带子|🎒', 'strong|强壮的|💪', 'squid|鱿鱼|🦑', 'squint|眯眼|😑', 'stress|压力|😫', 'script|剧本|📜', 'scratch|抓挠|🐈', 'splat|啪嗒|💥', 'splint|夹板|🩹', 'sprig|小枝|🌿', 'strip|条|📏', 'stretch|伸展|🤸', 'strum|弹拨|🎸', 'strand|一缕|🧵'],
        sentences: ['The strong man can split the log.|那个强壮的男人能劈开木头。', 'Splash! The squid can swim.|哗啦！鱿鱼会游泳。', 'Scrub the strap.|把带子擦干净。', 'We sprint in the spring.|我们在春天里奔跑。'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 4, level: '基础', title: '辅音二合字母', en: 'Consonant Digraphs', weeks: 3, icon: '🤝',
    goal: '认识 sh、ch、th、wh、ph、ck、ng 等组合，知道"两个字母发一个新音"；掌握 FLOSS 双写规则和 -tch / -dge。',
    intro: '<b>二合字母</b>(digraph) 是两个字母组合在一起，<b>只发一个音</b>，而且这个音和两个字母各自的音都不一样。比如 s + h 不是 /s/ + /h/，而是全新的 /ʃ/。这与上一阶段的"连缀"（每个音都要发）正好相反。',
    lessons: [
      {
        id: '4-1', title: 'sh', en: 'sh /ʃ/',
        rule: '<b>sh</b> 读 /ʃ/，就像让别人安静时的"嘘——"。可以出现在词首（ship）或词尾（fish）。<br><b>shr</b> 是 sh 和 r 的连缀：先发 /ʃ/ 再卷舌（shrimp、shrink）。',
        cards: [{ g: 'sh', s: 'sh', kw: 'ship' }, { g: 'shr', s: ['sh', 'r'], blend: true, kw: 'shrimp' }],
        words: ['ship|船|🚢', 'shop|商店|🏪', 'shed|棚子|🛖', 'shell|贝壳|🐚', 'shelf|架子|📚', 'shut|关上|🚪', 'fish|鱼|🐟', 'dish|盘子|🍽️', 'wish|愿望|🌠', 'brush|刷子|🪥', 'cash|现金|💵', 'crash|撞击|💥', 'shin|小腿|🦵', 'shot|射击|🎯', 'shack|棚屋|🛖', 'shift|转移|⇧', 'shrimp|虾|🦐', 'mash|捣碎|🥔', 'rash|皮疹|🔴', 'dash|冲刺|🏃', 'fresh|新鲜的|🥬', 'flash|闪光|📸', 'trash|垃圾|🗑️', 'shush|嘘|🤫', 'shred|切碎|🥕', 'shrink|缩小|🔽', 'shrub|灌木|🌳'],
        sentences: ['The fish is in the dish.|鱼在盘子里。', 'Shh! Shut the shed.|嘘！把棚子关上。', 'I wish I had a ship.|我希望我有一艘船。', 'Brush the shell.|刷一刷贝壳。'],
      },
      {
        id: '4-2', title: 'ch / tch', en: 'ch tch /tʃ/',
        rule: '<b>ch</b> 读 /tʃ/。规律：紧跟在<b>短元音</b>后面的 /tʃ/ 通常拼作 <b>tch</b>（catch、match），其他位置拼作 <b>ch</b>（chin、lunch）。tch 中的 t 不单独发音。',
        cards: [{ g: 'ch', s: 'ch', kw: 'chip' }, { g: 'tch', s: 'ch', kw: 'catch' }],
        words: ['chin|下巴|🧔', 'chip|薯片|🍟', 'chop|砍|🪓', 'chick|小鸡|🐥', 'chest|箱子；胸口|🧰', 'rich|富有的|💰', 'lunch|午餐|🍱', 'bench|长凳|🪑', 'catch|接住|🧤', 'match|火柴；比赛|🔥', 'witch|女巫|🧙', 'itch|痒|🦟', 'chat|聊天|💬', 'check|检查|✅', 'chill|寒冷|🥶', 'chimp|黑猩猩|🦍', 'champ|冠军|🏆', 'much|很多|➕', 'inch|英寸|📏', 'pinch|捏|🤏', 'punch|拳击|👊', 'patch|补丁|🩹', 'fetch|取来|🐕', 'sketch|素描|✏️'],
        sentences: ['The chick is on the bench.|小鸡在长凳上。', 'Catch it!|接住它！', 'I had chips for lunch.|我午餐吃了薯片。', 'The witch has an itch.|女巫身上发痒。'],
      },
      {
        id: '4-3', title: 'th 清音与浊音', en: 'th /θ/ /ð/',
        rule: '<b>th</b> 有两种读音，舌尖都要轻放在上下门牙之间：<br>· 清音 /θ/（声带不振动）：thin、think、bath<br>· 浊音 /ð/（声带振动）：this、that、them —— 多见于高频功能词<br>中国学生常用 /s/ 或 /z/ 代替，一定要把舌尖伸出来。',
        cards: [{ g: 'th', s: 'th', kw: 'thin' }, { g: 'th', s: 'th_v', kw: 'this' }, { g: 'thr', s: ['th', 'r'], blend: true, kw: 'three' }],
        words: ['thin|瘦的|🥢', 'thick|厚的|📚', 'think|想|🤔', 'bath|洗澡|🛁', 'math|数学|➗', 'moth|飞蛾|🦋', 'path|小路|🛤️', 'this|这个|👇|th:th_v', 'that|那个|👉|th:th_v', 'them|他们|👥|th:th_v', 'then|然后|➡️|th:th_v', 'with|和……一起|🤝|th:th_v', 'thud|砰的一声|💥', 'thump|重击|🥁', 'thank|感谢|🙏', 'three|三|3️⃣', 'cloth|布|🧵', 'tenth|第十|🔟', 'sixth|第六|6️⃣', 'thrill|兴奋|🎢', 'than|比|⚖️|th:th_v', 'throw|扔|🤾', 'thread|线|🧵|ea:e_s', 'throne|王座|👑'],
        sentences: ['This is a thin moth.|这是一只瘦小的飞蛾。', 'I think that bath is hot.|我觉得那缸洗澡水很烫。', 'Then we ran up the path.|然后我们沿着小路跑上去。', 'Is this cloth thick?|这块布厚吗？'],
      },
      {
        id: '4-4', title: 'wh / ph', en: 'wh /w/  ph /f/',
        rule: '<b>wh</b> 在美式英语中读 /w/，常见于疑问词（when、which、what）。<b>ph</b> 读 /f/，多出现在源自希腊语的单词里（phone、photo、dolphin）。',
        cards: [{ g: 'wh', s: 'w', kw: 'when' }, { g: 'ph', s: 'f', kw: 'phone' }],
        words: ['when|什么时候|⏰', 'which|哪一个|❓', 'whip|鞭子|🪢', 'whisk|打蛋器|🥣', 'whale|鲸鱼|🐋', 'wheel|轮子|🛞', 'phone|电话|📱', 'photo|照片|📷|o:o_l', 'graph|图表|📈', 'dolphin|海豚|🐬', 'elephant|大象|🐘', 'alphabet|字母表|🔤', 'whack|重击|🔨', 'whiff|一股气味|👃', 'whiz|奇才|🧠', 'white|白色|⚪', 'wheat|小麦|🌾', 'phonics|自然拼读|🔤', 'trophy|奖杯|🏆|o:o_l', 'nephew|侄子|👦', 'physics|物理|⚛️'],
        sentences: ['When can we get a phone?|我们什么时候能买部手机？', 'Which dolphin can flip?|哪只海豚会翻跟头？', 'Phil has a photo of an elephant.|菲尔有一张大象的照片。', 'The whale is big.|鲸鱼很大。'],
      },
      {
        id: '4-5', title: 'ck / ng / nk', en: 'ck /k/  ng /ŋ/  nk /ŋk/',
        rule: '· <b>ck</b> 读 /k/，只出现在<b>短元音后面</b>（duck、kick）。<br>· <b>ng</b> 读 /ŋ/，舌根抵住软腭从鼻腔出气，g 不单独发音（sing 不读"sin-g"）。<br>· <b>nk</b> 读 /ŋk/，即 /ŋ/ 再加 /k/（pink、bank）。',
        cards: [{ g: 'ck', s: 'k', kw: 'duck' }, { g: 'ng', s: 'ng', kw: 'king' }, { g: 'nk', s: 'nk', kw: 'pink' }],
        words: ['duck|鸭子|🦆', 'sock|袜子|🧦', 'kick|踢|⚽', 'neck|脖子|🦒', 'king|国王|🤴', 'ring|戒指|💍', 'sing|唱歌|🎤', 'long|长的|📏', 'song|歌曲|🎵', 'pink|粉色|🩷', 'sink|水槽|🚰', 'bank|银行|🏦', 'back|背|🔙', 'pack|背包|🎒', 'rock|石头|🪨', 'lock|锁|🔒', 'luck|运气|🍀', 'wing|翅膀|🪽', 'swing|秋千|🛝', 'bang|砰|💥', 'lung|肺|🫁', 'drink|喝|🥤', 'trunk|象鼻|🐘', 'wink|眨眼|😉'],
        sentences: ['The king can sing a long song.|国王会唱一首很长的歌。', 'The duck has a pink sock.|鸭子有一只粉色袜子。', 'Kick it back!|把它踢回来！', 'Put the cup in the sink.|把杯子放进水槽。'],
      },
      {
        id: '4-6', title: 'ff / ll / ss / zz', en: 'The FLOSS Rule',
        rule: '<b>FLOSS 规则</b>：一个音节的单词，短元音后面紧跟 <b>f、l、s、z</b> 结尾时，这个字母通常要<b>双写</b>：puff、bell、kiss、buzz。双写的两个字母只发一个音。<br>常见例外：if、of、bus、gas、yes、this、has、is、his（多为高频词）。',
        cards: [{ g: 'ff', s: 'f', kw: 'puff' }, { g: 'll', s: 'l', kw: 'bell' }, { g: 'ss', s: 's', kw: 'kiss' }, { g: 'zz', s: 'z', kw: 'buzz' }],
        words: ['puff|一口气|💨', 'cliff|悬崖|🏔️', 'stuff|东西|📦', 'off|关掉|📴', 'cuff|袖口|👔', 'bell|铃|🔔', 'hill|小山|⛰️', 'doll|玩偶|🪆', 'well|井；好|🪣', 'fill|装满|🫗', 'tell|告诉|🗣️', 'kiss|亲吻|💋', 'mess|乱糟糟|🌀', 'boss|老板|👔', 'moss|苔藓|🌿', 'toss|抛|🪙', 'buzz|嗡嗡声|🐝', 'fizz|嘶嘶冒泡|🫧', 'fuzz|绒毛|🧸', 'jazz|爵士乐|🎷'],
        sentences: ['The bell is on the hill.|铃铛在小山上。', 'Bees buzz in the grass.|蜜蜂在草丛里嗡嗡叫。', 'Puff! The doll fell off the cliff.|噗！玩偶从悬崖上掉了下去。', 'Do not make a mess, boss!|老板，别弄得一团糟！'],
      },
      {
        id: '4-7', title: '-dge / -ge', en: '-dge /dʒ/ and -ge',
        rule: '词尾的 /dʒ/ 有两种拼法，规律和 tch / ch 一样：<br>· 紧跟在<b>短元音</b>后面用 <b>-dge</b>：badge、edge、bridge、fudge（d 不单独发音）<br>· 在长元音、辅音或其他组合后面用 <b>-ge</b>：page、huge、large、change<br>-ge 中的 e 不发音，但它让 g 读软音 /dʒ/。',
        cards: [{ g: 'dge', s: 'j', kw: 'bridge' }, { g: 'ge', s: 'j', kw: 'page', noMap: true }],
        words: ['badge|徽章|📛', 'edge|边缘|📐', 'hedge|树篱|🌳', 'ledge|窗台|🪟', 'bridge|桥|🌉', 'ridge|山脊|⛰️', 'fudge|乳脂软糖|🍫', 'judge|法官|⚖️', 'nudge|轻推|👉', 'lodge|小屋|🏠', 'dodge|躲闪|🤾', 'gadget|小工具|🔧|e:i_s', 'page|页|📄', 'cage|笼子|🦜', 'stage|舞台|🎭', 'huge|巨大的|🐳', 'large|大的|🐘', 'ch-a-n-g-e|改变|🔄|a:a_l', 'charge|充电|🔋', 's-p-o-n-g-e|海绵|🧽|o:u_s'],
        sentences: ['The judge has a badge.|法官有一枚徽章。', 'Walk to the edge of the bridge.|走到桥的边缘。', 'This huge cage is on the stage.|这个巨大的笼子在舞台上。', 'Dodge the sponge!|躲开海绵！'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 5, level: '进阶', title: '魔法 e', en: 'Magic e (Silent e)', weeks: 3, icon: '🪄',
    goal: '掌握"元音-辅音-e"规则：词尾 e 不发音，但让前面的元音读长音（字母名）；认识开音节和 kind old 例外。',
    intro: '在 <b>a_e、i_e、o_e、u_e、e_e</b> 结构里，词尾的 <b>e</b> 自己不发音，却像魔法棒一样，让前面的元音从<b>短音</b>变成<b>长音</b>——也就是读出这个字母的<b>名字</b>。<br>例：cap /kæp/ 帽子 → cape /keɪp/ 斗篷；kit → kite；hop → hope。',
    lessons: [
      {
        id: '5-1', title: 'a_e', en: 'Magic e: a_e /eɪ/',
        rule: 'a + 辅音 + e，a 读字母名 /eɪ/。点击下面的"对比"听短音和长音的区别。',
        cards: [{ g: 'a_e', s: 'a_l', kw: 'cake' }],
        pairs: ['cap>cape', 'tap>tape', 'can>cane', 'mad>made', 'hat>hate', 'plan>plane'],
        words: ['cake|蛋糕|🎂', 'cape|斗篷|🦸', 'gate|大门|🚪', 'lake|湖|🏞️', 'name|名字|📛', 'game|游戏|🎮', 'plate|盘子|🍽️', 'snake|蛇|🐍', 'wave|波浪|🌊', 'grape|葡萄|🍇', 'shape|形状|🔷', 'skate|滑冰|⛸️', 'tape|胶带|📼', 'cane|拐杖|🦯', 'plane|飞机|✈️', 'cave|洞穴|🕳️', 'bake|烘焙|🧁', 'face|脸|😀', 'race|赛跑|🏁', 'safe|安全的|🔒', 'vase|花瓶|🏺|s:s', 'gave|给（过去式）|🎁', 'same|相同的|🟰', 'date|日期|📅'],
        sentences: ['The snake is by the lake.|蛇在湖边。', 'Jane made a cake.|简做了一个蛋糕。', 'Put the grapes on the plate.|把葡萄放在盘子上。', 'A big wave came.|一个大浪打了过来。'],
      },
      {
        id: '5-2', title: 'i_e', en: 'Magic e: i_e /aɪ/',
        rule: 'i + 辅音 + e，i 读字母名 /aɪ/，像汉语"爱"。',
        cards: [{ g: 'i_e', s: 'i_l', kw: 'kite' }],
        pairs: ['kit>kite', 'pin>pine', 'rid>ride', 'bit>bite', 'slid>slide', 'fin>fine'],
        words: ['bike|自行车|🚲', 'kite|风筝|🪁', 'five|五|5️⃣', 'nine|九|9️⃣', 'time|时间|⏰', 'line|线|📏', 'pine|松树|🌲', 'smile|微笑|😊', 'slide|滑梯|🛝', 'prize|奖品|🏆', 'white|白色|⚪', 'ride|骑|🏇', 'bite|咬|😬', 'hide|躲藏|🙈', 'fine|好的|👌', 'rice|米饭|🍚', 'wide|宽的|↔️', 'hike|远足|🥾', 'dice|骰子|🎲', 'vine|藤|🍇', 'tide|潮汐|🌊', 'drive|驾驶|🚗', 'wise|聪明的|🦉', 'slime|黏液|🟢'],
        sentences: ['I ride my bike at five.|我五点骑自行车。', 'Mike has a white kite.|迈克有一只白色风筝。', 'Smile and slide!|笑一笑，滑下来！', 'It is time to line up.|该排队了。'],
      },
      {
        id: '5-3', title: 'o_e', en: 'Magic e: o_e /oʊ/',
        rule: 'o + 辅音 + e，o 读字母名 /oʊ/。注意：一些高频词例外，如 come、some、love、done 中的 o 读 /ʌ/。',
        cards: [{ g: 'o_e', s: 'o_l', kw: 'home' }],
        pairs: ['hop>hope', 'not>note', 'rod>rode', 'cod>code', 'rob>robe', 'glob>globe'],
        words: ['home|家|🏠', 'bone|骨头|🦴', 'rope|绳子|🪢', 'nose|鼻子|👃', 'rose|玫瑰|🌹', 'hole|洞|🕳️', 'note|便条|📝', 'stone|石头|🪨', 'globe|地球仪|🌍', 'smoke|烟|💨', 'phone|电话|📱', 'joke|笑话|😂', 'hope|希望|🌈', 'code|代码|💻', 'rode|骑（过去式）|🚲', 'robe|长袍|🥋', 'pole|杆子|🎏', 'cone|圆锥|🍦', 'dome|圆顶|🕌', 'vote|投票|🗳️', 'stove|炉子|🔥', 'froze|冻住（过去式）|🥶', 'broke|弄坏（过去式）|💔', 'those|那些|👉|th:th_v'],
        sentences: ['The dog has a bone.|狗有一根骨头。', 'Rose left a note at home.|罗斯在家里留了张便条。', 'Jump the rope!|跳绳吧！', 'Smell the rose with your nose.|用鼻子闻闻玫瑰。'],
      },
      {
        id: '5-4', title: 'u_e / e_e', en: 'Magic e: u_e /juː/ /uː/, e_e /iː/',
        rule: '· <b>u_e</b> 通常读字母名 /juː/（cube、cute）；在 j、r、l、fl 等后面常读 /uː/（June、rule、flute）。<br>· <b>e_e</b> 读 /iː/，单词较少（these、Pete、theme）。',
        cards: [{ g: 'u_e', s: 'u_l', kw: 'cube' }, { g: 'u_e', s: 'oo_l', kw: 'flute' }, { g: 'e_e', s: 'e_l', kw: 'these' }],
        pairs: ['cub>cube', 'cut>cute', 'tub>tube', 'us>use', 'pet>Pete'],
        words: ['cube|立方体|🧊', 'cute|可爱的|🥰', 'mule|骡子|🫏', 'huge|巨大的|🐳', 'use|使用|🛠️|s:z', 'June|六月|📅|u_e:oo_l', 'flute|长笛|🪈|u_e:oo_l', 'rule|规则|📏|u_e:oo_l', 'tune|曲调|🎶|u_e:oo_l', 'these|这些|👇|th:th_v', 'Pete|皮特（人名）|👦', 'theme|主题|🎨', 'mute|静音|🔇', 'fuse|保险丝|⚡', 'dune|沙丘|🏜️|u_e:oo_l', 'prune|西梅干|🫐|u_e:oo_l', 'rude|粗鲁的|😤|u_e:oo_l', 'tube|管子|🧪|u_e:oo_l', 'duke|公爵|🤴|u_e:oo_l', 'plume|羽毛|🪶|u_e:oo_l', 'Steve|史蒂夫（人名）|👨', 'sc-e-n-e|场景|🎬|sc:s'],
        sentences: ['The cute mule has a huge nose.|可爱的骡子有一个大鼻子。', 'Pete can play a tune on the flute.|皮特能用长笛吹一首曲子。', 'These cubes are white.|这些方块是白色的。', 'Use the rules.|遵守规则。'],
      },
      {
        id: '5-5', title: '开音节与 kind old 例外', en: 'Open Syllables & Kind-Old Words',
        rule: '① <b>开音节</b>：单词（或音节）以元音结尾，元音读<b>长音</b>（字母名）：go、no、me、he、she、hi。<br>② <b>kind old 例外</b>：有些闭音节单词的元音也读长音，记住这几组词尾：<b>-ild</b>（wild、child）、<b>-ind</b>（kind、find）、<b>-old</b>（cold、gold）、<b>-olt</b>（bolt）、<b>-ost</b>（most、post）。口诀："kind old words"。注意 lost、cost 读短音。',
        cards: [{ g: 'o', s: 'o_l', kw: 'go' }, { g: 'e', s: 'e_l', kw: 'me' }, { g: 'i', s: 'i_l', kw: 'hi' },
          { g: 'ild', s: ['i_l', 'l', 'd'], blend: true, kw: 'child' }, { g: 'ind', s: ['i_l', 'n', 'd'], blend: true, kw: 'kind' },
          { g: 'old', s: ['o_l', 'l', 'd'], blend: true, kw: 'cold' }, { g: 'ost', s: ['o_l', 's', 't'], blend: true, kw: 'most' }],
        words: ['go|去|🚶', 'no|不|🙅', 'so|所以|➡️', 'me|我|🙋', 'he|他|👦', 'she|她|👧', 'we|我们|👫', 'hi|你好|👋', 'wild|野生的|🐺', 'child|孩子|🧒', 'mild|温和的|🌤️', 'kind|善良的|💗', 'find|找到|🔍', 'mind|头脑|🧠', 'blind|盲的|🦯', 'cold|冷的|🥶', 'gold|金子|🥇', 'told|告诉（过去式）|🗣️', 'bolt|闪电；螺栓|⚡', 'most|大多数|📊', 'post|邮寄|📮', 'host|主人|🎤'],
        sentences: ['Go and find the gold!|去找金子吧！', 'The child is very kind.|这个孩子非常善良。', 'It is cold in the wild.|野外很冷。', 'Hi! She told me so.|嗨！她是这么跟我说的。'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 6, level: '进阶', title: '元音组合', en: 'Vowel Teams', weeks: 4, icon: '👯',
    goal: '掌握 ai/ay、ee/ea、oa/ow、ie/igh、oo、ue/ew、y 等元音组合，以及 eigh、ei、ie、ui、ou 等少见拼法。',
    intro: '两个字母组合在一起表示一个元音，叫做<b>元音组合</b>(vowel team)。有一句口诀：<b>"When two vowels go walking, the first one does the talking."</b>（两个元音一起走，第一个说话，第二个不开口）——第一个元音读它的名字，第二个不发音，如 rain、boat、seat。口诀适用于大多数情况，但不是全部（如 oo、ow），需要结合单词记忆。',
    lessons: [
      {
        id: '6-1', title: 'ai / ay', en: 'ai ay /eɪ/',
        rule: '<b>ai</b> 和 <b>ay</b> 都读 /eɪ/。位置规律：<b>ai</b> 在单词中间（rain、tail），<b>ay</b> 在单词末尾（day、play）。英语单词很少以 i 结尾，所以词尾用 y 代替。',
        cards: [{ g: 'ai', s: 'a_l', kw: 'rain' }, { g: 'ay', s: 'a_l', kw: 'day' }],
        words: ['rain|雨|🌧️', 'train|火车|🚆', 'snail|蜗牛|🐌', 'tail|尾巴|🐕', 'mail|邮件|📬', 'paint|颜料；画|🎨', 'wait|等待|⏳', 'day|天|☀️', 'play|玩|🎮', 'tray|托盘|🍱', 'gray|灰色|🩶', 'hay|干草|🌾', 'nail|钉子；指甲|💅', 'sail|航行|⛵', 'pail|桶|🪣', 'brain|大脑|🧠', 'chain|链子|⛓️', 'say|说|🗣️', 'pay|付钱|💳', 'way|路|🛣️', 'spray|喷|🧴', 'clay|黏土|🏺', 'stay|停留|🏠', 'Sunday|星期天|📅'],
        sentences: ['The snail is in the rain.|蜗牛在雨中。', 'Can we play today?|我们今天能玩吗？', 'Wait for the train.|等火车。', 'Paint the tray gray.|把托盘涂成灰色。'],
      },
      {
        id: '6-2', title: 'ee / ea', en: 'ee ea /iː/',
        rule: '<b>ee</b> 和 <b>ea</b> 通常都读 /iː/（tree、sea）。<b>ea</b> 有时读短音 /ɛ/，如 bread、head、feather——遇到时要特别记忆。',
        cards: [{ g: 'ee', s: 'e_l', kw: 'tree' }, { g: 'ea', s: 'e_l', kw: 'sea' }, { g: 'ea', s: 'e_s', kw: 'bread' }],
        words: ['bee|蜜蜂|🐝', 'tree|树|🌳', 'feet|脚（复数）|🦶', 'green|绿色|🟢', 'sheep|绵羊|🐑', 'sleep|睡觉|😴', 'sea|大海|🌊', 'eat|吃|🍽️', 'leaf|叶子|🍃', 'peach|桃子|🍑', 'beach|海滩|🏖️', 'bread|面包|🍞|ea:e_s', 'head|头|🗣️|ea:e_s', 'seed|种子|🌱', 'feed|喂|🍼', 'week|星期|📅', 'queen|女王|👸', 'teeth|牙齿|🦷', 'seat|座位|💺', 'meat|肉|🥩', 'team|团队|👥', 'dream|梦|💭', 'tea|茶|🍵', 'bean|豆子|🫘', 'feather|羽毛|🪶|ea:e_s,th:th_v'],
        sentences: ['Three green trees.|三棵绿树。', 'We eat peaches on the beach.|我们在海滩上吃桃子。', 'A bee is on the leaf.|一只蜜蜂在叶子上。', 'The sheep sleep by the sea.|绵羊在海边睡觉。'],
      },
      {
        id: '6-3', title: 'oa / ow / oe', en: 'oa ow oe /oʊ/',
        rule: '<b>oa</b>（词中）、<b>ow</b>（词尾）、<b>oe</b> 都读 /oʊ/；少数单词里 <b>ou</b> 也读 /oʊ/（soul、shoulder）。注意 <b>ow</b> 还有另一个读音 /aʊ/（cow），会在第 8 阶段学习。',
        cards: [{ g: 'oa', s: 'o_l', kw: 'boat' }, { g: 'ow', s: 'o_l', kw: 'snow' }, { g: 'oe', s: 'o_l', kw: 'toe' }, { g: 'ou', s: 'o_l', kw: 'soul' }],
        words: ['boat|船|⛵', 'goat|山羊|🐐', 'coat|外套|🧥', 'road|路|🛣️', 'soap|肥皂|🧼', 'toast|吐司|🍞', 'snow|雪|❄️', 'slow|慢的|🐢', 'grow|生长|🌱', 'yellow|黄色|🟡', 'window|窗户|🪟', 'toe|脚趾|🦶', 'loaf|一条面包|🍞', 'float|漂浮|🛟', 'throat|喉咙|🗣️', 'coach|教练|🧑‍🏫', 'oak|橡树|🌳', 'roast|烤|🍗', 'blow|吹|🌬️', 'show|展示|🎪', 'bowl|碗|🥣', 'crow|乌鸦|🐦‍⬛', 'pillow|枕头|🛏️', 'goal|目标|🥅', 'soul|灵魂|✨', 'shoulder|肩膀|💪', 'boulder|巨石|🪨'],
        sentences: ['The goat is on the boat.|山羊在船上。', 'Put on your coat in the snow.|下雪时穿上外套。', 'Grow, grow, little seed!|长啊长，小种子！', 'Joe has a yellow coat.|乔有一件黄色外套。'],
      },
      {
        id: '6-4', title: 'ie / igh / y', en: 'ie igh y /aɪ/',
        rule: '<b>ie</b>、<b>igh</b>、以及短单词结尾的 <b>y</b> 都读 /aɪ/。igh 中的 gh 不发音。y 读 /aɪ/ 的条件：单词只有一个音节且 y 在结尾（my、fly、sky）。',
        cards: [{ g: 'ie', s: 'i_l', kw: 'pie' }, { g: 'igh', s: 'i_l', kw: 'night' }, { g: 'y', s: 'i_l', kw: 'fly' }],
        words: ['pie|派|🥧', 'tie|领带|👔', 'lie|躺；说谎|🛌', 'light|光；灯|💡', 'night|夜晚|🌙', 'right|对的；右边|➡️', 'high|高的|🏔️', 'bright|明亮的|🌟', 'my|我的|🙋', 'fly|飞|🪰', 'sky|天空|🌌', 'cry|哭|😢', 'fries|薯条|🍟|s:z', 'cried|哭（过去式）|😭', 'sigh|叹气|😮‍💨', 'fight|打架|🥊', 'tight|紧的|🪢', 'flight|航班|✈️', 'knight|骑士|🛡️', 'thigh|大腿|🦵', 'dry|干的|☀️', 'shy|害羞的|😳', 'spy|间谍|🕵️', 'why|为什么|❓'],
        sentences: ['The kite is high in the sky.|风筝高高地飞在天上。', 'Why do you cry at night?|你为什么晚上哭？', 'Try my pie!|尝尝我的派！', 'The light is bright.|灯光很亮。'],
      },
      {
        id: '6-5', title: 'oo / ue / ew', en: 'oo /uː/ /ʊ/, ue ew /uː/',
        rule: '· <b>oo</b> 有长短两种读音：长音 /uː/（moon、zoo）和短音 /ʊ/（book、look）。oo 后面跟 <b>k</b> 时多读短音。<br>· <b>ue</b>、<b>ew</b> 读 /uː/（blue、new），有时读 /juː/（few、cue）。',
        cards: [{ g: 'oo', s: 'oo_l', kw: 'moon' }, { g: 'oo', s: 'oo_s', kw: 'book' }, { g: 'ue', s: 'oo_l', kw: 'blue' }, { g: 'ew', s: 'oo_l', kw: 'new' }],
        words: ['moon|月亮|🌙', 'spoon|勺子|🥄', 'zoo|动物园|🦁', 'boot|靴子|👢', 'pool|游泳池|🏊', 'book|书|📖|oo:oo_s', 'look|看|👀|oo:oo_s', 'cook|厨师；做饭|🧑‍🍳|oo:oo_s', 'foot|脚|🦶|oo:oo_s', 'good|好的|👍|oo:oo_s', 'blue|蓝色|🔵', 'glue|胶水|🧴', 'new|新的|🆕', 'chew|咀嚼|😬', 'food|食物|🍲', 'room|房间|🚪', 'broom|扫帚|🧹', 'tooth|牙齿|🦷', 'goose|鹅|🪿', 'wood|木头|🪵|oo:oo_s', 'hook|钩子|🪝|oo:oo_s', 'wool|羊毛|🧶|oo:oo_s', 'hood|兜帽|🧥|oo:oo_s', 'clue|线索|🔍', 'flew|飞（过去式）|🕊️', 'stew|炖菜|🍲'],
        sentences: ['Look at the moon!|看月亮！', 'The cook has a good book.|厨师有一本好书。', 'I have new blue boots.|我有一双新的蓝靴子。', 'We went to the zoo at noon.|我们中午去了动物园。'],
      },
      {
        id: '6-6', title: 'y / ey 读 /i/ 与 y 读 /ɪ/', en: 'y ey /i/, y /ɪ/',
        rule: '在<b>两个及以上音节</b>的单词结尾，<b>y</b> 读 /i/（happy、baby）。<b>ey</b> 在词尾也常读 /i/（key、monkey）。对比上一课：一个音节的 my、fly 中 y 读 /aɪ/。<br><b>y</b> 夹在辅音中间时读短音 /ɪ/，相当于字母 i（gym、myth、system）。',
        cards: [{ g: 'y', s: 'e_l', kw: 'happy' }, { g: 'ey', s: 'e_l', kw: 'key' }, { g: 'y', s: 'i_s', kw: 'gym' }],
        words: ['happy|快乐的|😊', 'baby|婴儿|👶|a:a_l', 'funny|好笑的|🤣', 'puppy|小狗|🐶', 'candy|糖果|🍬', 'sunny|晴朗的|☀️', 'bunny|兔子|🐰', 'lady|女士|👩|a:a_l', 'key|钥匙|🔑', 'monkey|猴子|🐒|o:u_s', 'honey|蜂蜜|🍯|o:u_s', 'donkey|驴|🫏', 'jelly|果冻|🍮', 'kitty|小猫|🐱', 'pony|小马|🐴|o:o_l', 'silly|傻傻的|🤪', 'penny|一分钱|🪙', 'teddy|泰迪熊|🧸', 'b-e-rr-y|浆果|🍓', 'story|故事|📖', 'body|身体|🧍', 'turkey|火鸡|🦃', 'valley|山谷|🏞️', 'chimney|烟囱|🏠', 'gym|健身房|🏋️|g:j,y:i_s', 'myth|神话|🐉|y:i_s', 'system|系统|🖥️|y:i_s,e:schwa', 'crystal|水晶|💎|y:i_s,a:schwa'],
        sentences: ['The baby is happy.|宝宝很开心。', 'A funny monkey ate the candy.|一只滑稽的猴子吃了糖果。', 'It is a sunny day.|今天是晴天。', 'The bunny has a key.|兔子有一把钥匙。'],
      },
      {
        id: '6-7', title: 'eigh / ei / ey / ea 读 /eɪ/', en: 'More /eɪ/: eigh ei ey ea',
        rule: '除了 ai、ay、a_e，/eɪ/ 还有几种少见的拼法，单词不多，整体记忆即可：<br>· <b>eigh</b>：eight、weigh、neighbor（gh 不发音）<br>· <b>ei</b>：vein、rein、beige<br>· <b>ey</b>：they、grey、obey<br>· <b>ea</b>：great、break、steak',
        cards: [{ g: 'eigh', s: 'a_l', kw: 'eight' }, { g: 'ei', s: 'a_l', kw: 'vein' }, { g: 'ey', s: 'a_l', kw: 'they' }, { g: 'ea', s: 'a_l', kw: 'great' }],
        words: ['eight|八|8️⃣', 'eighty|八十|💯', 'weigh|称重|⚖️', 'weight|重量|🏋️', 'sleigh|雪橇|🛷', 'neighbor|邻居|🏘️|or:er', 'freight|货运|🚚', 'vein|静脉|🩸', 'rein|缰绳|🐴', 'beige|米色|🟫|g:zh', 'they|他们|👥|th:th_v', 'grey|灰色|🩶', 'obey|服从|🫡|o:o_l', 'prey|猎物|🦌', 'hey|嘿|👋', 'great|伟大的|🌟', 'break|打破|💔', 'steak|牛排|🥩'],
        sentences: ['They weigh eight steaks.|他们称了八块牛排。', 'My neighbor has a grey sleigh.|我的邻居有一架灰色雪橇。', 'Do not break the reins.|别弄断缰绳。', 'It is a great day.|今天真棒。'],
      },
      {
        id: '6-8', title: 'ie / ei 读 /iː/', en: 'ie ei /iː/',
        rule: '<b>ie</b> 和 <b>ei</b> 也可以读 /iː/。拼写口诀：<b>"i before e, except after c"</b>——通常写 ie（field、chief），在 c 后面写 ei（receive、ceiling）。<br>例外要单独记：seize、protein、weird（weird 读 /wɪrd/）。',
        cards: [{ g: 'ie', s: 'e_l', kw: 'field' }, { g: 'ei', s: 'e_l', kw: 'ceiling' }],
        words: ['field|田野|🌾', 'chief|首领|🪶', 'thief|小偷|🦹', 'brief|简短的|📝', 'piece|一块|🧩', 'niece|侄女|👧', 'shield|盾牌|🛡️', 'yield|让行|⚠️', 'belief|信念|🙏|e:i_s', 'grief|悲伤|😢', 'priest|牧师|⛪', 'shriek|尖叫|😱', 'receive|收到|📬|e#1:i_s', 'ceiling|天花板|🏠', 'deceive|欺骗|🎭|e#1:i_s', 'receipt|收据|🧾|e:i_s,p:silent', 'seize|抓住|✊', 'protein|蛋白质|🥚|o:o_l', 'weird|奇怪的|🤪|ei:ear,r:silent'],
        sentences: ['The thief ran across the field.|小偷跑过了田野。', 'Have a piece of cake.|吃一块蛋糕吧。', 'Did you receive my letter?|你收到我的信了吗？', 'The chief has a big shield.|首领有一面大盾牌。'],
      },
      {
        id: '6-9', title: 'ui / ou 读 /uː/', en: 'ui ou /uː/',
        rule: '/uː/ 除了 oo、ue、ew、u_e 之外，还有两种拼法：<br>· <b>ui</b>：fruit、juice、suit（注意 build、guitar 里的 u 不发音，见第 9 阶段）<br>· <b>ou</b>：soup、group、you、youth（ou 最常见的读音是 /aʊ/，如 house）',
        cards: [{ g: 'ui', s: 'oo_l', kw: 'fruit' }, { g: 'ou', s: 'oo_l', kw: 'soup' }],
        words: ['fruit|水果|🍎', 'juice|果汁|🧃', 'juicy|多汁的|🍊', 'suit|西装|🤵', 'suitcase|手提箱|🧳|s:s', 'bruise|淤青|🤕|s:z', 'cruise|巡航|🛳️|s:z', 'soup|汤|🍲', 'group|小组|👥', 'you|你|🙋', 'youth|青年|🧑', 'coupon|优惠券|🎟️', 'route|路线|🗺️', 'routine|日常|📅|i:e_l', 'toucan|巨嘴鸟|🦜'],
        sentences: ['I like fruit and soup.|我喜欢水果和汤。', 'Our group went on a cruise.|我们小组去坐了游轮。', 'You have a bruise on your leg.|你腿上有一块淤青。', 'Pack your suit in the suitcase.|把西装装进手提箱。'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 7, level: '进阶', title: 'R 控制元音', en: 'R-Controlled Vowels', weeks: 3, icon: '🏴‍☠️',
    goal: '掌握 ar、or、er/ir/ur、air/are、ear/eer、ire、ure、our、oar/oor 等 R 控制元音，以及 w 对它们的影响。',
    intro: '当元音后面紧跟字母 <b>r</b> 时，元音被 r "控制"，既不读短音也不读长音，而是变成一个新的音（美式发音要卷舌）。有人把 ar 叫做"海盗音"，因为海盗总是喊 "Arrr!"。',
    lessons: [
      {
        id: '7-1', title: 'ar', en: 'ar /ɑr/',
        rule: '<b>ar</b> 读 /ɑr/：先张大嘴发"啊"，再把舌尖卷起来。和字母 R 的名字读音一样。',
        cards: [{ g: 'ar', s: 'ar', kw: 'car' }],
        words: ['car|汽车|🚗', 'star|星星|⭐', 'park|公园|🏞️', 'farm|农场|🚜', 'card|卡片|🃏', 'jar|罐子|🫙', 'shark|鲨鱼|🦈', 'arm|手臂|💪', 'dark|黑暗的|🌑', 'yard|院子|🏡', 'art|艺术|🎨', 'barn|谷仓|🛖', 'cart|手推车|🛒', 'dart|飞镖|🎯', 'harp|竖琴|🪕', 'scarf|围巾|🧣', 'march|行进|🥁', 'smart|聪明的|🧠', 'start|开始|▶️', 'party|派对|🎉', 'garden|花园|🌷', 'sharp|锋利的|🔪', 'spark|火花|✨', 'bark|狗叫|🐕'],
        sentences: ['The car is in the park.|汽车在公园里。', 'A star in the dark sky.|黑暗夜空中的一颗星星。', 'The farm has a big barn.|农场有一个大谷仓。', 'Mark has a jar of jam.|马克有一罐果酱。'],
      },
      {
        id: '7-2', title: 'or / ore', en: 'or ore /ɔr/',
        rule: '<b>or</b> 和 <b>ore</b> 读 /ɔr/：先发圆唇的"哦"，再卷舌。ore 中的 e 不发音。注意 w 后面的 or 常读 /ɝ/（word、work）。',
        cards: [{ g: 'or', s: 'or', kw: 'fork' }, { g: 'ore', s: 'or', kw: 'store' }],
        words: ['fork|叉子|🍴', 'corn|玉米|🌽', 'horn|角；喇叭|📯', 'horse|马|🐴', 'storm|暴风雨|⛈️', 'short|短的|📏', 'sport|运动|🏅', 'north|北方|🧭', 'more|更多|➕', 'store|商店|🏬', 'snore|打鼾|😴', 'shore|海岸|🏖️', 'born|出生|👶', 'cord|绳子|🪢', 'fort|堡垒|🏰', 'port|港口|⚓', 'sort|分类|🗂️', 'torch|火炬|🔦', 'thorn|刺|🌹', 'porch|门廊|🏡', 'sore|疼痛的|🤕', 'core|果核|🍎', 'wore|穿（过去式）|👕', 'chore|家务|🧹'],
        sentences: ['The horse eats corn.|马吃玉米。', 'Get more forks from the store.|从商店多拿几把叉子。', 'A storm hit the shore.|暴风雨袭击了海岸。', 'Dad can snore!|爸爸会打呼噜！'],
      },
      {
        id: '7-3', title: 'er / ir / ur', en: 'er ir ur /ɝ/',
        rule: '<b>er、ir、ur</b> 三种拼法读<b>完全相同</b>的音 /ɝ/：嘴巴微张，舌尖卷起悬空。由于听音无法判断拼法，需要通过多读多写记住每个单词用哪一种。',
        cards: [{ g: 'er', s: 'er', kw: 'her' }, { g: 'ir', s: 'er', kw: 'bird' }, { g: 'ur', s: 'er', kw: 'nurse' }],
        words: ['her|她的|👩', 'fern|蕨类|🌿', 'herb|香草|🌱|h:silent', 'bird|鸟|🐦', 'girl|女孩|👧', 'shirt|衬衫|👕', 'first|第一|🥇', 'skirt|裙子|👗', 'nurse|护士|👩‍⚕️', 'turtle|乌龟|🐢', 'purple|紫色|🟣', 'burn|燃烧|🔥', 'perch|栖息|🐦', 'clerk|职员|🧾', 'germ|细菌|🦠|g:j', 'dirt|泥土|🟫', 'stir|搅拌|🥄', 'swirl|漩涡|🌀', 'third|第三|🥉', 'thirsty|口渴的|🥤', 'fur|毛皮|🐻', 'curl|卷发|➰', 'church|教堂|⛪', 'surf|冲浪|🏄'],
        sentences: ['The girl has a purple shirt.|女孩有一件紫色衬衫。', 'The bird is first!|小鸟是第一名！', 'Her sister is a nurse.|她的姐姐是护士。', 'The turtle did not get hurt.|乌龟没有受伤。'],
      },
      {
        id: '7-4', title: 'air / are / ear / eer', en: 'air are /ɛr/, ear eer /ɪr/',
        rule: '· <b>air、are</b>（以及少数 <b>ear</b>，如 bear、pear）读 /ɛr/：先发"哎"再卷舌。<br>· <b>ear、eer</b> 通常读 /ɪr/：先发短"一"再卷舌（ear、deer）。',
        cards: [{ g: 'air', s: 'air', kw: 'chair' }, { g: 'are', s: 'air', kw: 'square' }, { g: 'ear', s: 'ear', kw: 'ear' }, { g: 'eer', s: 'ear', kw: 'deer' }],
        words: ['hair|头发|💇', 'chair|椅子|🪑', 'pair|一双|🧦', 'stairs|楼梯|🪜', 'care|关心|❤️', 'share|分享|🤲', 'square|正方形|⬛', 'bear|熊|🐻|ear:air', 'pear|梨|🍐|ear:air', 'ear|耳朵|👂', 'hear|听见|🎧', 'near|近的|📍', 'deer|鹿|🦌', 'cheer|欢呼|📣', 'fair|集市|🎡', 'air|空气|💨', 'dare|敢|😤', 'scare|吓唬|😱', 'spare|备用的|🛞', 'wear|穿|👕|ear:air', 'tear|眼泪|💧', 'fear|害怕|😨', 'clear|清楚的|🔍', 'beard|胡子|🧔', 'steer|驾驶|🛞', 'year|年|📅'],
        sentences: ['The bear sat on the chair.|熊坐在椅子上。', 'Share the pear with me.|和我分享这个梨吧。', 'I can hear the deer near the tree.|我能听见树旁的鹿。', 'Cheer for the new year!|为新年欢呼！'],
      },
      {
        id: '7-5', title: 'war / wor / ear 读 /ɝ/', en: 'war wor, ear /ɝ/',
        rule: '字母 <b>w</b> 会改变后面 R 控制元音的读音：<br>· <b>war</b> 读 /wɔr/：warm、warn、reward（不读 /wɑr/）<br>· <b>wor</b> 读 /wɝ/：word、work、world（不读 /wɔr/）<br>另外，<b>ear</b> 在 learn、earth、early、pearl 中读 /ɝ/，和 er / ir / ur 一样。',
        cards: [{ g: 'ar', s: 'or', kw: 'warm' }, { g: 'or', s: 'er', kw: 'word' }, { g: 'ear', s: 'er', kw: 'learn' }],
        words: ['war|战争|⚔️', 'warm|温暖的|☀️', 'warn|警告|⚠️', 'ward|病房|🏥', 'swarm|一群|🐝', 'dwarf|矮人|🧙', 'r-e-w-ar-d|奖励|🏅|e:i_s', 't-o-w-ar-d|朝向|➡️|o:schwa', 'word|单词|🔤', 'work|工作|💼', 'world|世界|🌍', 'worm|虫子|🪱', 'worth|值得|💰', 'worse|更糟|📉', 'worst|最糟|👎', 'learn|学习|📚', 'earth|地球|🌏', 'early|早的|🌅', 'pearl|珍珠|🦪', 'heard|听见（过去式）|👂', 'search|搜索|🔍', 'earn|挣钱|💵'],
        sentences: ['The worm is warm in the earth.|虫子在泥土里很暖和。', 'Learn a new word every day.|每天学一个新单词。', 'I heard a swarm of bees.|我听到一群蜜蜂的声音。', 'Work hard and earn a reward.|努力工作，赢得奖励。'],
      },
      {
        id: '7-6', title: 'ire / ure / our / oar / oor', en: 'ire ure our oar oor',
        rule: '更多 R 控制组合：<br>· <b>ire</b> 读 /aɪr/：fire、tire、wire<br>· <b>ure</b> 读 /jʊr/：pure、cure、secure<br>· <b>our</b> 读 /aʊr/：sour、flour、hour（但在 four、your 中读 /ɔr/）<br>· <b>oar、oor</b> 读 /ɔr/：board、roar、door、floor',
        cards: [{ g: 'ire', s: 'ire', kw: 'fire', tip: '先发长音 i /aɪ/，再卷舌，像"爱-儿"。' }, { g: 'ure', s: 'ure', kw: 'pure', tip: '先发 /ju/（字母 U），再卷舌。' },
          { g: 'our', s: 'our', kw: 'sour', tip: '先发 /aʊ/（像"凹"），再卷舌。' }, { g: 'oar', s: 'or', kw: 'board' }, { g: 'oor', s: 'or', kw: 'door' }],
        words: ['fire|火|🔥', 'tire|轮胎|🛞', 'wire|电线|🔌', 'hire|雇用|🤝', 'tired|累的|😩', 'admire|钦佩|👏', 'pure|纯净的|💧', 'cure|治愈|💊', 'secure|安全的|🔒|e:i_s', 'sour|酸的|🍋', 'flour|面粉|🌾', 'hour|小时|⏰|h:silent', 'our|我们的|👨‍👩‍👧', 'four|四|4️⃣|our:or', 'your|你的|👉|our:or', 'board|木板|🪵', 'roar|吼叫|🦁', 'soar|翱翔|🦅', 'oar|船桨|🚣', 'door|门|🚪', 'floor|地板|🟫', 'poor|贫穷的|🥺'],
        sentences: ['Sit by the fire for an hour.|在火边坐一个小时。', 'The lion can roar at the door.|狮子会在门口吼叫。', 'This lemon is sour.|这个柠檬很酸。', 'Put four boards on the floor.|在地板上放四块木板。'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 8, level: '高级', title: '双元音与特殊元音', en: 'Diphthongs & Other Vowels', weeks: 3, icon: '🎭',
    goal: '掌握 oi/oy、ou/ow、au/aw/al 三组元音组合，元音字母的"意外"读音，以及 ough / augh。',
    intro: '<b>双元音</b>(diphthong) 是从一个元音<b>滑向</b>另一个元音，发音时嘴型会变化。比如 /ɔɪ/ 从"哦"滑到"一"，/aʊ/ 从"啊"滑到"乌"。读的时候要饱满，把滑动的过程读出来。',
    lessons: [
      {
        id: '8-1', title: 'oi / oy', en: 'oi oy /ɔɪ/',
        rule: '<b>oi</b> 和 <b>oy</b> 都读 /ɔɪ/。位置规律和 ai/ay 一样：<b>oi</b> 在词中（coin、soil），<b>oy</b> 在词尾（boy、toy）。',
        cards: [{ g: 'oi', s: 'oi', kw: 'coin' }, { g: 'oy', s: 'oi', kw: 'boy' }],
        words: ['oil|油|🛢️', 'coin|硬币|🪙', 'point|指；点|👉', 'soil|土壤|🟫', 'join|加入|🤝', 'boil|煮沸|♨️', 'noise|噪音|📢|s:z', 'boy|男孩|👦', 'toy|玩具|🧸', 'joy|欢乐|😄', 'enjoy|享受|🥳', 'oyster|牡蛎|🦪', 'foil|锡箔|🍫', 'spoil|宠坏|🍼', 'coil|线圈|🌀', 'moist|潮湿的|💧', 'voice|声音|🗣️', 'choice|选择|☑️', 'toilet|厕所|🚽', 'avoid|避免|🚫|a:schwa', 'soy|大豆|🫘', 'annoy|惹恼|😤|a:schwa', 'destroy|破坏|💥|e:i_s', 'cowboy|牛仔|🤠|ow:ow'],
        sentences: ['The boy has a toy.|男孩有一个玩具。', 'Point at the coin.|指一指那枚硬币。', 'Boil the soup? Join me!|煮汤吗？一起来！', 'We enjoy the noise and joy.|我们享受这份热闹与欢乐。'],
      },
      {
        id: '8-2', title: 'ou / ow', en: 'ou ow /aʊ/',
        rule: '<b>ou</b> 和 <b>ow</b> 读 /aʊ/，像被扎到时喊"嗷"。<b>ou</b> 多在词中（house、cloud），<b>ow</b> 多在词尾或 n、l 前（cow、town、owl）。<br>⚠️ ow 还可以读 /oʊ/（snow），遇到时要结合单词判断。',
        cards: [{ g: 'ou', s: 'ow', kw: 'house' }, { g: 'ow', s: 'ow', kw: 'cow' }],
        words: ['out|出去|🚪', 'house|房子|🏠', 'mouse|老鼠|🐭', 'cloud|云|☁️', 'loud|大声的|📢', 'mouth|嘴|👄', 'round|圆的|⚪', 'cow|奶牛|🐄', 'owl|猫头鹰|🦉', 'town|城镇|🏘️', 'clown|小丑|🤡', 'brown|棕色|🟤', 'shout|大喊|📣', 'count|数数|🔢', 'found|找到（过去式）|🔍', 'ground|地面|🟫', 'south|南方|🧭', 'couch|沙发|🛋️', 'sound|声音|🔊', 'crown|王冠|👑', 'frown|皱眉|😠', 'towel|毛巾|🧻', 'flower|花|🌸', 'shower|淋浴|🚿'],
        sentences: ['The mouse is in the house.|老鼠在房子里。', 'A brown cow is in town.|一头棕色奶牛在镇上。', 'The clown is loud!|小丑好吵！', 'Look at the round cloud.|看那朵圆圆的云。'],
      },
      {
        id: '8-3', title: 'au / aw / al', en: 'au aw al /ɔː/',
        rule: '<b>au、aw、al</b> 都读 /ɔː/（美式常接近 /ɑ/）。au 在词中（sauce），aw 在词尾或 n、l 前（saw、yawn）。<b>al</b> 常见于 all、alk、alt 组合（ball、walk、salt），其中 walk、talk 的 l 不发音。',
        cards: [{ g: 'au', s: 'aw', kw: 'sauce' }, { g: 'aw', s: 'aw', kw: 'saw' }, { g: 'al', s: 'aw', kw: 'ball' }],
        words: ['saw|看见（过去式）；锯|🪚', 'paw|爪子|🐾', 'draw|画画|✏️', 'straw|吸管|🥤', 'yawn|打哈欠|🥱', 'crawl|爬|🐛', 'sauce|酱汁|🥫', 'August|八月|📅', 'ball|球|⚽', 'tall|高的|🦒', 'walk|走路|🚶', 'salt|盐|🧂', 'hawk|鹰|🦅', 'lawn|草坪|🌱', 'jaw|下巴|🦷', 'claw|爪|🦞', 'haul|拖运|🚛', 'launch|发射|🚀', 'fault|过错|⚠️', 'talk|说话|🗣️', 'chalk|粉笔|🖍️', 'small|小的|🤏', 'fall|落下|🍂', 'wall|墙|🧱'],
        sentences: ['The cat has a soft paw.|猫有一只柔软的爪子。', 'I saw a tall wall.|我看到一堵高墙。', 'Let us walk and talk.|我们边走边聊吧。', 'Put salt in the sauce.|在酱汁里放盐。'],
      },
      {
        id: '8-4', title: '元音的其他读音', en: 'o /ʌ/, ou /ʌ/, u /ʊ/, wa /wɑ/',
        rule: '一些元音字母在常用词里有"意外"的读音，需要结合单词记忆：<br>· <b>o</b> 读 /ʌ/：son、mother、love、come、some、money<br>· <b>ou</b> 读 /ʌ/：touch、young、double、country<br>· <b>u</b> 读 /ʊ/：put、push、pull、full、bush<br>· <b>w</b> 和 <b>qu</b> 后面的 <b>a</b> 常读 /ɑ/：want、wash、watch、swan、squash',
        cards: [{ g: 'o', s: 'u_s', kw: 'son' }, { g: 'ou', s: 'u_s', kw: 'touch' }, { g: 'u', s: 'oo_s', kw: 'put' }, { g: 'a', s: 'o_s', kw: 'want' }],
        words: ['son|儿子|👦', 'mother|妈妈|👩|th:th_v', 'love|爱|❤️', 'come|来|👋', 'some|一些|🔢', 'money|钱|💰', 'front|前面|⬆️', 'month|月|📅', 'touch|触摸|👆', 'young|年轻的|🧒', 'double|双倍的|✌️', 'country|国家|🗺️', 'cousin|表兄弟姐妹|👫|s:z,i:schwa', 'trouble|麻烦|😣', 'put|放|📥', 'push|推|🫸', 'pull|拉|🫷', 'full|满的|🈵', 'bush|灌木|🌳', 'bull|公牛|🐂', 'want|想要|🙏', 'wash|洗|🧼', 'watch|手表；观看|⌚', 'swan|天鹅|🦢', 'wasp|黄蜂|🐝', 'squash|南瓜|🎃'],
        sentences: ['My mother has some money.|我妈妈有一些钱。', 'Come and touch the swan.|过来摸摸天鹅。', 'Push and pull the full cart.|推一推、拉一拉这辆装满的车。', 'My young cousin wants to wash the car.|我年幼的表弟想洗车。'],
      },
      {
        id: '8-5', title: 'ough / augh', en: 'ough augh',
        rule: '<b>ough</b> 是英语里最"调皮"的组合，有好几种读音，只能按单词记：<br>· /ɔː/：bought、thought、brought<br>· /oʊ/：though、dough<br>· /uː/：through<br>· /ʌf/：rough、tough、enough<br>· /ɔf/：cough<br><b>augh</b> 通常读 /ɔː/：taught、caught、daughter；在 laugh 里读 /æf/。',
        cards: [{ g: 'ough', s: 'aw', kw: 'thought' }, { g: 'ough', s: 'o_l', kw: 'though' }, { g: 'ough', s: 'oo_l', kw: 'through' },
          { g: 'ough', s: 'uf', kw: 'tough', tip: '读 /ʌf/：短 u 加 f。' }, { g: 'augh', s: 'aw', kw: 'taught' }],
        words: ['bought|买（过去式）|🛍️', 'brought|带来（过去式）|🎁', 'fought|打（过去式）|🥊', 'ought|应该|☝️', 'thought|想（过去式）|💭', 'though|虽然|🤔|th:th_v,ough:o_l', 'although|尽管|🤷|a:aw,th:th_v,ough:o_l', 'dough|面团|🥖|ough:o_l', 'through|穿过|🚇|ough:oo_l', 'rough|粗糙的|🪨|ough:uf', 'tough|坚硬的|💪|ough:uf', 'enough|足够的|✅|e:i_s,ough:uf', 'cough|咳嗽|🤧|ough:awf', 'taught|教（过去式）|🧑‍🏫', 'caught|抓住（过去式）|🎣', 'daughter|女儿|👧', 'naughty|淘气的|😜', 'laugh|笑|😂|augh:af'],
        sentences: ['I bought enough dough.|我买了足够的面团。', 'She has a bad cough.|她咳嗽得很厉害。', 'My daughter taught me to laugh.|我女儿教会我开怀大笑。', 'We went through a rough road.|我们走过一条崎岖的路。'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 9, level: '高级', title: '进阶拼读规则', en: 'Advanced Patterns', weeks: 4, icon: '🧭',
    goal: '掌握软音 c/g、不发音字母、-le 结尾、-ed 与 -s 的读音、-tion/-sion/-ture、ch/gh 的其他读音和 /ʒ/ 的拼写。',
    intro: '学到这里，你已经能读出绝大多数单音节词了。本阶段学习一些"例外中的规律"，它们能帮你读懂更长、更正式的单词。',
    lessons: [
      {
        id: '9-1', title: '软音 c 与 g', en: 'Soft c & Soft g',
        rule: '· <b>c</b> 在 <b>e、i、y</b> 前读 /s/（city、face），其他情况读 /k/（cat、cup）。<br>· <b>g</b> 在 <b>e、i、y</b> 前常读 /dʒ/（gem、giant、page），其他情况读 /g/。g 的规则有不少例外（get、give、girl），c 的规则则非常稳定。',
        cards: [{ g: 'c', s: 's', kw: 'city' }, { g: 'g', s: 'j', kw: 'gem' }],
        words: ['city|城市|🏙️', 'cent|美分|🪙', 'face|脸|😀', 'ice|冰|🧊', 'rice|米饭|🍚', 'pencil|铅笔|✏️', 'circle|圆形|⭕', 'gem|宝石|💎', 'giant|巨人|🧌|i:i_l,a:schwa', 'page|页|📄', 'cage|笼子|🦜', 'g-ir-a-ff-e|长颈鹿|🦒|ir:er,a:a_s', 'or-a-n-ge|橙子|🍊|a:i_s,ge:j', 'cell|细胞|🦠', 'dance|跳舞|💃', 'juice|果汁|🧃', 'space|太空|🚀', 'fancy|花哨的|🎀', 'g-i-n-g-er|姜|🫚', 'gym|健身房|🏋️', 'magic|魔法|🪄', 'large|大的|🐘', 'bridge|桥|🌉', 'd-a-n-g-er|危险|⚠️|a:a_l', 'e-n-g-i-n-e|发动机|🚂|i:i_s'],
        sentences: ['The giant has a huge face.|巨人有一张巨大的脸。', 'Mice in the city like rice.|城市里的老鼠喜欢吃米饭。', 'Draw a circle on the page.|在这页纸上画一个圆。', 'The giraffe is in a big cage.|长颈鹿在一个大笼子里。'],
      },
      {
        id: '9-2', title: '不发音字母', en: 'Silent Letters: kn wr mb gn',
        rule: '有些字母组合中，一个字母"沉默"不发音：<br>· <b>kn</b> → /n/：k 不发音（knee、knock）<br>· <b>wr</b> → /r/：w 不发音（write、wrong）<br>· <b>mb</b> → /m/：b 不发音（lamb、thumb）<br>· <b>gn</b> → /n/：g 不发音（sign、gnat）',
        cards: [{ g: 'kn', s: 'n', kw: 'knee' }, { g: 'wr', s: 'r', kw: 'write' }, { g: 'mb', s: 'm', kw: 'lamb' }, { g: 'gn', s: 'n', kw: 'sign' }],
        words: ['knee|膝盖|🦵', 'knock|敲门|🚪', 'knife|刀|🔪', 'knot|结|🪢', 'write|写|✍️', 'wrong|错误的|❌', 'wrist|手腕|⌚', 'wrap|包裹|🎁', 'lamb|小羊羔|🐑', 'thumb|拇指|👍', 'climb|攀爬|🧗|i:i_l', 'sign|标志|🪧|i:i_l', 'knit|编织|🧶', 'knob|门把手|🚪', 'kneel|跪下|🧎', 'know|知道|🧠', 'wreck|残骸|🚢', 'wren|鹪鹩|🐦', 'wrote|写（过去式）|📝', 'wreath|花环|💐', 'comb|梳子|🪮|o:o_l', 'bomb|炸弹|💣', 'crumb|面包屑|🍞', 'gnat|小飞虫|🦟'],
        sentences: ['Knock, knock! Who is there?|咚咚咚！谁在那儿？', 'I hurt my knee and my wrist.|我伤了膝盖和手腕。', 'The lamb can climb.|小羊会攀爬。', 'Do not write the wrong sign.|别把标志写错了。'],
      },
      {
        id: '9-3', title: '-le 结尾', en: 'Consonant + le',
        rule: '单词以"辅音 + <b>le</b>"结尾时，le 读 /əl/（轻轻带过的"呃-l"），并且和前面的辅音组成最后一个音节：ap·<b>ple</b>、ta·<b>ble</b>、can·<b>dle</b>。',
        cards: [{ g: 'le', s: 'le', kw: 'apple' }],
        words: ["'ap·ple|苹果|🍎", "'bot·tle|瓶子|🍼", "'ta·ble|桌子|🪑", "'can·dle|蜡烛|🕯️", "'lit·tle|小的|🤏", "'pur·ple|紫色|🟣", "'puz·zle|拼图|🧩", "'jun·gle|丛林|🌴", "'bub·ble|泡泡|🫧", "'sim·ple|简单的|✅", "'mid·dle|中间|🎯", "'tur·tle|乌龟|🐢", "'pad·dle|桨|🛶", "'nee·dle|针|🪡", "'cas·tle|城堡|🏰", "'pud·dle|水坑|💧", "'ea·gle|鹰|🦅", "'pick·le|泡菜|🥒", "'gig·gle|咯咯笑|🤭", "'cud·dle|搂抱|🤗", "'han·dle|把手|🚪", "'ket·tle|水壶|🫖", "'tick·le|挠痒|🪶", "'noo·dle|面条|🍜"],
        sentences: ['A little turtle is on the table.|一只小乌龟在桌子上。', 'Put the candle in the middle.|把蜡烛放在中间。', 'This puzzle is simple.|这个拼图很简单。', 'Blow a purple bubble!|吹一个紫色的泡泡！'],
      },
      {
        id: '9-4', title: '-ed 与 -s 的读音', en: '-ed /t/ /d/ /ɪd/, -s /s/ /z/ /ɪz/',
        rule: '<b>-ed</b>（过去式）有三种读音：<br>· 在清辅音 /p k f s ʃ tʃ/ 后读 <b>/t/</b>：jumped、looked<br>· 在浊音（元音、浊辅音）后读 <b>/d/</b>：played、called<br>· 在 /t/、/d/ 后读 <b>/ɪd/</b>，多一个音节：wanted、needed<br><br><b>-s / -es</b>（复数、三单）也有三种读音：清辅音后 /s/（cats），浊音后 /z/（dogs），在 s、x、sh、ch 后加 es 读 /ɪz/（boxes）。',
        cards: [{ g: 'ed', s: 't', kw: 'jumped' }, { g: 'ed', s: 'd', kw: 'played' }, { g: 'ed', s: 'ed_id', kw: 'wanted' }],
        words: ['jumped|跳（过去式）|🦘|ed:t', 'looked|看（过去式）|👀|ed:t,oo:oo_s', 'helped|帮助（过去式）|🤝|ed:t', 'fixed|修理（过去式）|🔧|ed:t', 'played|玩（过去式）|🎮|ed:d', 'rained|下雨（过去式）|🌧️|ed:d', 'hugged|拥抱（过去式）|🤗|ed:d', 'called|打电话（过去式）|📞|ed:d,a:aw', 'wanted|想要（过去式）|🙏|ed:ed_id,a:o_s', 'needed|需要（过去式）|📌|ed:ed_id', 'planted|种植（过去式）|🌱|ed:ed_id', 'painted|画（过去式）|🎨|ed:ed_id', 'kissed|亲吻（过去式）|💋|ed:t', 'packed|打包（过去式）|🎒|ed:t', 'washed|洗（过去式）|🧼|ed:t,a:o_s', 'stopped|停止（过去式）|🛑|ed:t', 'opened|打开（过去式）|📂|ed:d,o:o_l,e:schwa', 'cleaned|清洁（过去式）|🧽|ed:d', 'smiled|微笑（过去式）|😊|ed:d,i:i_l', 'filled|装满（过去式）|🫗|ed:d', 'started|开始（过去式）|▶️|ed:ed_id', 'landed|着陆（过去式）|🛬|ed:ed_id', 'added|加（过去式）|➕|ed:ed_id', 'melted|融化（过去式）|🫠|ed:ed_id'],
        sentences: ['I jumped and played.|我又跳又玩。', 'We planted a tree and then it rained.|我们种了一棵树，然后下雨了。', 'She wanted three boxes.|她想要三个盒子。', 'The dogs and cats looked at the buses.|狗和猫看着公交车。'],
      },
      {
        id: '9-5', title: '-tion / -sion / -ture', en: '-tion /ʃən/  -sion /ʒən/  -ture /tʃər/',
        rule: '常见的词尾组合，整体记忆即可：<br>· <b>-tion</b> 读 /ʃən/（station、action）<br>· <b>-sion</b> 读 /ʒən/（television、vision），有时读 /ʃən/（mission）<br>· <b>-ture</b> 读 /tʃər/（picture、nature）<br>这些词尾所在音节都不重读，重音通常在它前面的音节。',
        cards: [{ g: 'tion', s: 'tion', kw: 'station' }, { g: 'sion', s: 'sion', kw: 'vision' }, { g: 'ture', s: 'ture', kw: 'picture' }],
        words: ["'sta·tion|车站|🚉", "'ac·tion|动作|🎬", "va·'ca·tion|假期|🏖️", "'mo·tion|运动|🌀", "'lo·tion|乳液|🧴", "'vi·sion|视力|👁️", "'tel·e·vi·sion|电视|📺", "de·'ci·sion|决定|🤔", "'pic·ture|图片|🖼️", "'na·ture|自然|🌳", "'fu·ture|未来|🚀", "ad·'ven·ture|冒险|🗺️", "'na·tion|国家|🏳️", "lo·'ca·tion|位置|📍", "e·'mo·tion|情绪|😊", "in·'ven·tion|发明|💡", "'fic·tion|小说|📚", "'man·sion|豪宅|🏰", "'ver·sion|版本|🔢", "ex·'plo·sion|爆炸|💥", "'crea·ture|生物|🐉", "'fur·ni·ture|家具|🛋️", "'mix·ture|混合物|🧪", "'cap·ture|捕获|🪤"],
        sentences: ['We took a picture at the station.|我们在车站拍了张照片。', 'Nature is full of adventure.|大自然充满了冒险。', 'I have a question about the vacation.|我有一个关于假期的问题。', 'Make a decision about the future.|为未来做一个决定。'],
      },
      {
        id: '9-6', title: '更多不发音字母', en: 'Silent h t w b l u',
        rule: '这些字母在某些单词里写出来但不发音：<br>· <b>h</b>：hour、honest、ghost、rhyme<br>· <b>t</b>：listen、castle、whistle、often<br>· <b>w</b>：two、sword、answer<br>· <b>b</b>：doubt、debt（b 在 t 前）<br>· <b>l</b>：calm、palm、could、should、would、yolk<br>· <b>u</b>：guess、guitar、build、biscuit（u 让 g、b 后面的元音保持原来的读音）',
        cards: [{ g: 'h', s: 'silent', kw: 'hour' }, { g: 't', s: 'silent', kw: 'listen' }, { g: 'w', s: 'silent', kw: 'two' },
          { g: 'b', s: 'silent', kw: 'doubt' }, { g: 'l', s: 'silent', kw: 'calm' }, { g: 'u', s: 'silent', kw: 'guess' }],
        words: ['hour|小时|⏰|h:silent', 'honest|诚实的|😇|h:silent,e:i_s', 'ghost|鬼|👻|h:silent,o:o_l', 'rhyme|押韵|🎵|h:silent,y:i_l', 'listen|听|👂|t:silent,e:schwa', 'castle|城堡|🏰|t:silent', 'whistle|口哨|📯|t:silent', 'often|经常|🔁|t:silent,o:aw,e:schwa', 'two|二|2️⃣|w:silent,o:oo_l', 'sword|剑|🗡️|w:silent', 'answer|回答|💬|w:silent', 'doubt|怀疑|🤔|b:silent', 'debt|债务|💸|b:silent', 'calm|平静的|😌|l:silent,a:o_s', 'palm|手掌|🖐️|l:silent,a:o_s', 'could|能（过去式）|🤷|l:silent,ou:oo_s', 'should|应该|☝️|l:silent,ou:oo_s', 'would|将会|🙂|l:silent,ou:oo_s', 'yolk|蛋黄|🍳|l:silent,o:o_l', 'g-u-e-ss|猜|❓|u:silent', 'g-u-i-t-ar|吉他|🎸|u:silent', 'b-u-i-l-d|建造|🏗️|u:silent', 'b-i-s-c-u-i-t|饼干|🍪|u:silent'],
        sentences: ['Listen! Can you hear the whistle?|听！你能听到口哨声吗？', 'I doubt the ghost is honest.|我怀疑那个鬼不诚实。', 'Guess what I could build!|猜猜我能造出什么！', 'Wait an hour and stay calm.|等一个小时，保持冷静。'],
      },
      {
        id: '9-7', title: 'ch 读 /k/ /ʃ/，gh 读 /f/', en: 'ch /k/ /ʃ/, gh /f/',
        rule: '· <b>ch</b> 在一些源自希腊语的单词里读 <b>/k/</b>：school、echo、stomach、chorus、ache<br>· <b>ch</b> 在一些源自法语的单词里读 <b>/ʃ/</b>：chef、machine<br>· <b>gh</b> 在词尾有时读 <b>/f/</b>：laugh、cough、rough、tough、enough（在 night、eight 中 gh 不发音）',
        cards: [{ g: 'ch', s: 'k', kw: 'school' }, { g: 'ch', s: 'sh', kw: 'chef' }, { g: 'gh', s: 'f', kw: 'laugh' }],
        words: ['school|学校|🏫', 'echo|回声|🗣️|o:o_l', 'stomach|胃|🫃|o:u_s,a:schwa', 'chorus|合唱|🎶|u:schwa', 'anchor|锚|⚓|n:ng,or:er', 'ache|疼痛|🤕', 'headache|头痛|🤯|ea:e_s', 'chemist|药剂师|🧪|i:schwa', 'scheme|计划|📋', 'Christmas|圣诞节|🎄|t:silent,a:schwa', 'chef|厨师|🧑‍🍳|ch:sh', 'machine|机器|⚙️|ch:sh,a:schwa,i:e_l', 'laugh|笑|😂|au:a_s', 'laughter|笑声|😆|au:a_s', 'cough|咳嗽|🤧|ou:aw', 'rough|粗糙的|🪨|ou:u_s', 'tough|坚硬的|💪|ou:u_s', 'enough|足够的|✅|e:i_s,ou:u_s'],
        sentences: ['The chef has a stomach ache.|厨师胃疼。', 'We sing in the school chorus.|我们在学校合唱团唱歌。', 'Laugh, but do not cough!|笑吧，但别咳嗽！', 'This machine is tough enough.|这台机器够结实。'],
      },
      {
        id: '9-8', title: '/ʒ/ 的拼写', en: '/ʒ/: -sure -sion s ge',
        rule: '/ʒ/ 是英语里最少见的辅音（口型同 /ʃ/，但声带振动，像撅着嘴说"日"、不卷舌）。常见拼法：<br>· <b>-sure</b> 读 /ʒər/：measure、treasure、pleasure<br>· <b>-sion</b>（在元音后）读 /ʒən/：vision、decision<br>· <b>s</b> 在 u 前：usual、casual、visual<br>· 词尾 <b>-ge</b>（多为法语来源）：beige、garage、massage',
        cards: [{ g: 'sure', s: 'sure', kw: 'treasure', tip: '/ʒ/ 再加卷舌的 /ər/。' }, { g: 'sion', s: 'sion', kw: 'vision' }, { g: 's', s: 'zh', kw: 'usual' }, { g: 'ge', s: 'zh', kw: 'garage', noMap: true }],
        words: ['measure|测量|📏|ea:e_s', 'treasure|宝藏|💰|ea:e_s', 'pleasure|乐趣|😊|ea:e_s', 'usual|通常的|📅|u#1:u_l,u#2:schwa,a:schwa', 'casual|随意的|👕|u:schwa,a#2:schwa', 'visual|视觉的|👁️|u:schwa,a:schwa', 'vision|视力|👓', 'decision|决定|🤔|e:i_s', 'division|除法|➗', 'confusion|困惑|😕|o:schwa,u:u_l', 'g-ar-a-ge|车库|🚗|ar:er,a:o_s,ge:zh', 'b-ei-ge|米色|🟫|ei:a_l,ge:zh', 'massage|按摩|💆|a#1:schwa,a#2:o_s,g:zh'],
        sentences: ['Measure the treasure!|量一量这些宝藏！', 'It is a pleasure to see you.|很高兴见到你。', 'Make a decision about your leisure time.|决定一下你的休闲时间怎么安排。', 'We usually park in the garage.|我们通常把车停在车库里。'],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 10, level: '精通', title: '音节与多音节词', en: 'Syllables & Long Words', weeks: 4, icon: '🏆',
    goal: '学会划分音节，独立拼读任何陌生的多音节单词，掌握重音与弱读、加后缀的拼写规则和常见词尾。',
    intro: '遇到长单词不要慌：先把它<b>切成音节</b>，每个音节就是一个小单词，用前面学过的规则逐个拼读，再连起来。<b>音节</b>是含有一个元音音素的发音单位——有几个元音音素，就有几个音节。拍手数音节是个好方法：but·ter·fly（三拍）。',
    lessons: [
      {
        id: '10-1', title: '六种音节类型', en: 'Six Syllable Types',
        rule: '判断音节类型，就能知道其中元音怎么读。下表是英语的六种音节：',
        table: {
          head: ['音节类型', '特征', '元音读音', '例子'],
          rows: [
            ['闭音节 Closed', '元音后面有辅音"关门"', '短音', 'cat、rab·bit'],
            ['开音节 Open', '音节以元音结尾，"门开着"', '长音', 'go、ba·by'],
            ['魔法 e Silent-e', '元音-辅音-e', '长音', 'cake、in·side'],
            ['元音组合 Vowel Team', '两个字母表示一个元音', '按组合读', 'rain、team·work'],
            ['R 控制 R-controlled', '元音后跟 r', 'R 控制音', 'car、gar·den'],
            ['辅音+le Consonant-le', '词尾辅音 + le', '/əl/', 'ta·ble、pur·ple'],
          ],
        },
        cards: [],
        words: ["'rab·bit|兔子|🐰", "'ba·by|婴儿|👶", "in·'side|在里面|📥", "'rain·bow|彩虹|🌈", "'gar·den|花园|🌷", "'ta·ble|桌子|🪑", "'ro·bot|机器人|🤖", "'cup·cake|纸杯蛋糕|🧁", "'team·work|团队合作|🤝", "'pop·corn|爆米花|🍿", "'sun·shine|阳光|🌞", "'bee·tle|甲虫|🪲", "'zip·per|拉链|🤐", "'si·lent|安静的|🤫", "'bed·time|就寝时间|🛏️", "ex·'plode|爆炸|💥", "'rail·road|铁路|🛤️", "'stair·case|楼梯|🪜", "'mar·ket|市场|🏪", "'cor·ner|角落|📐", "'ap·ple|苹果|🍎", "'puz·zle|拼图|🧩", "'mo·ment|时刻|⏱️", "'tea·pot|茶壶|🫖"],
        sentences: ['A rabbit is in the garden.|一只兔子在花园里。', 'The baby sees a rainbow.|宝宝看到了彩虹。', 'Put the cupcake on the table.|把纸杯蛋糕放在桌子上。', 'Teamwork makes the robot go.|团队合作让机器人动起来。'],
      },
      {
        id: '10-2', title: '音节划分：VC/CV', en: 'Divide between two consonants',
        rule: '两个元音之间夹着<b>两个辅音</b>（VCCV）时，从两个辅音<b>中间</b>分开：rab | bit、bas | ket。这样前一个音节以辅音结尾，是闭音节，元音读短音。<br>⚠️ 二合字母（sh、ch、th、ck）不能拆开。',
        cards: [],
        words: ["'rab·bit|兔子|🐰", "'nap·kin|餐巾|🧻", "'bas·ket|篮子|🧺", "'muf·fin|松饼|🧁", "'pic·nic|野餐|🧺", "'hel·met|头盔|⛑️", "'win·ter|冬天|❄️", "'sun·set|日落|🌇", "'kit·ten|小猫|🐱", "'den·tist|牙医|🦷", "'pup·pet|木偶|🎎", "'in·sect|昆虫|🐞", "'tab·let|平板电脑|📱", "'gob·lin|小妖精|👺", "'cac·tus|仙人掌|🌵", "'mag·net|磁铁|🧲", "'pen·cil|铅笔|✏️", "'blos·som|花朵|🌸", "'lap·top|笔记本电脑|💻", "'hap·pen|发生|✨", "'ten·nis|网球|🎾", "'bot·tom|底部|⬇️", "'pump·kin|南瓜|🎃", "'sil·ver|银色|🥈"],
        sentences: ['The kitten is in the basket.|小猫在篮子里。', 'We had a picnic at sunset.|我们在日落时野餐。', 'Wear a helmet in winter.|冬天要戴头盔。', 'The dentist has a puppet.|牙医有一个木偶。'],
      },
      {
        id: '10-3', title: '音节划分：V/CV 与 VC/V', en: 'One consonant between vowels',
        rule: '两个元音之间只有<b>一个辅音</b>（VCV）时：<br>① 先试着把辅音分到<b>后面</b>（V/CV）：ti | ger，第一个音节是开音节，元音读<b>长音</b>。大约 75% 的单词这样分。<br>② 如果读出来不像认识的词，再把辅音分到<b>前面</b>（VC/V）：cam | el，第一个音节变成闭音节，元音读<b>短音</b>。',
        cards: [],
        words: ["'ti·ger|老虎|🐯", "'ro·bot|机器人|🤖", "'mu·sic|音乐|🎵", "'pa·per|纸|📄", "'o·pen|打开|📂", "'ze·ro|零|0️⃣", "'cam·el|骆驼|🐫", "'lem·on|柠檬|🍋", "'wag·on|马车|🛒", "'riv·er|河流|🏞️", "'sev·en|七|7️⃣", "'plan·et|行星|🪐", "'ba·con|培根|🥓", "'pi·lot|飞行员|🧑‍✈️", "'spi·der|蜘蛛|🕷️", "'mo·tor|马达|⚙️", "'ze·bra|斑马|🦓", "'hu·man|人类|🧍", "'rob·in|知更鸟|🐦", "'clos·et|壁橱|🚪", "'shad·ow|影子|👤", "'vis·it|拜访|🏠", "'cab·in|小木屋|🛖", "'met·al|金属|🔩"],
        sentences: ['The robot plays music.|机器人在播放音乐。', 'Seven tigers are by the river.|河边有七只老虎。', 'Open the paper.|打开那张纸。', 'A camel is on the planet.|一只骆驼在星球上。'],
      },
      {
        id: '10-4', title: '前缀与后缀', en: 'Prefixes & Suffixes',
        rule: '很多长单词 = <b>前缀</b> + 词根 + <b>后缀</b>。先找出认识的部分，单词就"变短"了。',
        table: {
          head: ['词缀', '意思', '例子'],
          rows: [
            ['un-', '不', 'un·hap·py 不开心'],
            ['re-', '再，重新', 're·do 重做'],
            ['dis-', '不，相反', 'dis·like 不喜欢'],
            ['pre-', '在……之前', 'pre·view 预览'],
            ['-ful', '充满……的', 'help·ful 有帮助的'],
            ['-less', '没有……的', 'care·less 粗心的'],
            ['-ness', '……的状态', 'kind·ness 善良'],
            ['-ly', '……地', 'slow·ly 慢慢地'],
            ['-er', '……的人', 'teach·er 老师'],
          ],
        },
        cards: [],
        words: ["un·'hap·py|不开心的|😞", "re·'do|重做|🔁", "dis·'like|不喜欢|👎", "'pre·view|预览|👀", "'help·ful|有帮助的|🤝", "'care·less|粗心的|😵", "'kind·ness|善良|💗", "'slow·ly|慢慢地|🐢", "'teach·er|老师|👩‍🏫", "'play·ful|爱玩的|🤸", "'re·play|重播|⏪", "'sad·ness|悲伤|😢", "un·'lock|开锁|🔓", "un·'tie|解开|🪢", "re·'turn|返回|↩️", "re·'fill|再装满|🫗", "dis·a·'gree|不同意|🙅", "'fear·less|无畏的|🦁", "'thank·ful|感激的|🙏", "'dark·ness|黑暗|🌑", "'quick·ly|快速地|⚡", "'paint·er|画家|🧑‍🎨", "'sing·er|歌手|🎤", "'pre·school|幼儿园|🏫"],
        sentences: ['The teacher is kind and helpful.|老师善良又乐于助人。', 'Do not be careless. Redo it slowly.|别粗心，慢慢重做一遍。', 'I dislike sadness.|我不喜欢悲伤。', 'The playful puppy is not unhappy.|这只爱玩的小狗一点都不难过。'],
      },
      {
        id: '10-5', title: '重音与弱读 /ə/', en: 'Stress & Schwa',
        rule: '多音节单词中，有一个音节读得<b>更重、更长、更高</b>，叫做<b>重读音节</b>（下面用粗体标出）。<b>非重读</b>音节里的元音常常弱化成最轻的 <b>/ə/</b>（schwa），无论它拼成 a、e、o 还是 u。<br>例：ba·<b>na</b>·na 中第一个和最后一个 a 都读 /ə/。掌握重音和弱读，你的发音会立刻更地道。',
        cards: [{ g: 'a', s: 'schwa', kw: 'about' }],
        words: ["a·'bout|关于|💬", "ba·'na·na|香蕉|🍌", "'pan·da|熊猫|🐼", "'so·fa|沙发|🛋️", "'lem·on|柠檬|🍋", "com·'pu·ter|电脑|💻", "a·'gain|再一次|🔁", "'el·e·phant|大象|🐘", "'choc·o·late|巧克力|🍫", "'ham·burg·er|汉堡|🍔", "to·'ma·to|西红柿|🍅", "Sep·'tem·ber|九月|🍂", "a·'live|活着的|💓", "a·'sleep|睡着的|😴", "'cam·er·a|相机|📷", "go·'ril·la|大猩猩|🦍", "pa·'ja·mas|睡衣|👘", "'buf·fa·lo|水牛|🐃", "'an·i·mal|动物|🐾", "'fam·i·ly|家庭|👨‍👩‍👧", "'di·no·saur|恐龙|🦕", "'cel·e·brate|庆祝|🎉", "sup·'pose|假设|🤔", "po·'ta·to|土豆|🥔"],
        sentences: ['The panda ate a banana.|熊猫吃了一根香蕉。', 'Let us play on the computer again.|我们再玩一次电脑吧。', 'An elephant sat on the sofa.|一头大象坐在沙发上。', 'I like chocolate and tomatoes.|我喜欢巧克力和西红柿。'],
      },
      {
        id: '10-6', title: '加后缀的拼写规则', en: 'Suffix Spelling Rules',
        rule: '给单词加后缀（-ing、-ed、-er、-est、-s）时，拼写会按规则变化，这些规则正是为了<b>保住元音的读音</b>：<br>· <b>双写</b>：短元音 + 单个辅音结尾的单音节词，加元音开头的后缀时双写辅音，让前面保持闭音节、读短音：hop → hopping<br>· <b>去 e</b>：以不发音的 e 结尾，加元音开头的后缀时去掉 e，后缀里的元音接替魔法 e 的作用：hope → hoping<br>· <b>y 变 i</b>：辅音 + y 结尾，加后缀时 y 变 i（baby → babies），但 -ing 前保留 y（crying）<br>对比下面这组词：双写的读短音，单写的读长音。',
        table: {
          head: ['规则', '条件', '例子'],
          rows: [
            ['双写', '短元音 + 单辅音结尾，加元音开头的后缀', 'hop → hopping，big → bigger，run → runner'],
            ['去 e', '以不发音的 e 结尾，加元音开头的后缀', 'hope → hoping，make → making，ride → rider'],
            ['y 变 i', '辅音 + y 结尾（-ing 除外）', 'baby → babies，happy → happier，cry → cried'],
          ],
        },
        pairs: ['hoping>hopping', 'taping>tapping', 'filing>filling', 'later>latter', 'diner>dinner', 'super>supper'],
        cards: [],
        words: ["'hop·ping|蹦跳（进行时）|🐇", "'ho·ping|希望（进行时）|🙏", "'big·ger|更大的|🐘", "'run·ner|跑步者|🏃", "'swim·ming|游泳|🏊", "'sit·ting|坐着|🪑", "'din·ner|晚餐|🍽️", "'sup·per|晚饭|🥘", "'ma·king|制作（进行时）|🛠️", "'ri·der|骑手|🏇", "'la·ter|稍后|⏰", "'ba·bies|婴儿们|👶", "'po·nies|小马们|🐴", "'hap·pi·er|更快乐的|😄", "'fun·ni·est|最好笑的|🤣", "'cry·ing|正在哭|😭", 'cried|哭（过去式）|😢'],
        sentences: ['The runner is hoping to win.|那位跑者希望获胜。', 'The babies are crying.|宝宝们在哭。', 'Swimming makes me happier.|游泳让我更快乐。', 'See you later at dinner.|晚饭时见。'],
      },
      {
        id: '10-7', title: '常见词尾', en: '-age -ous -ive -cial/-tial -able/-ible',
        rule: '长单词的结尾常常是固定的"词尾块"，它们都<b>不重读</b>，元音多弱读成 /ə/ 或 /ɪ/。认出这些词尾，长单词就容易读了。',
        table: {
          head: ['词尾', '读音', '例子'],
          rows: [
            ['-age', '/ɪdʒ/', 'village、cabbage、message'],
            ['-ous', '/əs/', 'famous、nervous、dangerous'],
            ['-ive', '/ɪv/', 'active、creative、massive'],
            ['-cial / -tial', '/ʃəl/', 'special、social、partial'],
            ['-able / -ible', '/əbəl/', 'comfortable、possible、terrible'],
          ],
        },
        cards: [{ g: 'age', s: 'age', kw: 'village' }, { g: 'ous', s: 'ous', kw: 'famous' }, { g: 'ive', s: 'ive', kw: 'active' },
          { g: 'cial', s: 'cial', kw: 'special' }, { g: 'able', s: 'able', kw: 'comfortable' }],
        words: ["'vil·lage|村庄|🏘️", "'cab·bage|卷心菜|🥬", "'mes·sage|信息|💬", "'pack·age|包裹|📦", "'fa·mous|著名的|⭐", "'ner·vous|紧张的|😬", "'jeal·ous|嫉妒的|😒", "'dan·ger·ous|危险的|☠️", "'ac·tive|活跃的|🏃", "cre·'a·tive|有创造力的|🎨", "'mas·sive|巨大的|🐋", "'spe·cial|特别的|✨", "'so·cial|社交的|👥", "'par·tial|部分的|🌓", "i·'ni·tial|最初的|🔤", "'com·fort·a·ble|舒适的|🛋️", "'pos·si·ble|可能的|✅", "'ter·ri·ble|可怕的|😱", "'wash·a·ble|可水洗的|🧺"],
        sentences: ['The famous village is very special.|这个著名的村庄非常特别。', 'Is it possible to send a message?|可以发一条信息吗？', 'Cabbage is good for active kids.|卷心菜对好动的孩子有益。', 'The dangerous dog made me nervous.|那只危险的狗让我很紧张。'],
      },
    ],
  },
];
