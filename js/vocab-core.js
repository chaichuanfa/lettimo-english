/* 背单词核心逻辑：排期、每日学习队列、出题选项、进度合并。
 * 只有纯函数和一个会话状态机，不碰 DOM、不碰存储、不读全局变量——网页端（js/words.js）只负责显示和保存。
 * 浏览器里挂在 window.VocabCore；Node 里可以直接 require（见 tests/vocab-core.test.mjs）。
 * 以后做 Android / iOS 时这一层原样复用，或照着测试用例重写。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VocabCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  /* ---------------- 排期 ----------------
   * 每个词一条记录 { s, d, r, l, t, k? }
   *   s 阶段：0 = 今天刚认识、还没通过当场巩固；1–7 = 复习中；8 = 已掌握
   *   d 到期日（天数序号，见 dayIndex）；已掌握的词为 null
   *   r 答题次数   l 答错次数   t 最后更新时间（秒，合并两台设备的进度时取较新的一条）
   *   k 初筛时就认识的词记 1 */
  const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60];   // 第 s 阶段答对后，隔几天再复习
  const MASTERED = 8;
  const LEECH_LAPSES = 3;                           // 累计错这么多次算"顽固词"
  const DAY_START_HOUR = 4;                         // 凌晨 4 点才算新的一天，熬夜学习不会被切成两天

  // 把时间戳换成"第几天"。存天数而不是时间戳，跨时区、跨设备时到期日不会漂移
  function dayIndex(ms, tzOffsetMin) {
    const off = tzOffsetMin === undefined ? new Date(ms).getTimezoneOffset() : tzOffsetMin;
    return Math.floor((ms - off * 60000 - DAY_START_HOUR * 3600000) / 86400000);
  }
  const dayToDate = (day) => new Date(day * 86400000 + 12 * 3600000);   // 仅用于显示（取当天中午，避开时区边界）

  const introduce = (today, t) => ({ s: 0, d: today, r: 0, l: 0, t });
  const markKnown = (today, t) => ({ s: 7, d: today + INTERVALS[7], r: 1, l: 0, t, k: 1 });   // 认识的词 60 天后抽查一次
  const graduate = (rec, today, t) => ({ ...rec, s: 1, d: today + INTERVALS[1], r: rec.r + 1, t });
  function review(rec, ok, today, t) {
    if (ok) {
      const s = rec.s + 1;
      return s >= MASTERED ? { ...rec, s: MASTERED, d: null, r: rec.r + 1, t } : { ...rec, s, d: today + INTERVALS[s], r: rec.r + 1, t };
    }
    const s = Math.max(1, rec.s - 2);   // 答错降两级
    return { ...rec, s, d: today + INTERVALS[s], r: rec.r + 1, l: rec.l + 1, t };
  }
  // 课程测验里答错的词进入复习：没背过的从第 1 阶段开始，背过的按答错处理；今天就到期
  function wrongAnswer(rec, today, t) {
    if (!rec) return { s: 1, d: today, r: 0, l: 1, t };
    if (rec.s === 0) return rec;
    const s = Math.max(1, Math.min(rec.s, MASTERED - 1) - 2);
    return { ...rec, s, d: today, l: rec.l + 1, t };
  }
  // 复习题型随熟练度变难
  function questionType(stage, settings) {
    if (stage <= 2) return 'meaning';              // 看词选义
    if (stage <= 4) return 'audio';                // 听音选义
    return settings && settings.spelling === false ? 'recall' : 'spell';   // 听音拼写 / 回忆后自评
  }

  /* ---------------- 进度数据 ---------------- */
  const emptyData = () => ({ v: 1, settings: { book: null, newPerDay: 10, reviewCap: 100, spelling: true }, words: {}, days: {}, custom: [] });
  function normalize(raw) {
    const d = emptyData();
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return d;
    Object.assign(d.settings, raw.settings || {});
    if (raw.words && typeof raw.words === 'object') d.words = raw.words;
    if (raw.days && typeof raw.days === 'object') d.days = raw.days;
    if (Array.isArray(raw.custom)) d.custom = raw.custom.filter((w) => typeof w === 'string');
    return d;
  }
  const isValid = (raw) => !!raw && typeof raw === 'object' && raw.v === 1 && !!raw.words && typeof raw.words === 'object';
  // 合并两份进度（导入文件、以后的云同步）：每个词取更新时间较新的一条；每天的统计取较大值；生词本取并集
  function mergeData(local, other) {
    const a = normalize(local), b = normalize(other);
    const out = normalize(JSON.parse(JSON.stringify(a)));
    for (const [w, rec] of Object.entries(b.words)) { if (!out.words[w] || (rec.t || 0) > (out.words[w].t || 0)) out.words[w] = rec; }
    for (const [day, x] of Object.entries(b.days)) {
      const y = out.days[day] || {};
      out.days[day] = { n: Math.max(x.n || 0, y.n || 0), k: Math.max(x.k || 0, y.k || 0), r: Math.max(x.r || 0, y.r || 0), ok: Math.max(x.ok || 0, y.ok || 0) };
    }
    out.custom = [...new Set([...a.custom, ...b.custom])];
    if (!out.settings.book) out.settings = { ...b.settings };
    return out;
  }

  /* ---------------- 今天的计划 ---------------- */
  // order：当前词书的单词，按学习顺序排列
  function planToday(data, order, today) {
    const W = data.words;
    const due = [], learning = [];
    for (const w of Object.keys(W)) {
      const r = W[w];
      if (r.s === 0) learning.push(w);
      else if (r.s < MASTERED && r.d !== null && r.d <= today) due.push(w);
    }
    due.sort((x, y) => W[x].d - W[y].d || W[x].s - W[y].s || (x < y ? -1 : 1));   // 拖得最久的先复习
    const cap = data.settings.reviewCap, per = data.settings.newPerDay;
    // 欠的复习太多时少学或不学新词，避免越积越多
    const backlog = due.length > cap * 2 ? 'stop' : due.length > cap ? 'half' : 'none';
    const allowed = backlog === 'stop' ? 0 : backlog === 'half' ? Math.ceil(per / 2) : per;
    const introducedToday = (data.days[today] && data.days[today].n) || 0;
    let unseen = 0;
    for (const w of order) if (!W[w]) unseen++;
    return {
      due: due.length, dueWords: due.slice(0, cap), learning, backlog, introducedToday, unseen,
      newQuota: Math.max(0, Math.min(allowed - introducedToday, unseen)),
    };
  }

  function bookStats(data, order) {
    const out = { total: order.length, unseen: 0, learning: 0, familiar: 0, mastered: 0 };
    for (const w of order) {
      const r = data.words[w];
      if (!r) out.unseen++;
      else if (r.s >= MASTERED || r.k) out.mastered++;   // 初筛就认识的词直接算掌握
      else if (r.s >= 5) out.familiar++;
      else out.learning++;
    }
    return out;
  }
  const active = (x) => !!x && (x.n || 0) + (x.k || 0) + (x.r || 0) > 0;
  // 连续学习天数：今天还没学时，从昨天往前数
  function streak(data, today) {
    let d = active(data.days[today]) ? today : today - 1, n = 0;
    while (active(data.days[d])) { n++; d--; }
    return n;
  }
  const leeches = (data) => Object.keys(data.words).filter((w) => data.words[w].l >= LEECH_LAPSES && data.words[w].s < MASTERED).sort();

  /* ---------------- 释义与选项 ---------------- */
  const cleanSense = (s) => s.replace(/（[^）]*）|\([^)]*\)|<[^>]*>|\[[^\]]*\]|【[^】]*】/g, '').replace(/\.{2,}|…+/g, '…').trim();
  // 从词典的完整释义里取一个短释义：最多两个词性，每个词性两个义项。选义题的选项、卡片标题都用它
  function shortGloss(zh) {
    const groups = [];
    let plain = '';
    for (const line of String(zh || '').split('\n')) {
      const m = line.match(/^([a-z]+)\.\s*(.*)$/);
      if (!m) { if (!plain) plain = line; continue; }
      const pos = /^v[it]$/.test(m[1]) ? 'v' : m[1];
      const all = m[2].split(/[；;]/).map(cleanSense).filter(Boolean);
      const senses = all.filter((s) => s.length <= 12);
      if (!senses.length && all.length) senses.push(all[0]);
      if (!senses.length) continue;
      const g = groups.find((x) => x[0] === pos);
      if (g) senses.forEach((s) => { if (!g[1].includes(s)) g[1].push(s); });
      else groups.push([pos, senses]);
    }
    if (!groups.length) return plain.split(/[；;]/).map(cleanSense).filter(Boolean).slice(0, 2).join('；');
    return groups.slice(0, 2).map(([p, s]) => `${p}. ${s.slice(0, 2).join('；')}`).join('　');
  }
  const glossPos = (g) => { const m = String(g).match(/^([a-z]+)\./); return m ? m[1] : ''; };
  // 把短释义拆成一个个义项（去掉词尾的"的 / 地"）。两个释义只要有义项相同或互相包含，就算意思重合：
  // "在；向" 和 "在…之间" 都有"在"，"收集" 和 "收集物" 互相包含——这样的词不能互为干扰项
  const senses = (g) => [...new Set(String(g).split(/[^一-鿿]+/).map((s) => s.replace(/(?<=.)[的地]$/, '')).filter(Boolean))];
  const overlap = (a, b) => a.some((x) => b.some((y) => x === y || (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x)))));
  const related = (a, b) => { const n = Math.min(a.length, b.length, 5); return n >= 4 && a.slice(0, n) === b.slice(0, n); };   // abandon / abandoned
  function shuffle(a, rng) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // 选义题：从 pool 里挑 3 个干扰释义。优先同词性；意思有重合的词、同根词不选
  // target / pool 的元素：{ w, g }（g 为短释义）
  function meaningOptions(target, pool, rng) {
    const mine = senses(target.g), pos = glossPos(target.g);
    const ok = (x) => x.w !== target.w && x.g && x.g !== target.g && !related(x.w, target.w) && !overlap(senses(x.g), mine);
    const cands = shuffle(pool.filter(ok), rng);
    const out = [];
    const take = (list) => { for (const x of list) { if (out.length >= 3) break; if (!out.some((y) => y.g === x.g || overlap(senses(y.g), senses(x.g)))) out.push(x); } };
    take(cands.filter((x) => glossPos(x.g) === pos));
    take(cands);
    return { options: shuffle([target.g, ...out.map((x) => x.g)], rng), answer: target.g };
  }
  // 听音选词：挑 3 个拼写相近的词（同首字母、长度相近），读音相同或同根的不选
  function wordOptions(target, pool, rng) {
    const ok = (x) => x.w !== target.w && !related(x.w, target.w) && (!x.ipa || x.ipa !== target.ipa);
    const cands = shuffle(pool.filter(ok), rng);
    const near = cands.filter((x) => x.w[0] === target.w[0] && Math.abs(x.w.length - target.w.length) <= 2);
    const out = [];
    for (const x of [...near, ...cands]) { if (out.length >= 3) break; if (!out.includes(x.w)) out.push(x.w); }
    return { options: shuffle([target.w, ...out], rng), answer: target.w };
  }

  /* ---------------- 一次学习的状态机 ----------------
   * 顺序：先复习到期的词 → 上次没巩固完的词 → 新词（5 个一组：摸底 → 学习卡片 → 当场巩固）。
   * 摸底不问"认不认识"，直接出一道选义题（probe）：答错就是生词，进入学习；答对的词再考一道（verify，
   * 换一组干扰项），两次都对才算认识并跳过——四选一蒙对一次的概率是 1/4，连对两次是 1/16。
   * 用法：s.current() 取当前任务，界面显示并得到结果后调用 s.submit(结果)，然后保存 data。
   * 任务：{ kind: 'review'|'probe'|'verify'|'learn'|'drill', w, qtype?, retry? }
   * 结果：learn → {}；其余 → { ok } */
  const DRILLS = ['meaning', 'listen'];
  function createSession(opts) {
    const { data, order, today } = opts;
    const now = opts.now || (() => Date.now());
    const rng = opts.rng || Math.random;
    const groupSize = opts.groupSize || 5;
    const W = data.words;
    const stamp = () => Math.floor(now() / 1000);
    const dayLog = () => (data.days[today] ||= { n: 0, k: 0, r: 0, ok: 0 });
    const plan = planToday(data, order, today);
    // reviewOnly：从"复习"页进来，只复习到期的词；extra：今天的量学完后"再学一组"
    const quota = opts.reviewOnly ? 0 : opts.extra ? Math.min(opts.extra, plan.unseen) : plan.newQuota;
    const q = plan.dueWords.map((w) => ({ kind: 'review', w, qtype: questionType(W[w].s, data.settings) }));
    const reviewTotal = q.length;
    const pending = opts.reviewOnly ? [] : plan.learning.slice();
    const need = {};
    const tally = { introduced: 0, known: 0, graduated: 0, reviewDone: 0, reviewRight: 0 };
    let grp = null, cursor = 0;

    const pushDrills = (ws) => {
      ws.forEach((w) => { need[w] = new Set(DRILLS); q.push({ kind: 'learn', w }); });
      DRILLS.forEach((qtype) => shuffle(ws, rng).forEach((w) => q.push({ kind: 'drill', w, qtype })));
    };
    function refill() {
      if (grp && grp.stage === 'probe') {
        // 答对一次、等着复核的词（maybe）先按生词占名额，免得复核没过时超出每天的新词量
        if (grp.cands.length && tally.introduced + grp.maybe.length < quota) { q.push({ kind: 'probe', w: grp.cands.shift() }); return true; }
        grp.stage = 'verify';
        if (grp.maybe.length) { shuffle(grp.maybe, rng).forEach((w) => q.push({ kind: 'verify', w })); grp.maybe = []; return true; }
      }
      if (grp && grp.stage === 'verify') {
        if (grp.cands.length && tally.introduced < quota) { grp.stage = 'probe'; return refill(); }   // 有的词确认认识，名额空出来了，接着摸底
        grp.stage = 'drill';
        if (grp.unknown.length) { pushDrills(grp.unknown); return true; }
      }
      grp = null;
      if (pending.length) { pushDrills(pending.splice(0, groupSize)); return true; }
      if (tally.introduced < quota) {
        const cands = [];
        while (cands.length < groupSize && cursor < order.length) { const w = order[cursor++]; if (!W[w]) cands.push(w); }
        if (cands.length) { grp = { stage: 'probe', cands, maybe: [], unknown: [] }; return refill(); }
      }
      return false;
    }
    const requeue = (task, gap) => q.splice(Math.min(gap, q.length), 0, { ...task, retry: true });   // 答错的题隔几题再出现
    const startLearning = (w) => { W[w] = introduce(today, stamp()); dayLog().n++; tally.introduced++; grp.unknown.push(w); };

    return {
      plan, quota, reviewTotal,
      current() { while (!q.length) { if (!refill()) return null; } return q[0]; },
      submit(res) {
        const task = q.shift();
        if (!task) return;
        const w = task.w;
        if (task.kind === 'review') {
          if (!task.retry) {
            const log = dayLog(); log.r++; tally.reviewDone++;
            if (res.ok) { log.ok++; tally.reviewRight++; }
            W[w] = review(W[w], !!res.ok, today, stamp());
          }
          if (!res.ok) requeue(task, 4);   // 当次重考到答对为止；重考不再改变阶段
        } else if (task.kind === 'probe') {
          if (res.ok) grp.maybe.push(w);   // 可能认识，也可能是蒙对的：这一组摸底完再考一次
          else startLearning(w);
        } else if (task.kind === 'verify') {
          if (res.ok) { W[w] = markKnown(today, stamp()); dayLog().k++; tally.known++; }
          else startLearning(w);
        } else if (task.kind === 'drill') {
          if (!res.ok) { requeue(task, 3); return; }
          need[w]?.delete(task.qtype);
          if (need[w] && !need[w].size) { delete need[w]; if (W[w] && W[w].s === 0) { W[w] = graduate(W[w], today, stamp()); tally.graduated++; } }
        }
      },
      // 界面查不到某个词的释义（词典里没有，或网络出错）时调用：这次学习跳过它，进度记录原样保留
      skip() { const task = q.shift(); if (task) { delete need[task.w]; for (let i = q.length - 1; i >= 0; i--) if (q[i].w === task.w) q.splice(i, 1); } },
      progress() { return { ...tally, quota, reviewTotal, left: q.length }; },
    };
  }

  return {
    INTERVALS, MASTERED, LEECH_LAPSES, dayIndex, dayToDate,
    introduce, markKnown, graduate, review, wrongAnswer, questionType,
    emptyData, normalize, isValid, mergeData,
    planToday, bookStats, streak, leeches,
    shortGloss, glossPos, meaningOptions, wordOptions, shuffle,
    createSession,
  };
});
