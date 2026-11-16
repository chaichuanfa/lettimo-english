/* 语法课程数据
 * GRAMMAR：6 个阶段的语法学习路径
 *
 * 例句格式 "English|中文"
 *   [文字]        高亮本课重点
 *   {S:文字}      标出句子成分：S 主语 V 谓语 O 宾语 C 表语 IO 间接宾语 DO 直接宾语 OC 宾语补足语 A 状语 AT 定语
 * 句型公式 forms：[{ label, parts: [...] }]，parts 依次用 + 连接
 * 测验 quiz：
 *   { c: '含 ___ 的句子', o: [正确答案, 干扰项…], why: '解析' }   选择题（显示时打乱选项）
 *   { s: '完整句子', zh: '中文提示' }                              连词成句
 */
window.GRAMMAR = [
  /* ====================================================== */
  {
    id: 1, title: '词类基础', en: 'Parts of Speech', level: '入门', icon: '🧱',
    desc: '认识名词、冠词、代词、形容词、副词和介词——句子的"零件"。',
    lessons: [
      {
        id: 'g1-1', title: '名词与单复数', en: 'Nouns & Plurals',
        intro: '名词表示人、事物、地点或概念。可数名词有单数和复数，复数大多在词尾加 -s。',
        rule: `<p>名词分为<b>可数名词</b>（book、apple）和<b>不可数名词</b>（water、milk、rice）。可数名词有单数和复数；不可数名词没有复数，不能直接用 a / an。</p>
<p>复数的规则变化：</p>`,
        table: {
          head: ['规则', '变法', '例子'],
          rows: [
            ['一般情况', '加 -s', 'book → books，cat → cats'],
            ['以 s, x, ch, sh 结尾', '加 -es', 'bus → buses，box → boxes，watch → watches'],
            ['辅音字母 + y 结尾', '变 y 为 i 再加 -es', 'baby → babies，city → cities'],
            ['元音字母 + y 结尾', '直接加 -s', 'boy → boys，day → days'],
            ['以 f / fe 结尾', '多数变 f 为 v 再加 -es', 'leaf → leaves，knife → knives'],
            ['不规则', '需要单独记', 'man → men，child → children，foot → feet，mouse → mice'],
          ],
        },
        examples: [
          'I have two [cats].|我有两只猫。',
          'There are three [boxes] on the desk.|桌上有三个盒子。',
          'The [babies] are sleeping.|宝宝们在睡觉。',
          'Autumn [leaves] are red and yellow.|秋天的树叶是红色和黄色的。',
          'Those [children] are my friends.|那些孩子是我的朋友。',
          'Can I have some [water]?|我能喝点水吗？',
        ],
        traps: [
          '不可数名词没有复数：说 <b>some water</b>，不说 waters；说 <b>some bread</b>，不说 a bread。',
          '表示"一些"时，可数名词用复数：<b>some apples</b>；不可数名词用原形：<b>some milk</b>。',
        ],
        quiz: [
          { c: 'I can see five ___ in the tree.', o: ['birds', 'bird', 'birdes', 'a bird'], why: 'five 后面接可数名词复数，bird 直接加 -s。' },
          { c: 'There are two ___ on the table.', o: ['boxes', 'boxs', 'box', 'boxies'], why: 'box 以 x 结尾，复数加 -es。' },
          { c: 'The ___ are playing in the park.', o: ['children', 'childs', 'child', 'childrens'], why: 'child 的复数是不规则变化 children。' },
          { c: 'Please give me some ___.', o: ['water', 'waters', 'a water', 'waterses'], why: 'water 是不可数名词，没有复数。' },
          { s: 'I have three red apples.', zh: '我有三个红苹果。' },
          { s: 'The babies are very cute.', zh: '宝宝们非常可爱。' },
        ],
      },
      {
        id: 'g1-2', title: '冠词 a / an / the', en: 'Articles',
        intro: 'a / an 表示"一个"（泛指），the 表示"这个、那个"（特指）。',
        rule: `<p><b>a / an</b> 是不定冠词，放在单数可数名词前，表示"一个"或第一次提到的事物。</p>
<p>选 a 还是 an 看后面单词的<b>第一个音</b>，不是第一个字母：元音音素前用 <b>an</b>（an apple、an hour），辅音音素前用 <b>a</b>（a book、a university）。</p>
<p><b>the</b> 是定冠词，表示特指：双方都知道的、前面提到过的、世界上独一无二的（the sun、the moon）。</p>`,
        table: {
          head: ['用法', '例子'],
          rows: [
            ['第一次提到用 a / an，再次提到用 the', 'I have a dog. The dog is white.'],
            ['独一无二的事物用 the', 'the sun，the earth，the sky'],
            ['乐器前用 the', 'play the piano'],
            ['球类、三餐、学科前不用冠词', 'play football，have lunch，study math'],
          ],
        },
        examples: [
          'I have [a] dog. [The] dog is white.|我有一只狗。这只狗是白色的。',
          'She eats [an] apple every day.|她每天吃一个苹果。',
          'He is [an] honest boy.|他是个诚实的男孩。',
          '[The] sun rises in the east.|太阳从东方升起。',
          'My sister can play [the] piano.|我姐姐会弹钢琴。',
          'We play football after school.|我们放学后踢足球。',
        ],
        traps: [
          'hour、honest 的 h 不发音，开头是元音音素，要用 <b>an</b>：an hour。',
          'university、useful 开头读 /j/（辅音），要用 <b>a</b>：a university。',
          '球类运动前不加冠词：play basketball，不说 play the basketball。',
        ],
        quiz: [
          { c: 'I want to eat ___ orange.', o: ['an', 'a', 'the', '不填'], why: 'orange 以元音音素 /ɔ/ 开头，用 an。' },
          { c: 'We will be there in ___ hour.', o: ['an', 'a', 'the', '不填'], why: 'hour 的 h 不发音，以元音音素开头，用 an。' },
          { c: '___ moon goes around the earth.', o: ['The', 'A', 'An', '不填'], why: '月亮是独一无二的，用 the。' },
          { c: 'Tom often plays ___ basketball.', o: ['不填', 'the', 'a', 'an'], why: '球类运动前不用冠词。' },
          { s: 'I saw an elephant at the zoo.', zh: '我在动物园看到一头大象。' },
          { s: 'She can play the violin.', zh: '她会拉小提琴。' },
        ],
      },
      {
        id: 'g1-3', title: '人称代词与物主代词', en: 'Pronouns',
        intro: '代词用来代替名词，避免重复。主格做主语，宾格做宾语，物主代词表示"谁的"。',
        rule: `<p>同一个人在句子里位置不同，代词形式也不同：<b>主格</b>放在动词前做主语（<b>He</b> likes me），<b>宾格</b>放在动词或介词后做宾语（I like <b>him</b>）。</p>
<p>表示"谁的"用物主代词：<b>形容词性</b>后面必须跟名词（my book），<b>名词性</b>后面不跟名词（The book is <b>mine</b>）。</p>`,
        table: {
          head: ['主格', '宾格', '形容词性物主代词', '名词性物主代词'],
          rows: [
            ['I', 'me', 'my', 'mine'],
            ['you', 'you', 'your', 'yours'],
            ['he', 'him', 'his', 'his'],
            ['she', 'her', 'her', 'hers'],
            ['it', 'it', 'its', 'its'],
            ['we', 'us', 'our', 'ours'],
            ['they', 'them', 'their', 'theirs'],
          ],
        },
        examples: [
          '[She] is my teacher. I like [her] very much.|她是我的老师。我非常喜欢她。',
          '[They] invited [us] to the party.|他们邀请我们参加聚会。',
          'This is [my] bike. That one is [yours].|这是我的自行车。那辆是你的。',
          'The dog is wagging [its] tail.|那只狗在摇尾巴。',
          'Is this pen [his] or [hers]?|这支笔是他的还是她的？',
          'Please help [me] with [my] homework.|请帮我做作业。',
        ],
        traps: [
          '介词和动词后面用宾格：between you and <b>me</b>，不说 between you and I。',
          '<b>its</b>（它的）没有撇号；<b>it\'s</b> 是 it is 的缩写。',
        ],
        quiz: [
          { c: 'Lily is my friend. I often play with ___.', o: ['her', 'she', 'hers', 'his'], why: 'with 是介词，后面用宾格 her。' },
          { c: '___ are good students.', o: ['We', 'Us', 'Our', 'Ours'], why: '做主语用主格 we。' },
          { c: 'This is not my ruler. ___ is in my bag.', o: ['Mine', 'My', 'Me', 'I'], why: '后面没有名词，用名词性物主代词 mine（= my ruler）。' },
          { c: 'The cat is licking ___ paw.', o: ['its', "it's", 'it', 'their'], why: '"它的"是 its；it\'s = it is。' },
          { s: 'That red bag is hers.', zh: '那个红色的包是她的。' },
          { s: 'They often help us.', zh: '他们经常帮助我们。' },
        ],
      },
      {
        id: 'g1-4', title: '形容词与副词', en: 'Adjectives & Adverbs',
        intro: '形容词修饰名词，说明"什么样的"；副词修饰动词、形容词，说明"怎样地、多么"。',
        rule: `<p><b>形容词</b>放在名词前（a <b>big</b> house），或放在 be 动词等系动词后（The house is <b>big</b>）。</p>
<p><b>副词</b>修饰动词（run <b>fast</b>）、形容词（<b>very</b> big）或整个句子。很多副词由形容词加 <b>-ly</b> 构成：quick → quickly，happy → happily，careful → carefully。</p>
<p>频率副词表示"多经常"，放在实义动词前、be 动词后：always（总是）＞ usually（通常）＞ often（经常）＞ sometimes（有时）＞ never（从不）。</p>`,
        examples: [
          'She has a [beautiful] voice.|她的嗓音很美。',
          'She sings [beautifully].|她唱得很好听。',
          'The test was [easy].|这次考试很简单。',
          'He finished the test [easily].|他轻松地完成了考试。',
          'It is [very] cold today.|今天非常冷。',
          'I [usually] get up at seven.|我通常七点起床。',
        ],
        traps: [
          '系动词（be、look、feel、sound、taste 等）后面用形容词：You look <b>happy</b>，不说 You look happily。',
          '有些词形容词和副词同形：fast、hard、early、late。He works <b>hard</b>（他努力工作），hardly 意思是"几乎不"。',
          'good 是形容词，well 是副词：a good player，play well。',
        ],
        quiz: [
          { c: 'The girl sings ___.', o: ['beautifully', 'beautiful', 'beauty', 'more beautiful'], why: '修饰动词 sings 用副词。' },
          { c: 'The soup tastes ___.', o: ['good', 'well', 'nicely', 'goodly'], why: 'taste 是系动词，后面接形容词。' },
          { c: 'Please read the sentence ___.', o: ['carefully', 'careful', 'care', 'careless'], why: '修饰动词 read 用副词 carefully。' },
          { c: 'He ___ late for school.', o: ['is never', 'never is', 'never are', 'are never'], why: '频率副词放在 be 动词之后。' },
          { s: 'My father drives very carefully.', zh: '我爸爸开车非常小心。' },
          { s: 'She often helps her mother.', zh: '她经常帮妈妈。' },
        ],
      },
      {
        id: 'g1-5', title: '介词 in / on / at', en: 'Prepositions',
        intro: '介词放在名词或代词前面，表示时间、地点、方向等关系。',
        rule: `<p>同样三个介词，表示<b>时间</b>和<b>地点</b>时都遵循"从大到小"：in 最大、on 居中、at 最小、最具体。</p>`,
        table: {
          head: ['', '时间', '地点'],
          rows: [
            ['in', '年、月、季节、上午/下午/晚上：in 2024，in May，in summer，in the morning', '城市、国家、封闭空间里：in China，in the box'],
            ['on', '具体某一天：on Monday，on May 1st，on my birthday', '表面上：on the desk，on the wall'],
            ['at', '具体时刻：at 7 o\'clock，at noon，at night', '某个点：at the door，at school，at the bus stop'],
          ],
        },
        examples: [
          'My birthday is [in] July.|我的生日在七月。',
          'We have music class [on] Friday.|我们周五上音乐课。',
          'The movie starts [at] eight o\'clock.|电影八点开始。',
          'There is a picture [on] the wall.|墙上有一幅画。',
          'The keys are [in] my bag.|钥匙在我包里。',
          'Someone is waiting [at] the door.|有人在门口等着。',
        ],
        traps: [
          '具体某一天的上午/下午用 on：<b>on</b> Sunday morning，而不是 in Sunday morning。',
          'at night（在夜里）是固定搭配，但 in the morning / afternoon / evening。',
          '前面有 this、next、last、every 时不用介词：<b>next Monday</b>，不说 on next Monday。',
        ],
        quiz: [
          { c: 'We often go swimming ___ summer.', o: ['in', 'on', 'at', '不填'], why: '季节前用 in。' },
          { c: 'The meeting is ___ Tuesday morning.', o: ['on', 'in', 'at', '不填'], why: '具体某一天的上午用 on。' },
          { c: 'I usually go to bed ___ ten o\'clock.', o: ['at', 'in', 'on', 'for'], why: '具体时刻前用 at。' },
          { c: 'I will visit my grandma ___ next week.', o: ['不填', 'in', 'on', 'at'], why: '有 next 修饰时，前面不用介词。' },
          { s: 'The cat is sleeping on the sofa.', zh: '猫正在沙发上睡觉。' },
          { s: 'We have lunch at noon.', zh: '我们中午吃午饭。' },
        ],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 2, title: '基本句子', en: 'Basic Sentences', level: '入门', icon: '🗣️',
    desc: 'be 动词、There be、实义动词，以及疑问句、否定句和祈使句。',
    lessons: [
      {
        id: 'g2-1', title: 'be 动词 am / is / are', en: 'The Verb "Be"',
        intro: 'be 动词表示"是、在"，根据主语选择 am、is 或 are。',
        rule: `<p>口诀：<b>我（I）用 am，你（you）用 are，is 跟着他（he）、她（she）、它（it）；单数名词用 is，复数全部都用 are。</b></p>
<p>be 动词句变否定句：在 be 后面加 <b>not</b>；变一般疑问句：把 be 提到句首。</p>`,
        forms: [
          { label: '肯定句', parts: ['主语', 'am / is / are', '名词 / 形容词 / 地点'] },
          { label: '否定句', parts: ['主语', 'am / is / are + not', '……'] },
          { label: '疑问句', parts: ['Am / Is / Are', '主语', '……?'] },
        ],
        table: {
          head: ['主语', 'be 动词', '缩写'],
          rows: [['I', 'am', "I'm"], ['he / she / it / 单数名词', 'is', "he's / isn't"], ['you / we / they / 复数名词', 'are', "you're / aren't"]],
        },
        examples: [
          'I [am] a student.|我是一名学生。',
          'My mother [is] a doctor.|我妈妈是一名医生。',
          'They [are] in the classroom.|他们在教室里。',
          'The apples [are] not sweet.|这些苹果不甜。',
          '[Is] he your brother? Yes, he is.|他是你哥哥吗？是的。',
          '[Are] you ready? No, I\'m not.|你准备好了吗？还没有。',
        ],
        traps: [
          '主语是两个人时用 are：<b>Tom and I are</b> friends。',
          '回答 Are you…? 时要用 I：Yes, <b>I am</b>. / No, <b>I\'m not</b>.（am not 不能缩写成 amn\'t）',
        ],
        quiz: [
          { c: 'My father ___ a teacher.', o: ['is', 'am', 'are', 'be'], why: 'my father 是第三人称单数，用 is。' },
          { c: 'Tom and Jerry ___ good friends.', o: ['are', 'is', 'am', 'be'], why: '两个人做主语是复数，用 are。' },
          { c: '___ your sister at home?', o: ['Is', 'Are', 'Am', 'Do'], why: 'your sister 是单数，一般疑问句把 is 提前。' },
          { c: 'I ___ not tired.', o: ['am', 'is', 'are', 'do'], why: '主语 I 用 am。' },
          { s: 'Are they your classmates?', zh: '他们是你的同学吗？' },
          { s: 'The weather is not good today.', zh: '今天天气不好。' },
        ],
      },
      {
        id: 'g2-2', title: 'There be 句型', en: 'There Is / There Are',
        intro: 'There be 表示"某处有某物"，be 的单复数由后面紧跟的名词决定。',
        rule: `<p>There be 句型说的是"存在"：<b>There is</b> + 单数或不可数名词，<b>There are</b> + 复数名词，后面通常接地点。</p>
<p>如果后面有几个名词，be 和<b>最近的</b>那个名词保持一致（就近原则）。</p>
<p>注意区分：<b>There be</b> 表示"某地有"，<b>have / has</b> 表示"某人拥有"。</p>`,
        forms: [
          { label: '肯定句', parts: ['There is / are', '名词', '地点'] },
          { label: '否定句', parts: ['There is / are + not (any)', '名词', '地点'] },
          { label: '疑问句', parts: ['Is / Are there', '(any) 名词', '地点?'] },
        ],
        examples: [
          '[There is] a book on the desk.|桌上有一本书。',
          '[There are] thirty students in our class.|我们班有三十个学生。',
          '[There is] some milk in the fridge.|冰箱里有一些牛奶。',
          '[There is] a pen and two pencils in the box.|盒子里有一支钢笔和两支铅笔。',
          '[Are there] any parks near your home?|你家附近有公园吗？',
          '[There aren\'t] any eggs in the basket.|篮子里一个鸡蛋也没有。',
        ],
        traps: [
          '不能说 There have…，"某地有"只能用 There be。',
          '否定句和疑问句里 some 一般改成 any：There aren\'t <b>any</b> eggs。',
        ],
        quiz: [
          { c: 'There ___ a cat under the chair.', o: ['is', 'are', 'have', 'has'], why: 'a cat 是单数，用 There is。' },
          { c: 'There ___ some juice in the bottle.', o: ['is', 'are', 'have', 'be'], why: 'juice 是不可数名词，用 is。' },
          { c: 'There ___ two dogs and a cat in the yard.', o: ['are', 'is', 'has', 'have'], why: '就近原则：紧跟的 two dogs 是复数，用 are。' },
          { c: 'Are there ___ trees on the hill?', o: ['any', 'some', 'a', 'an'], why: '疑问句中用 any。' },
          { s: 'There is a big tree behind my house.', zh: '我家后面有一棵大树。' },
          { s: 'Is there a hospital near here?', zh: '这附近有医院吗？' },
        ],
      },
      {
        id: 'g2-3', title: '实义动词与 do / does', en: 'Action Verbs & Do / Does',
        intro: '实义动词表示动作（eat、play、like），变否定句和疑问句要借助 do / does。',
        rule: `<p>句子里只有实义动词（没有 be 动词）时，否定句和疑问句要请助动词 <b>do</b> 帮忙；主语是第三人称单数时用 <b>does</b>，后面的动词<b>变回原形</b>。</p>
<p>主语是第三人称单数（he、she、it、单数名词）时，肯定句里的动词要加 -s / -es：He <b>likes</b> music。</p>`,
        forms: [
          { label: '肯定句', parts: ['主语', '动词（三单加 -s）', '……'] },
          { label: '否定句', parts: ['主语', "don't / doesn't", '动词原形', '……'] },
          { label: '疑问句', parts: ['Do / Does', '主语', '动词原形', '……?'] },
        ],
        examples: [
          'I [like] English.|我喜欢英语。',
          'She [likes] music.|她喜欢音乐。',
          'We [don\'t] eat meat.|我们不吃肉。',
          'He [doesn\'t play] computer games.|他不玩电脑游戏。',
          '[Do] you [have] a pet? Yes, I do.|你有宠物吗？有。',
          '[Does] your brother [like] swimming? No, he doesn\'t.|你哥哥喜欢游泳吗？不喜欢。',
        ],
        traps: [
          '用了 does / doesn\'t，后面的动词要变回原形：Does she <b>like</b>…?，不说 Does she likes…?',
          'be 动词和实义动词不能同时做谓语：不说 I am like apples。',
        ],
        quiz: [
          { c: 'My sister ___ milk every morning.', o: ['drinks', 'drink', 'drinking', 'is drink'], why: 'my sister 是第三人称单数，动词加 -s。' },
          { c: 'He ___ like carrots.', o: ["doesn't", "don't", "isn't", 'not'], why: '实义动词的否定借助 doesn\'t（三单）。' },
          { c: 'Does she ___ a bike?', o: ['have', 'has', 'having', 'to have'], why: 'does 后面用动词原形。' },
          { c: '___ you often read books?', o: ['Do', 'Does', 'Are', 'Is'], why: '主语 you，实义动词 read，用 Do 提问。' },
          { s: 'Does your father work in a hospital?', zh: '你爸爸在医院工作吗？' },
          { s: 'They don\'t live in Beijing.', zh: '他们不住在北京。' },
        ],
      },
      {
        id: 'g2-4', title: '特殊疑问句', en: 'Wh- Questions',
        intro: '用 what、where、when、who 等疑问词提问，不能用 yes / no 回答。',
        rule: `<p>特殊疑问句 = <b>疑问词 + 一般疑问句</b>。先把句子变成一般疑问句，再把疑问词放在最前面。</p>
<p>如果疑问词本身就是主语（Who、What 问"谁/什么做了某事"），直接用陈述句语序：<b>Who</b> broke the window?</p>`,
        forms: [
          { label: '结构', parts: ['疑问词', '一般疑问句（be / do / does / can…）', '?'] },
        ],
        table: {
          head: ['疑问词', '问什么', '例子'],
          rows: [
            ['what', '什么', 'What is your name?'],
            ['where', '哪里', 'Where do you live?'],
            ['when', '什么时候', 'When is your birthday?'],
            ['who', '谁', 'Who is that girl?'],
            ['why', '为什么', 'Why are you late?'],
            ['how', '怎样', 'How do you go to school?'],
            ['how many / how much', '多少（可数 / 不可数、价格）', 'How many books do you have? How much is it?'],
            ['which / whose', '哪一个 / 谁的', 'Which color do you like? Whose bag is this?'],
          ],
        },
        examples: [
          '[What] do you do on weekends?|你周末做什么？',
          '[Where] is the library?|图书馆在哪里？',
          '[How] old is your brother?|你弟弟几岁了？',
          '[Why] does she look sad?|她为什么看起来很难过？',
          '[How many] students are there in your class?|你们班有多少学生？',
          '[Who] wants some ice cream?|谁想吃冰淇淋？',
        ],
        traps: [
          '疑问词后面要用疑问句语序：Where <b>do you</b> live?，不说 Where you live?',
          'how many 接可数名词复数，how much 接不可数名词或问价格。',
        ],
        quiz: [
          { c: '___ is your English teacher? Miss Wang.', o: ['Who', 'What', 'Where', 'How'], why: '回答的是人，用 Who 提问。' },
          { c: '___ do you go to school? By bus.', o: ['How', 'What', 'When', 'Why'], why: '问交通方式用 How。' },
          { c: '___ water do we need?', o: ['How much', 'How many', 'How old', 'How long'], why: 'water 不可数，用 How much。' },
          { c: 'Where ___ your parents work?', o: ['do', 'does', 'are', 'is'], why: '主语 your parents 是复数，实义动词 work，用 do。' },
          { s: 'What time do you get up?', zh: '你几点起床？' },
          { s: 'Why is he so happy today?', zh: '他今天为什么这么高兴？' },
        ],
      },
      {
        id: 'g2-5', title: '祈使句', en: 'Imperatives',
        intro: '祈使句用来提出请求、命令或建议，省略主语 you，以动词原形开头。',
        rule: `<p>肯定祈使句以<b>动词原形</b>开头：Open the door. 加上 <b>please</b> 更礼貌。</p>
<p>否定祈使句在前面加 <b>Don't</b>：Don't run.</p>
<p>用 <b>Let's</b> + 动词原形提出"我们一起……"的建议：Let's go!</p>`,
        forms: [
          { label: '肯定', parts: ['(Please)', '动词原形', '……'] },
          { label: '否定', parts: ["Don't", '动词原形', '……'] },
          { label: '建议', parts: ["Let's", '动词原形', '……'] },
        ],
        examples: [
          '[Open] your books, please.|请打开书。',
          '[Be] quiet!|安静！',
          '[Don\'t run] in the hallway.|不要在走廊里跑。',
          '[Don\'t be] late again.|别再迟到了。',
          '[Let\'s go] to the park.|我们去公园吧。',
          'Please [sit] down.|请坐。',
        ],
        traps: [
          '有形容词时要用 be 开头：<b>Be careful!</b>，不说 Careful!（口语可以）或 Don\'t careful。否定是 <b>Don\'t be</b> careful…',
          "Let's 后面接动词原形：Let's <b>play</b>，不说 Let's to play / Let's playing。",
        ],
        quiz: [
          { c: '___ careful! The road is busy.', o: ['Be', 'Is', 'Are', 'Do'], why: '后面是形容词 careful，祈使句用 Be 开头。' },
          { c: '___ talk in the library.', o: ["Don't", "Doesn't", 'Not', "Isn't"], why: '否定祈使句用 Don\'t + 动词原形。' },
          { c: "Let's ___ a song together.", o: ['sing', 'to sing', 'singing', 'sings'], why: "Let's 后面接动词原形。" },
          { c: 'Please ___ the window.', o: ['close', 'closes', 'closing', 'to close'], why: '祈使句用动词原形。' },
          { s: "Don't be afraid of the dark.", zh: '不要怕黑。' },
          { s: "Let's clean the classroom.", zh: '我们来打扫教室吧。' },
        ],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 3, title: '基本时态', en: 'Basic Tenses', level: '基础', icon: '⏰',
    desc: '用动词的变化表示动作发生的时间：现在、过去、将来、进行和完成。',
    lessons: [
      {
        id: 'g3-1', title: '一般现在时', en: 'Present Simple',
        intro: '表示经常发生的动作、习惯、事实和真理。',
        rule: `<p>一般现在时表示<b>经常、习惯性</b>的动作，或者<b>客观事实、普遍真理</b>。</p>
<p>主语是第三人称单数时，动词要加 -s / -es，规则和名词复数类似：works，watches，goes，studies。have 的三单形式是 <b>has</b>。</p>`,
        forms: [
          { label: '肯定句', parts: ['主语', '动词原形 / 三单形式', '……'] },
          { label: '否定句', parts: ['主语', "don't / doesn't", '动词原形'] },
          { label: '疑问句', parts: ['Do / Does', '主语', '动词原形 ?'] },
        ],
        signals: ['always', 'usually', 'often', 'sometimes', 'never', 'every day', 'every week', 'on Sundays', 'once a week'],
        examples: [
          'I [get] up at six every day.|我每天六点起床。',
          'She [goes] to school by bike.|她骑自行车上学。',
          'My father [watches] the news every evening.|我爸爸每天晚上看新闻。',
          'The earth [goes] around the sun.|地球绕着太阳转。',
          'Water [boils] at 100 degrees.|水在一百度沸腾。',
          'He [doesn\'t like] coffee.|他不喜欢咖啡。',
        ],
        traps: [
          '辅音 + y 结尾变 y 为 i 加 -es：study → <b>studies</b>，fly → flies；元音 + y 直接加 -s：play → plays。',
          '以 s, x, ch, sh, o 结尾加 -es：go → <b>goes</b>，do → does，watch → watches。',
        ],
        quiz: [
          { c: 'Lucy ___ her homework after dinner every day.', o: ['does', 'do', 'did', 'is doing'], why: 'every day 表示习惯，主语三单，用 does。' },
          { c: 'The sun ___ in the east.', o: ['rises', 'rise', 'rose', 'is rising'], why: '客观事实用一般现在时，主语三单。' },
          { c: 'My brother ___ English very hard.', o: ['studies', 'studys', 'study', 'studying'], why: '辅音 + y 结尾，变 y 为 i 加 -es。' },
          { c: 'We ___ go to the cinema on Saturdays.', o: ['often', 'are often', 'often are', 'oftenly'], why: '频率副词放在实义动词前。' },
          { s: 'My mother always gets up early.', zh: '我妈妈总是起得很早。' },
          { s: 'Does he play football every week?', zh: '他每周都踢足球吗？' },
        ],
      },
      {
        id: 'g3-2', title: '现在进行时', en: 'Present Continuous',
        intro: '表示现在（说话这一刻）正在进行的动作。',
        rule: `<p>现在进行时 = <b>am / is / are + 动词-ing</b>，表示此时此刻或现阶段正在进行的动作。</p>
<p>动词加 -ing 的规则：一般直接加（read → reading）；以不发音的 e 结尾，去 e 加 -ing（make → making）；重读闭音节结尾，双写最后的辅音字母再加 -ing（run → running，swim → swimming）。</p>`,
        forms: [
          { label: '肯定句', parts: ['主语', 'am / is / are', '动词-ing'] },
          { label: '否定句', parts: ['主语', 'am / is / are + not', '动词-ing'] },
          { label: '疑问句', parts: ['Am / Is / Are', '主语', '动词-ing ?'] },
        ],
        signals: ['now', 'right now', 'at the moment', 'Look!', 'Listen!', 'these days'],
        examples: [
          'I [am reading] a book now.|我现在正在看书。',
          'Look! The children [are playing] in the snow.|看！孩子们正在雪里玩。',
          'Listen! Someone [is singing].|听！有人在唱歌。',
          'She [is making] a cake at the moment.|她现在正在做蛋糕。',
          'They [aren\'t watching] TV.|他们没在看电视。',
          '[Is] it [raining] outside?|外面在下雨吗？',
        ],
        traps: [
          '别漏掉 be 动词：I <b>am</b> reading，不说 I reading。',
          'like、know、want、have（拥有）等表示状态的动词一般不用进行时：I <b>know</b> him，不说 I am knowing him。',
        ],
        quiz: [
          { c: 'Look! The boy ___ a kite.', o: ['is flying', 'flies', 'fly', 'are flying'], why: 'Look! 提示正在发生，用现在进行时，主语单数用 is。' },
          { c: 'Be quiet! The baby ___.', o: ['is sleeping', 'sleeps', 'slept', 'sleep'], why: '说话时正在睡觉，用现在进行时。' },
          { c: 'They are ___ in the river now.', o: ['swimming', 'swiming', 'swim', 'swims'], why: 'swim 是重读闭音节，双写 m 再加 -ing。' },
          { c: 'What ___ you doing? I\'m drawing.', o: ['are', 'do', 'is', 'does'], why: '现在进行时的疑问句用 be 动词提问。' },
          { s: 'My mother is cooking in the kitchen.', zh: '我妈妈正在厨房做饭。' },
          { s: 'Are you listening to music?', zh: '你在听音乐吗？' },
        ],
      },
      {
        id: 'g3-3', title: '一般过去时', en: 'Past Simple',
        intro: '表示过去某个时间发生的动作或存在的状态。',
        rule: `<p>一般过去时用动词的<b>过去式</b>，不管主语是谁，形式都一样。</p>
<p>规则动词加 -ed：play → played，live → lived，stop → stopped，study → studied。很多常用动词是不规则的，需要单独记（见下表）。</p>
<p>否定句和疑问句借助 <b>did</b>，后面的动词<b>变回原形</b>。be 动词的过去式是 <b>was</b>（I / he / she / it）和 <b>were</b>（you / we / they）。</p>`,
        forms: [
          { label: '肯定句', parts: ['主语', '动词过去式', '……'] },
          { label: '否定句', parts: ['主语', "didn't", '动词原形'] },
          { label: '疑问句', parts: ['Did', '主语', '动词原形 ?'] },
        ],
        signals: ['yesterday', 'last night', 'last week', 'two days ago', 'in 2010', 'just now', 'this morning'],
        table: {
          head: ['原形', '过去式', '原形', '过去式'],
          rows: [
            ['go', 'went', 'see', 'saw'],
            ['have', 'had', 'eat', 'ate'],
            ['do', 'did', 'make', 'made'],
            ['get', 'got', 'take', 'took'],
            ['come', 'came', 'buy', 'bought'],
            ['write', 'wrote', 'think', 'thought'],
            ['read', 'read', 'tell', 'told'],
            ['run', 'ran', 'swim', 'swam'],
          ],
        },
        examples: [
          'I [visited] my grandparents last weekend.|上周末我去看望了爷爷奶奶。',
          'We [went] to the beach yesterday.|我们昨天去了海边。',
          'She [was] ill last week.|她上周生病了。',
          'They [were] at home last night.|他们昨晚在家。',
          'I [didn\'t see] him this morning.|我今天早上没看见他。',
          '[Did] you [have] a good time? Yes, I did.|你玩得开心吗？很开心。',
        ],
        traps: [
          'did / didn\'t 后面用动词原形：Did you <b>go</b>…?，不说 Did you went…?',
          'read 的过去式拼写不变，但读音变成 /rɛd/。',
        ],
        quiz: [
          { c: 'I ___ a movie with my friends last night.', o: ['watched', 'watch', 'watches', 'am watching'], why: 'last night 表示过去，用过去式。' },
          { c: 'He ___ to Shanghai two years ago.', o: ['went', 'goes', 'go', 'gone'], why: 'two years ago 是过去时间，go 的过去式是 went。' },
          { c: 'Did you ___ your homework yesterday?', o: ['finish', 'finished', 'finishing', 'finishes'], why: 'did 后面用动词原形。' },
          { c: 'They ___ very tired after the trip.', o: ['were', 'was', 'are', 'did'], why: '过去的状态，主语 they 用 were。' },
          { s: 'We played basketball after school yesterday.', zh: '我们昨天放学后打了篮球。' },
          { s: 'She didn\'t come to the party.', zh: '她没来参加聚会。' },
        ],
      },
      {
        id: 'g3-4', title: '一般将来时', en: 'Future: Will / Be Going To',
        intro: '表示将来要发生的动作，常用 will 或 be going to。',
        rule: `<p><b>will + 动词原形</b>：表示将来的事情、预测或说话时临时决定要做的事。所有人称都用 will，否定是 <b>won't</b>（= will not）。</p>
<p><b>am / is / are going to + 动词原形</b>：表示<b>已经计划好</b>的打算，或根据迹象判断马上要发生的事（Look at the clouds! It's going to rain.）。</p>`,
        forms: [
          { label: 'will', parts: ['主语', "will / won't", '动词原形'] },
          { label: 'be going to', parts: ['主语', 'am / is / are going to', '动词原形'] },
          { label: '疑问句', parts: ['Will / Am / Is / Are', '主语', '(going to) 动词原形 ?'] },
        ],
        signals: ['tomorrow', 'next week', 'next year', 'soon', 'in the future', 'in two days', 'this weekend'],
        examples: [
          'I [will call] you tomorrow.|我明天给你打电话。',
          'It [will be] sunny this weekend.|这个周末会是晴天。',
          'We [are going to visit] the museum next Sunday.|我们下周日打算去参观博物馆。',
          'Look at those clouds! It [is going to rain].|看那些云！要下雨了。',
          'She [won\'t come] to school tomorrow.|她明天不来上学。',
          '[Will] you [help] me? Of course I will.|你会帮我吗？当然会。',
        ],
        traps: [
          'will 后面用动词原形：will <b>be</b>，不说 will is；will <b>go</b>，不说 will goes。',
          'be going to 的 be 要随主语变化：He <b>is</b> going to…，They <b>are</b> going to…',
        ],
        quiz: [
          { c: 'I ___ you a postcard when I get to Paris.', o: ['will send', 'sent', 'send', 'am sending to'], why: '表示将来的动作，用 will + 动词原形。' },
          { c: 'We ___ going to have a picnic tomorrow.', o: ['are', 'is', 'will', 'do'], why: 'be going to 的 be 随主语 we 用 are。' },
          { c: 'He will ___ twelve years old next year.', o: ['be', 'is', 'are', 'being'], why: 'will 后面用动词原形 be。' },
          { c: 'Look at the dark clouds. It ___ rain.', o: ['is going to', 'will is', 'goes to', 'rains'], why: '根据迹象判断马上要发生的事，用 be going to。' },
          { s: 'What are you going to do this weekend?', zh: '这个周末你打算做什么？' },
          { s: 'I will be a doctor in the future.', zh: '我将来会成为一名医生。' },
        ],
      },
      {
        id: 'g3-5', title: '过去进行时', en: 'Past Continuous',
        intro: '表示过去某一时刻或某段时间正在进行的动作。',
        rule: `<p>过去进行时 = <b>was / were + 动词-ing</b>，表示过去某个时间点正在做的事。</p>
<p>常和 <b>when</b>、<b>while</b> 连用：一个较长的动作正在进行时（过去进行时），另一个短动作发生了（一般过去时）。</p>`,
        forms: [
          { label: '肯定句', parts: ['主语', 'was / were', '动词-ing'] },
          { label: '否定句', parts: ['主语', "wasn't / weren't", '动词-ing'] },
          { label: '疑问句', parts: ['Was / Were', '主语', '动词-ing ?'] },
        ],
        signals: ['at 8 last night', 'at this time yesterday', 'when…', 'while…', 'from 7 to 9 yesterday'],
        examples: [
          'I [was doing] my homework at eight last night.|昨晚八点我在写作业。',
          'They [were playing] football at this time yesterday.|昨天这个时候他们在踢足球。',
          'When I came in, my mother [was cooking].|我进来的时候，妈妈正在做饭。',
          'While she [was reading], the phone rang.|她正在看书时，电话响了。',
          'We [weren\'t sleeping] at that time.|那时我们没在睡觉。',
          'What [were] you [doing] at nine yesterday morning?|昨天上午九点你在做什么？',
        ],
        traps: [
          'while 后面常接持续的动作（进行时），when 后面常接短暂的动作：<b>When</b> the bell rang, we <b>were having</b> class.',
        ],
        quiz: [
          { c: 'At nine o\'clock last night, I ___ a shower.', o: ['was taking', 'took', 'am taking', 'take'], why: '过去某一时刻正在进行的动作，用过去进行时。' },
          { c: 'When the teacher came in, the students ___.', o: ['were talking', 'talked', 'are talking', 'was talking'], why: '老师进来时学生正在说话，主语复数用 were。' },
          { c: 'While I was walking home, it ___ to rain.', o: ['began', 'was beginning', 'begins', 'begin'], why: '长动作进行中，短动作"开始下雨"用一般过去时。' },
          { c: 'What ___ he doing at that time?', o: ['was', 'were', 'did', 'is'], why: '过去进行时疑问句，主语 he 用 was。' },
          { s: 'They were watching TV when I called.', zh: '我打电话时他们正在看电视。' },
          { s: 'What were you doing at this time yesterday?', zh: '昨天这个时候你在做什么？' },
        ],
      },
      {
        id: 'g3-6', title: '现在完成时', en: 'Present Perfect',
        intro: '表示过去发生的动作对现在造成的影响，或从过去持续到现在的状态。',
        rule: `<p>现在完成时 = <b>have / has + 过去分词</b>。重点不是"什么时候发生的"，而是"<b>到现在为止</b>"的结果或经历。</p>
<p>规则动词的过去分词和过去式一样（played → played）；不规则动词要单独记：go → went → <b>gone</b>，see → saw → <b>seen</b>，do → did → <b>done</b>，eat → ate → <b>eaten</b>。</p>
<p><b>for</b> + 一段时间（for three years），<b>since</b> + 过去的时间点（since 2020）。</p>`,
        forms: [
          { label: '肯定句', parts: ['主语', 'have / has', '过去分词'] },
          { label: '否定句', parts: ['主语', "haven't / hasn't", '过去分词'] },
          { label: '疑问句', parts: ['Have / Has', '主语', '过去分词 ?'] },
        ],
        signals: ['already', 'yet', 'just', 'ever', 'never', 'for + 时间段', 'since + 时间点', 'so far', 'recently'],
        examples: [
          'I [have finished] my homework.|我已经写完作业了。',
          'She [has been] to Beijing twice.|她去过北京两次。',
          '[Have] you ever [seen] a panda?|你见过熊猫吗？',
          'We [have lived] here for ten years.|我们在这里住了十年了。',
          'He [has worked] in this school since 2015.|他从 2015 年起就在这所学校工作。',
          'I [haven\'t had] lunch yet.|我还没吃午饭。',
        ],
        traps: [
          '有明确的过去时间（yesterday、last year、ago）时用一般过去时，不用现在完成时：I <b>saw</b> him yesterday。',
          '<b>has been to</b> 表示"去过（已经回来）"，<b>has gone to</b> 表示"去了（还没回来）"。',
        ],
        quiz: [
          { c: 'I ___ already ___ the book.', o: ['have, read', 'has, read', 'have, readed', 'am, reading'], why: 'already 是现在完成时的标志，主语 I 用 have + 过去分词。' },
          { c: 'She has lived in Shanghai ___ five years.', o: ['for', 'since', 'in', 'ago'], why: 'five years 是一段时间，用 for。' },
          { c: 'Have you ever ___ to the Great Wall?', o: ['been', 'gone', 'go', 'went'], why: '问"去过"的经历用 have been to。' },
          { c: 'Tom ___ his leg last week.', o: ['broke', 'has broken', 'breaks', 'have broken'], why: 'last week 是明确的过去时间，用一般过去时。' },
          { s: 'I have just cleaned my room.', zh: '我刚打扫完我的房间。' },
          { s: 'Has she finished her work yet?', zh: '她完成工作了吗？' },
        ],
      },
      {
        id: 'g3-7', title: '时态对比', en: 'Choosing the Right Tense',
        intro: '把学过的六种时态放在一起比较，根据时间标志词和语境选出正确的时态。',
        rule: `<p>选时态的三步：①找<b>时间标志词</b>；②想动作是<b>习惯、正在进行、已经完成</b>还是<b>将要发生</b>；③根据主语确定动词形式。</p>`,
        table: {
          head: ['时态', '结构', '用法', '例子'],
          rows: [
            ['一般现在时', 'do / does', '习惯、事实', 'He plays tennis every Sunday.'],
            ['现在进行时', 'am / is / are doing', '现在正在进行', 'He is playing tennis now.'],
            ['一般过去时', 'did', '过去某时发生', 'He played tennis yesterday.'],
            ['过去进行时', 'was / were doing', '过去某时正在进行', 'He was playing tennis at 3 yesterday.'],
            ['一般将来时', 'will do / be going to do', '将来发生', 'He will play tennis tomorrow.'],
            ['现在完成时', 'have / has done', '到现在的结果、经历', 'He has played tennis for five years.'],
          ],
        },
        examples: [
          'She [reads] books every evening.|她每天晚上都看书。',
          'She [is reading] a book now.|她现在正在看书。',
          'She [read] a book yesterday.|她昨天看了一本书。',
          'She [was reading] when I arrived.|我到的时候她正在看书。',
          'She [will read] a new book tomorrow.|她明天会看一本新书。',
          'She [has read] this book three times.|这本书她已经看了三遍了。',
        ],
        traps: [
          '一般现在时说"经常这样"，现在进行时说"此刻正在"：I <b>walk</b> to school every day, but today I <b>am taking</b> a bus.',
          '一般过去时强调"过去那个时间"，现在完成时强调"对现在的影响"：I <b>lost</b> my key yesterday. / I <b>have lost</b> my key（现在还没找到）。',
        ],
        quiz: [
          { c: 'Listen! Someone ___ at the door.', o: ['is knocking', 'knocks', 'knocked', 'has knocked'], why: 'Listen! 提示此刻正在发生，用现在进行时。' },
          { c: 'My uncle ___ in this factory since 2018.', o: ['has worked', 'works', 'worked', 'will work'], why: 'since + 过去时间点，用现在完成时。' },
          { c: 'We ___ a school trip next Friday.', o: ['will have', 'had', 'have had', 'were having'], why: 'next Friday 表示将来，用一般将来时。' },
          { c: 'I ___ TV when my mom came home.', o: ['was watching', 'watch', 'am watching', 'have watched'], why: '妈妈回家时正在看电视，过去某时正在进行，用过去进行时。' },
          { c: 'He usually ___ to work by subway.', o: ['goes', 'is going', 'went', 'has gone'], why: 'usually 表示习惯，用一般现在时。' },
          { s: 'I have lived here since I was born.', zh: '我从出生起就住在这里。' },
        ],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 4, title: '五大基本句型', en: 'Core Sentence Patterns', level: '进阶', icon: '🧩',
    desc: '再长的英语句子，主干也离不开这五种结构。学会找主干，长句不再难。',
    lessons: [
      {
        id: 'g4-1', title: '句子成分', en: 'Parts of a Sentence',
        intro: '一个句子由主语、谓语、宾语、表语、定语、状语、补语等成分组成，主语和谓语是核心。',
        rule: `<p><b>主语</b>：句子说的是"谁 / 什么"，通常是名词或代词。<b>谓语</b>：主语"做什么 / 是什么"，一定含有动词。</p>
<p><b>宾语</b>：动作的对象。<b>表语</b>：跟在系动词后，说明主语的身份或状态。</p>
<p><b>定语</b>：修饰名词（"……的"）。<b>状语</b>：说明时间、地点、方式、原因等。<b>补语</b>：补充说明宾语。</p>
<p>找句子主干的方法：先去掉定语和状语，剩下的就是主干。</p>`,
        examples: [
          '{S:Birds} {V:fly}.|鸟会飞。',
          '{S:I} {V:like} {O:apples}.|我喜欢苹果。',
          '{S:She} {V:is} {C:a nurse}.|她是一名护士。',
          '{AT:The little} {S:boy} {V:is reading} {O:a story book} {A:in the library}.|那个小男孩正在图书馆看故事书。',
          '{A:Every morning}, {S:my grandpa} {V:walks} {A:in the park}.|我爷爷每天早上在公园散步。',
          '{S:We} {V:made} {O:him} {OC:our captain}.|我们选他当队长。',
        ],
        traps: [
          '定语和状语可以有很多，但不影响句子主干：The tall boy in the blue shirt <b>is</b> my brother. 主干是 The boy is my brother。',
        ],
        quiz: [
          { c: 'In "My sister plays the piano well", the subject is ___.', o: ['my sister', 'plays', 'the piano', 'well'], why: '句子说的是"我姐姐"，my sister 是主语。' },
          { c: 'In "He bought a new bike yesterday", "a new bike" is the ___.', o: ['宾语', '主语', '表语', '状语'], why: 'a new bike 是 bought 的对象，是宾语。' },
          { c: 'In "The flowers smell sweet", "sweet" is the ___.', o: ['表语', '宾语', '状语', '定语'], why: 'smell 是系动词，sweet 说明主语的状态，是表语。' },
          { c: 'In "We have English class in the morning", "in the morning" is the ___.', o: ['状语', '宾语', '主语', '定语'], why: 'in the morning 说明时间，是状语。' },
          { s: 'The old man walks his dog every day.', zh: '那位老人每天遛狗。' },
          { s: 'My best friend lives in a small town.', zh: '我最好的朋友住在一个小镇上。' },
        ],
      },
      {
        id: 'g4-2', title: '主谓 / 主谓宾', en: 'S + V and S + V + O',
        intro: '最简单的两种句型：主语 + 不及物动词；主语 + 及物动词 + 宾语。',
        rule: `<p><b>句型一：主语 + 谓语</b>（S + V）。谓语是<b>不及物动词</b>（vi.），本身意思完整，后面不需要宾语，但可以加状语：Birds fly. / He runs fast.</p>
<p><b>句型二：主语 + 谓语 + 宾语</b>（S + V + O）。谓语是<b>及物动词</b>（vt.），后面必须有宾语，意思才完整：I like music.</p>
<p>查词典时，vi. 表示不及物动词，vt. 表示及物动词。很多动词两种用法都有。</p>`,
        forms: [
          { label: '句型一', parts: ['主语 S', '不及物动词 V', '(状语)'] },
          { label: '句型二', parts: ['主语 S', '及物动词 V', '宾语 O'] },
        ],
        examples: [
          '{S:The baby} {V:is crying}.|宝宝在哭。',
          '{S:The sun} {V:rises} {A:in the east}.|太阳从东方升起。',
          '{S:We} {V:arrived} {A:late}.|我们来晚了。',
          '{S:I} {V:love} {O:my family}.|我爱我的家人。',
          '{S:She} {V:is writing} {O:a letter}.|她在写信。',
          '{S:Tom} {V:broke} {O:the window} {A:yesterday}.|汤姆昨天打破了窗户。',
        ],
        traps: [
          '不及物动词后面要加宾语时需要介词：<b>listen to</b> music，<b>look at</b> the picture，<b>arrive in / at</b> Beijing。',
        ],
        quiz: [
          { c: 'Which sentence is S + V?', o: ['The dog barked.', 'I like dogs.', 'He is a dog lover.', 'She gave the dog a bone.'], why: 'barked 是不及物动词，句子只有主语和谓语。' },
          { c: 'Which sentence is S + V + O?', o: ['She opened the door.', 'She smiled.', 'She is happy.', 'She runs fast.'], why: 'opened 是及物动词，the door 是宾语。' },
          { c: 'Please listen ___ the teacher.', o: ['to', 'at', '不填', 'for'], why: 'listen 是不及物动词，接宾语要加 to。' },
          { c: 'They arrived ___ the airport at six.', o: ['at', 'to', '不填', 'on'], why: 'arrive 是不及物动词，到达小地点用 arrive at。' },
          { s: 'My brother plays basketball every day.', zh: '我弟弟每天打篮球。' },
          { s: 'The plane took off on time.', zh: '飞机准时起飞了。' },
        ],
      },
      {
        id: 'g4-3', title: '主系表', en: 'S + Linking Verb + Complement',
        intro: '系动词把主语和表语连起来，说明主语"是什么、怎么样"。',
        rule: `<p><b>句型三：主语 + 系动词 + 表语</b>（S + V + C）。系动词本身意思不完整，必须跟表语。表语通常是名词或形容词。</p>
<p>常见系动词：</p>
<ul><li><b>be</b>（是）：She is a teacher.</li>
<li>感官类：<b>look</b>（看起来）、<b>sound</b>（听起来）、<b>smell</b>（闻起来）、<b>taste</b>（尝起来）、<b>feel</b>（摸起来、感觉）</li>
<li>变化类：<b>become、get、turn、grow</b>（变得）</li>
<li>保持类：<b>keep、stay</b>（保持）；表象类：<b>seem</b>（似乎）</li></ul>`,
        forms: [
          { label: '句型三', parts: ['主语 S', '系动词 V', '表语 C（名词 / 形容词）'] },
        ],
        examples: [
          '{S:My father} {V:is} {C:a cook}.|我爸爸是厨师。',
          '{S:You} {V:look} {C:tired} {A:today}.|你今天看起来很累。',
          '{S:This song} {V:sounds} {C:beautiful}.|这首歌听起来很美。',
          '{S:The leaves} {V:turn} {C:yellow} {A:in autumn}.|秋天树叶变黄。',
          '{S:It} {V:is getting} {C:dark}.|天渐渐黑了。',
          'Please {V:keep} {C:quiet}.|请保持安静。',
        ],
        traps: [
          '系动词后面用形容词，不用副词：The cake tastes <b>good</b>，不说 tastes well。',
          '感官系动词没有被动形式，也一般不用进行时：It <b>smells</b> nice，不说 It is smelled nice。',
        ],
        quiz: [
          { c: 'The music sounds ___.', o: ['wonderful', 'wonderfully', 'wonder', 'wonders'], why: 'sound 是系动词，后接形容词。' },
          { c: 'The milk has gone ___.', o: ['bad', 'badly', 'worse', 'bads'], why: 'go 在这里是系动词"变得"，后接形容词。' },
          { c: 'Which verb is a linking verb in "She became a doctor"?', o: ['became', 'she', 'a', 'doctor'], why: 'became 是系动词，a doctor 是表语。' },
          { c: 'Your idea seems ___.', o: ['great', 'greatly', 'greatness', 'to great'], why: 'seem 是系动词，后接形容词。' },
          { s: 'The weather is getting warmer.', zh: '天气越来越暖和了。' },
          { s: 'This silk feels very soft.', zh: '这块丝绸摸起来很柔软。' },
        ],
      },
      {
        id: 'g4-4', title: '主谓双宾', en: 'S + V + IO + DO',
        intro: '有些动词后面可以跟两个宾语：给"谁"（间接宾语）和"什么"（直接宾语）。',
        rule: `<p><b>句型四：主语 + 谓语 + 间接宾语 + 直接宾语</b>（S + V + IO + DO）。间接宾语一般是人，直接宾语一般是物。</p>
<p>常见的双宾动词：give、send、show、tell、teach、buy、make、bring、pass、lend。</p>
<p>可以把直接宾语提前，间接宾语前加 <b>to</b> 或 <b>for</b>：</p>
<ul><li>用 <b>to</b>（强调"给到对方"）：give、send、show、tell、pass、lend、bring</li>
<li>用 <b>for</b>（强调"为对方做"）：buy、make、cook、get</li></ul>`,
        forms: [
          { label: '句型四', parts: ['主语 S', '谓语 V', '间接宾语 IO（人）', '直接宾语 DO（物）'] },
          { label: '改写', parts: ['主语 S', '谓语 V', '直接宾语 DO', 'to / for + 人'] },
        ],
        examples: [
          '{S:My mother} {V:gave} {IO:me} {DO:a new bag}.|妈妈给了我一个新书包。',
          '{S:My mother} {V:gave} {DO:a new bag} [to me].|妈妈把一个新书包给了我。',
          '{S:Mr. Li} {V:teaches} {IO:us} {DO:math}.|李老师教我们数学。',
          'Could {S:you} {V:pass} {IO:me} {DO:the salt}?|你能把盐递给我吗？',
          '{S:Dad} {V:bought} {IO:me} {DO:a kite}.|爸爸给我买了一只风筝。',
          '{S:Dad} {V:bought} {DO:a kite} [for me].|爸爸给我买了一只风筝。',
        ],
        traps: [
          '直接宾语是代词（it、them）时，只能用 to / for 结构：Give <b>it to me</b>，不说 Give me it。',
        ],
        quiz: [
          { c: 'Please show your ticket ___ me.', o: ['to', 'for', 'with', 'at'], why: 'show 用 to 引出间接宾语。' },
          { c: 'Grandma made a birthday cake ___ me.', o: ['for', 'to', 'with', 'of'], why: 'make 用 for 引出间接宾语。' },
          { c: 'In "She told us a funny story", the indirect object is ___.', o: ['us', 'she', 'a funny story', 'told'], why: '间接宾语是"给谁"，即 us。' },
          { c: 'This is my book. Please give ___.', o: ['it to me', 'me it', 'it me', 'to me it'], why: '直接宾语是代词 it 时，要用 give it to me。' },
          { s: 'My aunt sent me a postcard.', zh: '我阿姨给我寄了一张明信片。' },
          { s: 'Can you lend your pen to me?', zh: '你能把钢笔借给我吗？' },
        ],
      },
      {
        id: 'g4-5', title: '主谓宾宾补', en: 'S + V + O + OC',
        intro: '宾语后面再跟一个成分，补充说明宾语"是什么、怎么样、做什么"。',
        rule: `<p><b>句型五：主语 + 谓语 + 宾语 + 宾语补足语</b>（S + V + O + OC）。没有宾补，句子意思就不完整。</p>
<p>宾补可以是：</p>
<ul><li><b>形容词</b>：The news made us <b>happy</b>. / Keep the room <b>clean</b>.</li>
<li><b>名词</b>：We call him <b>Tom</b>. / They elected her <b>monitor</b>.</li>
<li><b>to + 动词原形</b>：My mom asked me <b>to clean</b> my room.（ask、tell、want、invite…）</li>
<li><b>不带 to 的动词原形</b>：使役动词 <b>make、let、have</b> 和感官动词 see、hear、watch 之后：Let me <b>help</b> you.</li></ul>`,
        forms: [
          { label: '句型五', parts: ['主语 S', '谓语 V', '宾语 O', '宾补 OC'] },
        ],
        examples: [
          '{S:The news} {V:made} {O:everyone} {OC:happy}.|这个消息让大家都很高兴。',
          '{S:We} {V:call} {O:the dog} {OC:Lucky}.|我们叫这只狗 Lucky。',
          'Please {V:keep} {O:the door} {OC:open}.|请让门开着。',
          '{S:My teacher} {V:asked} {O:me} {OC:to read the text}.|老师让我读课文。',
          '{V:Let} {O:me} {OC:help you}.|让我来帮你。',
          '{S:I} {V:saw} {O:him} {OC:cross the road}.|我看见他过马路了。',
        ],
        traps: [
          'make、let、have 后面的宾补用动词原形，不加 to：Let him <b>go</b>，不说 Let him to go。',
          '宾补是形容词时不要用副词：The film made me <b>sad</b>，不说 made me sadly。',
        ],
        quiz: [
          { c: 'The teacher made us ___ the text again.', o: ['read', 'to read', 'reading', 'reads'], why: 'make 后面的宾补用不带 to 的动词原形。' },
          { c: 'My parents want me ___ a doctor.', o: ['to be', 'be', 'being', 'is'], why: 'want sb. to do sth.，宾补用 to + 动词原形。' },
          { c: 'We must keep our classroom ___.', o: ['clean', 'cleanly', 'to clean', 'cleaning'], why: 'keep + 宾语 + 形容词，表示"使保持某种状态"。' },
          { c: 'They named the baby ___.', o: ['Emma', 'to Emma', 'as Emma to', 'for Emma'], why: 'name + 宾语 + 名词，名词做宾补。' },
          { s: 'The funny story made us laugh.', zh: '这个有趣的故事把我们逗笑了。' },
          { s: 'Mom told me to do my homework.', zh: '妈妈叫我写作业。' },
        ],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 5, title: '动词进阶', en: 'More About Verbs', level: '进阶', icon: '⚙️',
    desc: '情态动词、不定式与动名词、被动语态，以及形容词的比较级和最高级。',
    lessons: [
      {
        id: 'g5-1', title: '情态动词', en: 'Modal Verbs',
        intro: 'can、must、should、may 等情态动词表示能力、义务、建议、可能，后面接动词原形。',
        rule: `<p>情态动词本身有意思，但不能单独做谓语，后面必须接<b>动词原形</b>；没有人称和数的变化（He <b>can</b> swim，不说 He cans swim）。</p>
<p>否定在后面加 not，疑问把情态动词提前：can't / Can you…?</p>`,
        table: {
          head: ['情态动词', '意思', '例子'],
          rows: [
            ['can / could', '能、会（能力）；可以（请求）', 'I can swim. Could you help me?'],
            ['may', '可以（许可）；可能', 'May I come in? It may rain.'],
            ['must', '必须（主观要求）；一定（推测）', 'You must wear a seat belt.'],
            ["mustn't", '禁止，不许', "You mustn't smoke here."],
            ["needn't / don't have to", '不必', "You needn't hurry."],
            ['should', '应该（建议）', 'You should drink more water.'],
            ['have to', '不得不（客观需要）', 'I have to get up early tomorrow.'],
          ],
        },
        forms: [
          { label: '结构', parts: ['主语', '情态动词 (+ not)', '动词原形'] },
        ],
        examples: [
          'My little sister [can] ride a bike.|我妹妹会骑自行车。',
          '[May] I use your phone?|我可以用一下你的手机吗？',
          'You [must] finish your homework first.|你必须先完成作业。',
          'You [mustn\'t] play with fire.|你不许玩火。',
          'You [should] go to bed early.|你应该早点睡觉。',
          '[Must] I go now? No, you [needn\'t].|我必须现在走吗？不，不必。',
        ],
        traps: [
          '用 must 提问时，否定回答用 <b>needn\'t</b> 或 don\'t have to（不必），不用 mustn\'t（禁止）。',
          '情态动词后面用原形：She can <b>sing</b>，不说 She can sings / can to sing。',
        ],
        quiz: [
          { c: 'He can ___ English very well.', o: ['speak', 'speaks', 'to speak', 'speaking'], why: '情态动词后接动词原形。' },
          { c: 'You ___ cross the road when the light is red.', o: ["mustn't", "needn't", "don't have to", 'can'], why: '红灯时禁止过马路，用 mustn\'t。' },
          { c: 'Must I clean the room now? No, you ___.', o: ["needn't", "mustn't", "can't", "shouldn't"], why: 'must 问句的否定回答用 needn\'t（不必）。' },
          { c: 'You look tired. You ___ have a rest.', o: ['should', 'must not', "can't", 'may not'], why: '给建议用 should。' },
          { s: 'May I borrow your dictionary?', zh: '我可以借你的词典吗？' },
          { s: 'We should protect the environment.', zh: '我们应该保护环境。' },
        ],
      },
      {
        id: 'g5-2', title: '不定式与动名词', en: 'To Do & Doing',
        intro: '动词做宾语时，有的接 to do（不定式），有的接 doing（动名词），要分别记。',
        rule: `<p>一个句子一般只有一个谓语动词，其他动词要变成<b>非谓语形式</b>：to + 动词原形（不定式）或 动词-ing（动名词）。</p>
<p>动名词还可以做主语：<b>Swimming</b> is good exercise.</p>`,
        table: {
          head: ['后面接 to do', '后面接 doing', '两种都可以'],
          rows: [
            ['want，hope，decide，plan，learn', 'enjoy，finish，mind，practice，keep', 'like，love，start，begin'],
            ['would like，agree，forget to do（忘了要做）', "can't help，give up，be good at", 'remember / forget / stop（意思不同）'],
          ],
        },
        examples: [
          'I [want to be] a pilot.|我想当飞行员。',
          'She [decided to learn] French.|她决定学法语。',
          'He [enjoys playing] the guitar.|他喜欢弹吉他。',
          'Have you [finished reading] the book?|你看完这本书了吗？',
          '[Swimming] is my favorite sport.|游泳是我最喜欢的运动。',
          'Remember [to turn off] the lights.|记得关灯。',
        ],
        traps: [
          '<b>stop doing</b> 停止正在做的事；<b>stop to do</b> 停下来去做另一件事。',
          '<b>remember doing</b> 记得做过；<b>remember to do</b> 记得要去做。',
          '介词后面用 doing：be good at <b>swimming</b>，thank you for <b>helping</b> me。',
        ],
        quiz: [
          { c: 'I hope ___ you again soon.', o: ['to see', 'seeing', 'see', 'saw'], why: 'hope 后接 to do。' },
          { c: 'Do you mind ___ the window?', o: ['opening', 'to open', 'open', 'opened'], why: 'mind 后接 doing。' },
          { c: 'She is good at ___ pictures.', o: ['drawing', 'draw', 'to draw', 'draws'], why: 'at 是介词，后面用 doing。' },
          { c: 'The students stopped ___ when the teacher came in.', o: ['talking', 'to talk', 'talk', 'talked'], why: '停止正在做的事（说话），用 stop doing。' },
          { s: 'My father gave up smoking last year.', zh: '我爸爸去年戒烟了。' },
          { s: 'Would you like to go shopping with me?', zh: '你愿意和我一起去购物吗？' },
        ],
      },
      {
        id: 'g5-3', title: '被动语态', en: 'The Passive Voice',
        intro: '主语是动作的承受者时用被动语态：be + 过去分词，"被……"。',
        rule: `<p>主动语态：主语是动作的执行者（Many people <b>speak</b> English）。被动语态：主语是动作的承受者（English <b>is spoken</b> by many people）。</p>
<p>被动语态 = <b>be + 过去分词</b>，时态由 be 体现；动作的执行者用 <b>by</b> 引出，不重要时可以省略。</p>`,
        forms: [
          { label: '一般现在时', parts: ['主语', 'am / is / are', '过去分词', '(by…)'] },
          { label: '一般过去时', parts: ['主语', 'was / were', '过去分词', '(by…)'] },
          { label: '一般将来时', parts: ['主语', 'will be', '过去分词', '(by…)'] },
          { label: '含情态动词', parts: ['主语', 'can / must / should + be', '过去分词'] },
        ],
        examples: [
          'English [is spoken] in many countries.|很多国家都说英语。',
          'This bridge [was built] in 1990.|这座桥建于 1990 年。',
          'The window [was broken] by Tom.|窗户是汤姆打破的。',
          'The meeting [will be held] next Monday.|会议将在下周一召开。',
          'Trees [should be planted] every year.|每年都应该植树。',
          'My bike [was stolen] yesterday.|我的自行车昨天被偷了。',
        ],
        traps: [
          '被动语态别漏了 be：The book <b>was</b> written by him，不说 The book written by him。',
          '只有及物动词才有被动语态：happen、take place 没有被动，不说 was happened。',
        ],
        quiz: [
          { c: 'Paper ___ by the Chinese long ago.', o: ['was invented', 'invented', 'is invented', 'was invent'], why: '纸是被发明的，long ago 用一般过去时被动 was invented。' },
          { c: 'Football ___ all over the world.', o: ['is played', 'plays', 'is playing', 'played'], why: '足球是被踢的，表示普遍情况用一般现在时被动。' },
          { c: 'The work must ___ before Friday.', o: ['be finished', 'finish', 'finished', 'be finish'], why: '情态动词的被动：must be + 过去分词。' },
          { c: 'The accident ___ last night.', o: ['happened', 'was happened', 'is happened', 'happens'], why: 'happen 是不及物动词，没有被动语态。' },
          { s: 'This story was written by Lu Xun.', zh: '这个故事是鲁迅写的。' },
          { s: 'Rice is grown in the south of China.', zh: '中国南方种植水稻。' },
        ],
      },
      {
        id: 'g5-4', title: '比较级与最高级', en: 'Comparatives & Superlatives',
        intro: '两者比较用比较级 + than，三者及以上比较用 the + 最高级。',
        rule: `<p><b>比较级</b>：A + 动词 + 比较级 + <b>than</b> + B（Tom is taller than Jim）。</p>
<p><b>最高级</b>：A + 动词 + <b>the</b> + 最高级 + of / in…（Tom is the tallest in our class）。</p>
<p>同级比较：<b>as + 原级 + as</b>（和……一样）；否定 not as / so … as（不如……）。</p>`,
        table: {
          head: ['规则', '原级 → 比较级 → 最高级'],
          rows: [
            ['一般加 -er / -est', 'tall → taller → tallest'],
            ['以 e 结尾加 -r / -st', 'nice → nicer → nicest'],
            ['辅音 + y 结尾，变 y 为 i', 'happy → happier → happiest'],
            ['重读闭音节，双写末尾辅音', 'big → bigger → biggest，hot → hotter → hottest'],
            ['多音节词前加 more / most', 'beautiful → more beautiful → most beautiful'],
            ['不规则', 'good / well → better → best，bad → worse → worst，many / much → more → most'],
          ],
        },
        examples: [
          'An elephant is [bigger than] a horse.|大象比马大。',
          'This book is [more interesting than] that one.|这本书比那本有趣。',
          'Lily is [the tallest] girl in our class.|莉莉是我们班最高的女孩。',
          'Summer is [the hottest] season of the year.|夏天是一年中最热的季节。',
          'My English is [better] than before.|我的英语比以前好了。',
          'Tom runs [as fast as] Jack.|汤姆跑得和杰克一样快。',
        ],
        traps: [
          '比较级前可以用 much、a little、even 修饰，但不能用 very：<b>much</b> taller，不说 very taller。',
          'as … as 中间用原级：as tall as，不说 as taller as。',
        ],
        quiz: [
          { c: 'My bag is ___ than yours.', o: ['heavier', 'heavy', 'heaviest', 'more heavy'], why: '有 than 用比较级，heavy 变 y 为 i 加 -er。' },
          { c: 'Who is ___ student in your class?', o: ['the best', 'better', 'the better', 'good'], why: '班级里最好的，用最高级 the best。' },
          { c: 'This picture is ___ than that one.', o: ['more beautiful', 'beautifuler', 'most beautiful', 'beautiful'], why: '多音节词的比较级用 more。' },
          { c: 'Tom is as ___ as his father now.', o: ['tall', 'taller', 'tallest', 'the tallest'], why: 'as … as 中间用原级。' },
          { s: 'The Yangtze River is the longest river in China.', zh: '长江是中国最长的河流。' },
          { s: 'Today is much colder than yesterday.', zh: '今天比昨天冷得多。' },
        ],
      },
    ],
  },

  /* ====================================================== */
  {
    id: 6, title: '复合句', en: 'Compound & Complex Sentences', level: '高级', icon: '🔗',
    desc: '用连词把两个句子连起来：并列句和三大从句（状语从句、宾语从句、定语从句）。',
    lessons: [
      {
        id: 'g6-1', title: '并列句', en: 'Compound Sentences',
        intro: '用 and、but、or、so 把两个地位相同的句子连起来。',
        rule: `<p>并列句 = 句子 1 + <b>并列连词</b> + 句子 2，两个句子同样重要。</p>`,
        table: {
          head: ['连词', '关系', '例子'],
          rows: [
            ['and', '并列、顺承（和、然后）', 'I like tea, and my sister likes coffee.'],
            ['but', '转折（但是）', 'He is rich, but he is not happy.'],
            ['or', '选择（或者）；否则', 'Hurry up, or you will be late.'],
            ['so', '结果（所以）', 'It was raining, so we stayed at home.'],
          ],
        },
        examples: [
          'I cleaned my room, [and] my brother washed the dishes.|我打扫房间，我弟弟洗碗。',
          'The box is small, [but] it is very heavy.|这个盒子很小，但是很重。',
          'Would you like tea [or] coffee?|你想喝茶还是咖啡？',
          'Work hard, [or] you will fail the exam.|努力学习，否则你考试会不及格。',
          'She was ill, [so] she didn\'t go to school.|她病了，所以没去上学。',
          'It is late, [and] we should go home now.|很晚了，我们现在该回家了。',
        ],
        traps: [
          '中文说"因为……所以……"，英语里 because 和 so 只能用一个：<b>Because</b> it rained, we stayed home. / It rained, <b>so</b> we stayed home.',
          '同样，although 和 but 不能同时使用。',
        ],
        quiz: [
          { c: 'I wanted to go out, ___ it was raining heavily.', o: ['but', 'and', 'so', 'or'], why: '想出去和下大雨之间是转折关系。' },
          { c: 'Put on your coat, ___ you will catch a cold.', o: ['or', 'and', 'but', 'so'], why: '"否则"用 or。' },
          { c: 'He got up late, ___ he missed the bus.', o: ['so', 'but', 'or', 'because'], why: '起晚了是原因，错过公交是结果，用 so。' },
          { c: 'Because he was tired, ___ went to bed early.', o: ['he', 'so he', 'and he', 'but he'], why: 'because 和 so 不能同时出现。' },
          { s: 'She is young but she knows a lot.', zh: '她虽然年轻，但懂得很多。' },
          { s: 'It was very cold so we stayed inside.', zh: '天很冷，所以我们待在屋里。' },
        ],
      },
      {
        id: 'g6-2', title: '状语从句', en: 'Adverbial Clauses',
        intro: '用 when、because、if、although 等引导的从句，说明主句动作的时间、原因、条件、让步。',
        rule: `<p>状语从句放在主句前面时，中间一般用逗号隔开；放在后面时通常不用逗号。</p>
<p><b>主将从现</b>：when、if 引导的时间或条件从句表示将来时，从句用一般现在时，主句用将来时：If it <b>rains</b> tomorrow, we <b>will</b> stay at home.</p>`,
        table: {
          head: ['类型', '连词', '例子'],
          rows: [
            ['时间', 'when，while，before，after，until，as soon as', 'I will call you when I get home.'],
            ['原因', 'because，since，as', 'He was late because he missed the bus.'],
            ['条件', 'if，unless（除非）', "If you study hard, you'll pass the exam."],
            ['让步', 'although / though（虽然）', 'Although he is old, he is very strong.'],
            ['目的 / 结果', 'so that，so … that', 'He spoke so fast that I couldn\'t follow him.'],
          ],
        },
        examples: [
          '[When] I was young, I lived in a small village.|我小时候住在一个小村庄。',
          'I didn\'t go to school [because] I was sick.|我没去上学，因为我病了。',
          '[If] it rains tomorrow, we will stay at home.|如果明天下雨，我们就待在家里。',
          '[Although] it was cold, he went swimming.|虽然天很冷，他还是去游泳了。',
          'Please wait here [until] I come back.|请在这里等我回来。',
          'She was [so] tired [that] she fell asleep at once.|她累得马上就睡着了。',
        ],
        traps: [
          'if / when 表示将来时，从句不用 will：If it <b>is</b> sunny tomorrow…，不说 If it will be sunny…',
          'although 不能和 but 连用：<b>Although</b> he tried hard, he failed.',
        ],
        quiz: [
          { c: 'I will tell him the news when he ___ back.', o: ['comes', 'will come', 'came', 'is coming to'], why: '主将从现：时间状语从句用一般现在时表示将来。' },
          { c: '___ it was late, he kept working.', o: ['Although', 'Because', 'If', 'So'], why: '天晚了和继续工作之间是让步关系。' },
          { c: 'We will go on a picnic if it ___ fine tomorrow.', o: ['is', 'will be', 'was', 'be'], why: '主将从现：条件状语从句用一般现在时。' },
          { c: 'He didn\'t come to the party ___ he was busy.', o: ['because', 'although', 'until', 'if'], why: '没来聚会的原因是忙。' },
          { s: 'If you need help, please call me.', zh: '如果你需要帮助，请给我打电话。' },
          { s: 'I was watching TV when the phone rang.', zh: '电话响的时候我正在看电视。' },
        ],
      },
      {
        id: 'g6-3', title: '宾语从句', en: 'Object Clauses',
        intro: '一个句子做另一个句子的宾语，常跟在 think、know、say、ask、wonder 等动词后。',
        rule: `<p>宾语从句有三个要点：</p>
<ul><li><b>连接词</b>：陈述句用 <b>that</b>（可省略）；一般疑问句用 <b>if / whether</b>（是否）；特殊疑问句用原来的疑问词。</li>
<li><b>语序</b>：从句一律用<b>陈述句语序</b>（主语在前，谓语在后）。</li>
<li><b>时态</b>：主句是过去时，从句一般也用相应的过去时态；客观真理仍用一般现在时。</li></ul>`,
        forms: [
          { label: '陈述句', parts: ['主句', '(that)', '主语 + 谓语'] },
          { label: '一般疑问句', parts: ['主句', 'if / whether', '主语 + 谓语'] },
          { label: '特殊疑问句', parts: ['主句', '疑问词', '主语 + 谓语'] },
        ],
        examples: [
          'I think [(that) he is right].|我认为他是对的。',
          'She says [she will come tomorrow].|她说她明天会来。',
          'I don\'t know [if he likes music].|我不知道他是否喜欢音乐。',
          'Can you tell me [where the station is]?|你能告诉我车站在哪里吗？',
          'I wonder [what she is doing now].|我想知道她现在在做什么。',
          'The teacher said [that the earth goes around the sun].|老师说地球绕着太阳转。',
        ],
        traps: [
          '从句用陈述句语序：Can you tell me where <b>the station is</b>?，不说 where is the station。',
          'I think … 的否定一般转移到主句：I <b>don\'t think</b> he is right，而不说 I think he isn\'t right。',
        ],
        quiz: [
          { c: 'Could you tell me ___?', o: ['where the post office is', 'where is the post office', 'where the post office was it', 'the post office where is'], why: '宾语从句用陈述句语序。' },
          { c: 'I don\'t know ___ he will come or not.', o: ['whether', 'that', 'what', 'which'], why: '"是否……或不"用 whether。' },
          { c: 'He asked me ___ I was from.', o: ['where', 'that', 'if', 'what'], why: 'be from 问"来自哪里"，用 where。' },
          { c: 'Our teacher told us that light ___ faster than sound.', o: ['travels', 'traveled', 'will travel', 'is traveled'], why: '客观真理在宾语从句中仍用一般现在时。' },
          { s: 'I don\'t know what his name is.', zh: '我不知道他叫什么名字。' },
          { s: 'Do you know if she likes cats?', zh: '你知道她喜不喜欢猫吗？' },
        ],
      },
      {
        id: 'g6-4', title: '定语从句', en: 'Relative Clauses',
        intro: '用一个句子修饰名词，放在被修饰的名词后面，由 who、which、that 等引导。',
        rule: `<p>定语从句跟在被修饰的名词（<b>先行词</b>）后面，相当于一个很长的"……的"。</p>
<ul><li>先行词是<b>人</b>：用 <b>who</b> 或 that（the girl <b>who</b> is singing）</li>
<li>先行词是<b>物</b>：用 <b>which</b> 或 that（the book <b>which</b> I bought）</li>
<li>表示"……的（所属）"：用 <b>whose</b>（the boy <b>whose</b> father is a doctor）</li>
<li>表示地点、时间：<b>where</b>、<b>when</b>（the town <b>where</b> I was born）</li></ul>
<p>关系词在从句中做宾语时可以省略：the book (that) I bought。</p>`,
        forms: [
          { label: '结构', parts: ['先行词（名词）', 'who / which / that / whose', '从句'] },
        ],
        examples: [
          'The girl [who is singing] is my sister.|正在唱歌的女孩是我妹妹。',
          'This is the book [which I bought yesterday].|这就是我昨天买的书。',
          'I like teachers [who are patient].|我喜欢有耐心的老师。',
          'He has a friend [whose father is a pilot].|他有个朋友，那个朋友的爸爸是飞行员。',
          'This is the house [where Lu Xun once lived].|这是鲁迅曾经住过的房子。',
          'The movie [(that) we saw last night] was great.|我们昨晚看的电影很精彩。',
        ],
        traps: [
          '关系词已经代替了先行词，从句里不要重复：the book which I bought，不说 the book which I bought <b>it</b>。',
          '先行词被 all、everything、最高级、序数词修饰时，常用 that：This is the best film <b>that</b> I have ever seen.',
        ],
        quiz: [
          { c: 'The man ___ is talking to my father is our new teacher.', o: ['who', 'which', 'whose', 'where'], why: '先行词 the man 是人，在从句中做主语，用 who。' },
          { c: 'I lost the watch ___ my uncle gave me.', o: ['that', 'who', 'whose', 'where'], why: '先行词 the watch 是物，用 that / which。' },
          { c: 'I know a girl ___ mother is a famous singer.', o: ['whose', 'who', 'which', 'that'], why: '"她的妈妈"表示所属，用 whose。' },
          { c: 'This is the city ___ I was born.', o: ['where', 'which', 'who', 'whose'], why: '先行词是地点，在从句中做地点状语，用 where。' },
          { s: 'The boy who won the race is my classmate.', zh: '赢得比赛的那个男孩是我的同学。' },
          { s: 'I like the gift that you gave me.', zh: '我喜欢你送我的礼物。' },
        ],
      },
    ],
  },
];
