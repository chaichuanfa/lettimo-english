/* 拼读引擎：把单词切成字母组合（grapheme），并推断每个组合的读音（音素 id）。 */
(function () {
  const VOWELS = 'aeiou';
  const isVowelChar = (c) => VOWELS.includes(c);

  // 通用多字母组合（按长度优先匹配）
  const MULTI = [
    'tion', 'sion', 'ture', 'eigh',
    'tch', 'dge', 'igh', 'air', 'are', 'ear', 'eer', 'ore',
    'sh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'nk', 'qu', 'kn', 'wr', 'gn', 'mb',
    'ee', 'ea', 'ai', 'ay', 'oa', 'oe', 'ow', 'ou', 'oi', 'oy', 'oo',
    'ar', 'or', 'er', 'ir', 'ur', 'aw', 'au', 'ew', 'ue', 'ie', 'ey', 'ui',
    'll', 'ss', 'ff', 'zz', 'pp', 'bb', 'tt', 'dd', 'gg', 'mm', 'nn', 'rr', 'cc',
  ];
  // 只在特定位置成立的组合
  const POS = {
    kn: (w, i) => i === 0, wr: (w, i) => i === 0,
    gn: (w, i, g) => i === 0 || i + g.length === w.length,
    mb: (w, i, g) => i + g.length === w.length,
    ey: (w, i, g) => i + g.length === w.length,
    le: (w, i, g) => i + g.length === w.length && i > 0 && !isVowelChar(w[i - 1]),
    ed: (w, i, g) => i + g.length === w.length && i > 1,
    al: (w, i) => /^al(l|k|t)/.test(w.slice(i)),
  };

  const DEFAULT = {
    c: 'k', x: 'x', qu: 'qu', ck: 'k', ll: 'l', ss: 's', ff: 'f', zz: 'z',
    sh: 'sh', ch: 'ch', tch: 'ch', th: 'th', wh: 'w', ph: 'f', ng: 'ng', nk: 'nk',
    kn: 'n', wr: 'r', gn: 'n', mb: 'm', dge: 'j',
    a: 'a_s', e: 'e_s', i: 'i_s', o: 'o_s', u: 'u_s',
    ee: 'e_l', ea: 'e_l', ey: 'e_l', ai: 'a_l', ay: 'a_l', eigh: 'a_l',
    oa: 'o_l', oe: 'o_l', ow: 'o_l', ou: 'ow', oi: 'oi', oy: 'oi', oo: 'oo_l',
    ar: 'ar', or: 'or', ore: 'or', er: 'er', ir: 'er', ur: 'er',
    aw: 'aw', au: 'aw', al: 'aw', ew: 'oo_l', ue: 'oo_l', ui: 'oo_l', ie: 'i_l', igh: 'i_l',
    air: 'air', are: 'air', ear: 'ear', eer: 'ear',
    le: 'le', tion: 'tion', sion: 'sion', ture: 'ture', ed: 'd',
  };
  const LONG = { a: 'a_l', e: 'e_l', i: 'i_l', o: 'o_l', u: 'u_l' };
  const OPEN_WORDS = new Set(['he', 'me', 'we', 'be', 'she', 'go', 'no', 'so', 'hi', 'i']);

  function parseWord(raw) {
    const [word, zh = '', emoji = '', ov = ''] = raw.split('|');
    const override = {};
    ov.split(',').filter(Boolean).forEach((p) => { const [g, s] = p.split(':'); override[g] = s; });
    const syllabic = word.includes('·');
    const syllables = syllabic ? word.split('·').map((s) => ({ t: s.replace("'", ''), stress: s.startsWith("'") })) : null;
    const manual = !syllabic && word.includes('-') ? word.split('-') : null;
    const text = word.replace(/[·'\-]/g, '');
    return { raw, text, zh, emoji, override, syllables, manual };
  }

  function lessonInfo(lesson) {
    const priority = [];
    const soundMap = {};
    const focus = [];
    const silentFocus = []; // 不发音字母卡片：只高亮真正不发音的那个字母
    (lesson.cards || []).forEach((c) => {
      if (c.s === 'silent') { if (!silentFocus.includes(c.g)) silentFocus.push(c.g); return; }
      if (!focus.includes(c.g)) focus.push(c.g);
      // blend：连缀（每个字母各自发音）；noMap：仅用于展示和高亮，不参与切分与读音推断
      if (c.blend || c.noMap || c.g.includes('_')) return;
      if (c.g.length >= 2 && !priority.includes(c.g)) priority.push(c.g);
      if (typeof c.s === 'string' && !(c.g in soundMap)) soundMap[c.g] = c.s;
    });
    (lesson.cards || []).forEach((c) => { if (c.g.includes('_') && typeof c.s === 'string' && !(c.g in soundMap)) soundMap[c.g] = c.s; });
    const ySounds = (lesson.cards || []).filter((c) => c.g === 'y' && typeof c.s === 'string').map((c) => c.s);
    return { priority, soundMap, focus, silentFocus, ySounds };
  }

  function split(lw, priority) {
    const list = [...priority, ...MULTI].sort((a, b) => b.length - a.length);
    const segs = [];
    let i = 0;
    while (i < lw.length) {
      let hit = null;
      for (const g of list) {
        if (!lw.startsWith(g, i)) continue;
        const posOk = POS[g] ? POS[g](lw, i, g) : true;
        if (posOk || priority.includes(g) && !POS[g]) { hit = g; break; }
      }
      hit = hit || lw[i];
      segs.push({ t: hit, start: i });
      i += hit.length;
    }
    return segs;
  }

  function analyze(raw, lesson) {
    const w = typeof raw === 'string' ? parseWord(raw) : raw;
    const info = lesson ? lessonInfo(lesson) : { priority: [], soundMap: {}, focus: [], silentFocus: [], ySounds: [] };
    const lw = w.text.toLowerCase();
    if (w.syllables) return { ...w, segs: null };

    let segs;
    if (w.manual) {
      let p = 0;
      segs = w.manual.map((t) => { const s = { t: t.toLowerCase(), start: p }; p += t.length; return s; });
    } else segs = split(lw, info.priority);

    const n = segs.length;
    const isCons = (s) => s && !/[aeiouy]/.test(s.t[0]) || (s && s.t === 'y' && s.start === 0);
    // magic e：单元音 + 单辅音块 + 词尾 e
    let magic = -1;
    if (n >= 3 && segs[n - 1].t === 'e' && isCons(segs[n - 2]) && segs[n - 3].t.length === 1 && isVowelChar(segs[n - 3].t)) magic = n - 3;
    const magicKey = magic >= 0 ? segs[magic].t + '_e' : null;

    const occ = {};
    segs.forEach((s, idx) => {
      const g = s.t;
      const next = segs[idx + 1];
      occ[g] = (occ[g] || 0) + 1;
      const nth = w.override[`${g}#${occ[g]}`]; // 覆盖第 n 个同名字母组合，如 a#2:o_s
      const lessonSid = info.soundMap[g];
      const softOnly = (g === 'c' && lessonSid === 's') || (g === 'g' && lessonSid === 'j');
      const softCtx = !!next && /^[eiy]/.test(next.t);
      let sid;
      if (nth) sid = nth;
      else if (w.override[g]) sid = w.override[g];
      else if (idx === magic && w.override[magicKey]) sid = w.override[magicKey];
      else if (idx === magic && info.soundMap[magicKey]) sid = info.soundMap[magicKey];
      else if (idx === n - 1 && g === 'e' && n > 2 && isCons(segs[n - 2])) sid = 'silent';
      else if (lessonSid && !(g === 'y' && idx === 0) && (!softOnly || softCtx)) sid = lessonSid;
      else if (g === 'c') sid = next && /^[eiy]/.test(next.t) ? 's' : 'k';
      else if (g === 'g') sid = next && next.t === 'e' && idx === n - 2 ? 'j' : 'g';
      else if (g === 'y') sid = idx === 0 ? 'y' : idx === n - 1 ? (segs.some((x, k) => k < idx && /[aeiou]/.test(x.t)) ? 'e_l' : 'i_l') : 'i_s';
      else if (g.length === 1 && isVowelChar(g)) {
        if (idx === magic) sid = LONG[g];
        else if (idx === n - 1 && OPEN_WORDS.has(lw)) sid = LONG[g];
        else sid = DEFAULT[g];
      } else if (g === 's' && magic >= 0 && idx === n - 2) sid = 'z';
      else if (g.length === 2 && g[0] === g[1] && !isVowelChar(g[0])) sid = g[0] === 'c' ? 'k' : g[0];
      else sid = DEFAULT[g] || g;
      s.sid = SOUNDS[sid] ? sid : null;
      s.silent = sid === 'silent';
      s.display = w.text.substr(s.start, g.length);
    });

    // 高亮本课重点
    const mark = new Array(lw.length).fill(false);
    info.focus.forEach((f) => {
      if (f.includes('_')) {
        if (magic >= 0 && magicKey === f) { mark[segs[magic].start] = true; mark[lw.length - 1] = true; }
        return;
      }
      if (f === 'y') { // 只高亮读音与本课 y 卡片一致的 y
        segs.forEach((sg) => { if (sg.t === 'y' && info.ySounds.includes(sg.sid)) mark[sg.start] = true; });
        return;
      }
      if (f === 'ed' || f === 'le') { if (lw.endsWith(f)) { mark[lw.length - 2] = mark[lw.length - 1] = true; } return; }
      let from = 0, at;
      while ((at = lw.indexOf(f, from)) !== -1) { for (let k = at; k < at + f.length; k++) mark[k] = true; from = at + 1; }
    });
    segs.forEach((s) => {
      s.hl = mark.slice(s.start, s.start + s.t.length).some(Boolean);
      // 软音课：只高亮真正读软音的 c / g
      const want = info.soundMap[s.t];
      if (s.hl && (s.t === 'c' || s.t === 'g') && (want === 's' || want === 'j') && s.sid !== want) s.hl = false;
      if (s.silent && info.silentFocus.includes(s.t)) s.hl = true;
      if (magic >= 0 && s === segs[n - 1] && mark[lw.length - 1]) s.magic = true;
    });
    return { ...w, segs };
  }

  /* ---------- 字母块 ↔ 音标音素 对齐 ---------- */
  const VOWEL_RE = /[aeiouæɑɔəɛɪʊʌɝɚ]/;
  const normIPA = (x) => x.replace(/[ˈˌː]/g, '').replace(/ər|ɚ|ɜr|ɜ/g, 'ɝ');
  function soundIPA(sid) {
    const S = SOUNDS[sid];
    if (!S || sid === 'silent') return '';
    return S.seq ? S.seq.map(soundIPA).join('') : S.ipa;
  }
  function editDist(a, b) {
    a = [...a]; b = [...b];
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  // 返回数组：第 i 个字母块对应的音素下标列表
  function alignSegs(segs, tokens) {
    const exp = segs.map((s) => normIPA(s.silent ? '' : soundIPA(s.sid)));
    const n = segs.length, m = tokens.length, MAXK = 4;
    const INF = 1e9;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
    const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    dp[0][0] = 0;
    for (let i = 1; i <= n; i++) for (let j = 0; j <= m; j++) {
      for (let k = 0; k <= Math.min(MAXK, j); k++) {
        if (dp[i - 1][j - k] >= INF) continue;
        const got = normIPA(tokens.slice(j - k, j).join(''));
        // 不发音的块尽量不分配音素；发音的块尽量至少分到一个
        const c = editDist(exp[i - 1], got) + (k === 0 && exp[i - 1] ? 0.5 : 0) + (k > 0 && !exp[i - 1] ? 1 : 0);
        const v = dp[i - 1][j - k] + c;
        if (v < dp[i][j]) { dp[i][j] = v; back[i][j] = k; }
      }
    }
    const map = new Array(n);
    let j = m;
    for (let i = n; i >= 1; i--) { const k = back[i][j]; map[i - 1] = Array.from({ length: k }, (_, t) => j - k + t); j -= k; }
    return map;
  }
  function alignSyllables(syllables, tokens) {
    const vIdx = tokens.map((t, i) => (VOWEL_RE.test(t.replace(/[ˈˌ]/g, '')) ? i : -1)).filter((i) => i >= 0);
    if (vIdx.length !== syllables.length) return null;
    const starts = [0];
    for (let k = 1; k < vIdx.length; k++) {
      const a = vIdx[k - 1], b = vIdx[k];
      const between = b - a - 1;
      let start = b;
      const marked = tokens.slice(a + 1, b + 1).findIndex((t) => /^[ˈˌ]/.test(t));
      if (marked >= 0) start = a + 1 + marked;
      else if (between >= 2) start = a + 2;
      else if (between === 1) start = /[^aeiouy]$/i.test(syllables[k - 1].t) ? b : a + 1;
      starts.push(start);
    }
    const out = starts.map((st, k) => { const end = k + 1 < starts.length ? starts[k + 1] : tokens.length; return Array.from({ length: end - st }, (_, t) => st + t); });
    // 音节交界处的辅音：拼写上两边都有这个辅音（rab·bit、lit·tle）时，这个音同时属于前后两个音节，
    // 这样拼读时前一个音节读 "rab"、后一个读 "bit"，而不是 "ra" + "bit"
    const isV = (i) => i >= 0 && i < tokens.length && VOWEL_RE.test(tokens[i].replace(/[ˈˌ]/g, ''));
    for (let k = 1; k < out.length; k++) {
      const prev = syllables[k - 1].t.toLowerCase(), cur = syllables[k].t.toLowerCase();
      const a = out[k - 1], b = out[k];
      if (!a.length || !b.length) continue;
      const curStartsCons = /^[^aeiou]/.test(cur), prevEndsCons = /[^aeiouy]$/.test(prev) && !/e$/.test(prev);
      if (curStartsCons && isV(b[0]) && !isV(a[a.length - 1])) b.unshift(a[a.length - 1]);
      else if (prevEndsCons && isV(a[a.length - 1]) && !isV(b[0])) a.push(b[0]);
    }
    return out;
  }
  // 用字母↔音素对齐（js/g2p.js）按拼写划分音节：每个音节取它所含字母块的音；
  // 横跨音节边界的字母块（rab·bit 的 bb、lit·tle 的 tt）的音同时属于前后两个音节
  function alignSyllablesBySpelling(syllables, tokens) {
    const G = window.G2P;
    if (!G) return null;
    const text = syllables.map((s) => s.t).join('').toLowerCase();
    const r = G.align(text, tokens);
    if (!r || r.irregular) return null;
    let pos = 0;
    return syllables.map((sy) => {
      const s0 = pos, s1 = pos + sy.t.length;
      pos = s1;
      const idx = [];
      r.segs.forEach((sg) => {
        const e = sg.start + sg.t.length;
        if (sg.start >= s1 || e <= s0) return;
        const straddles = sg.start < s0 || e > s1;
        // 横跨边界、且一个字母对应一个音（jun·gle 的 ng = /ŋ/+/g/）：按字母分给两边；否则（双写辅音）两边共用
        if (straddles && sg.ph.length === sg.t.length) sg.ph.forEach((ph, i) => { if (sg.start + i >= s0 && sg.start + i < s1) idx.push(ph); });
        else idx.push(...sg.ph);
      });
      return [...new Set(idx)].sort((x, y) => x - y);
    });
  }
  function alignIPA(a, tokens) {
    if (!tokens || !tokens.length) return null;
    if (a.syllables) return alignSyllablesBySpelling(a.syllables, tokens) || alignSyllables(a.syllables, tokens);
    return alignSegs(a.segs, tokens);
  }

  window.Phonics = { parseWord, analyze, lessonInfo, alignIPA };
})();
