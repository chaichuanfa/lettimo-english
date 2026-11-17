/* 词典拼读：根据词典读音（CMU 音标）把任意单词切成字母组合，并给出每个组合读的音。
 * 做法：字母序列与音素序列做动态规划对齐，"字母组合 → 读音"对照表里越常见的对应代价越低。
 * 浏览器里挂在 window.G2P，构建脚本里通过 vm 加载。 */
(function (root) {
  // 字母组合 → 读音：多个读法用逗号分隔，读音内的音素用空格分隔，"-" 表示不发音，"/数字" 为代价（越小越常见）
  const TABLE = {
    // 单辅音
    b: 'b', c: 'k, s/.2, ʃ/.8, tʃ/1', d: 'd, t/.5, dʒ/.8', f: 'f, v/1', g: 'g, dʒ/.3, ʒ/.8', h: 'h', j: 'dʒ, j/1, h/1',
    k: 'k', l: 'l, ə l/.3', m: 'm, ə m/.3', n: 'n, ŋ/.3', p: 'p', q: 'k', r: 'r', s: 's, z/.2, ʃ/.6, ʒ/.6', t: 't, ʃ/.6, tʃ/.6, d/1, ʒ/.6',
    v: 'v', w: 'w', x: 'k s, g z/.3, z/.5, k ʃ/.6, g ʒ/1', z: 'z, s/.6, ʒ/.8',
    y: 'j, i/.1, ɪ/.1, aɪ/.1, ə/.3',
    // 双写辅音
    bb: 'b', cc: 'k, k s/.3', dd: 'd', ff: 'f', gg: 'g, g dʒ/.6, dʒ/.4', ll: 'l', mm: 'm', nn: 'n', pp: 'p', rr: 'r',
    ss: 's, ʃ/.5, z/.6', tt: 't', zz: 'z, t s/.3',
    // 辅音组合
    ck: 'k', sh: 'ʃ', ch: 'tʃ, k/.3, ʃ/.4', tch: 'tʃ', th: 'θ, ð', wh: 'w, h/.5', ph: 'f, v/1',
    ng: 'ŋ, ŋ g/.3, ŋ k/.3', nk: 'ŋ k', qu: 'k w, k/.4', kn: 'n', wr: 'r', gn: 'n', mb: 'm', gh: 'g/.3, f/.5, -/.5',
    dge: 'dʒ', dg: 'dʒ', xc: 'k s/.2', sc: 's/.4', tion: 'ʃ ə n, tʃ ə n/.3', sion: 'ʒ ə n, ʃ ə n/.2', ssion: 'ʃ ə n', cian: 'ʃ ə n',
    ture: 'tʃ ɝ', sure: 'ʒ ɝ, ʃ ɝ/.3', ci: 'ʃ/.3, tʃ/.5', ti: 'ʃ/.3, ʒ/.4, tʃ/.4', si: 'ʒ/.3, ʃ/.3', sci: 'ʃ/.3', xi: 'k ʃ/.3',
    gi: 'dʒ/.3', ge: 'dʒ/.3', di: 'dʒ/.4', le: 'ə l', re: 'ɝ/.2', et: 'eɪ/.5', ed: 't/.2, d/.2, ɪ d, ə d', al: 'ɔ/.2, ɑ/.3',
    // 单元音
    a: 'æ, eɪ, ɑ, ə, ɔ/.3, ɛ/.4, ɪ/.5, ʌ/.5', e: 'ɛ, i, ə, ɪ, eɪ/.6', i: 'ɪ, aɪ, i, ə, j/.6', o: 'ɑ, oʊ, ʌ, ə, u/.4, ʊ/.4, ɔ/.3, w ʌ/.6, ɪ/.8',
    u: 'ʌ, u, j u, ʊ, ə, ɪ/.8, ɛ/.8, w/.4, ə w/.4, j ə/.4',
    // 元音组合
    ai: 'eɪ, ɛ/.5, ə/.5', ay: 'eɪ, i/.5', ee: 'i, ɪ/.4', ea: 'i, ɛ, eɪ/.5, ɪ/.4, ə/.5', eigh: 'eɪ, aɪ/.5',
    ei: 'eɪ, i, aɪ/.4, ɛ/.5, ɪ/.5', ey: 'i, eɪ', ie: 'i, aɪ, ɛ/.6, ɪ/.4', igh: 'aɪ', oa: 'oʊ, ɔ/.5', oe: 'oʊ, u/.5',
    ow: 'oʊ, aʊ', ou: 'aʊ, u, ʌ, oʊ/.4, ʊ/.4, ə/.3, ɔ/.4, ɝ/.4', oi: 'ɔɪ', oy: 'ɔɪ', oo: 'u, ʊ, ʌ/.6, oʊ/.6',
    au: 'ɔ, ɑ/.3, æ/.6, oʊ/.6', eau: 'j u, oʊ', aw: 'ɔ, ɑ/.3', ew: 'u, j u', ue: 'u, j u', ui: 'u, ɪ/.6', eu: 'u, j u', uy: 'aɪ',
    augh: 'ɔ, ɑ/.3, æ f/.5', ough: 'ɔ, ɑ/.3, oʊ, u, aʊ, ʌ f, ɔ f, ɑ f/.2, ə/.5',
    // R 控制元音
    ar: 'ɑ r, ɔ r/.3, ɝ/.4', er: 'ɝ, ɪ r/.4', ir: 'ɝ, aɪ r/.3, ɪ r/.3', ur: 'ɝ, ʊ r/.3, j ʊ r/.4, j ɝ/.3', or: 'ɔ r, ɝ/.3',
    arr: 'ɝ/.3, ɑ r/.3', err: 'ɝ/.2, ɛ r/.2', irr: 'ɝ/.2, ɪ r/.2', orr: 'ɝ/.3, ɔ r/.2', urr: 'ɝ/.1',
    ore: 'ɔ r', air: 'ɛ r', are: 'ɛ r, ɑ r/.3', ear: 'ɪ r, ɝ, ɛ r', eer: 'ɪ r', eir: 'ɪ r, ɛ r', our: 'aʊ r, aʊ ɝ, ɔ r, ɝ/.4, ʊ r',
    oor: 'ɔ r, ʊ r', oar: 'ɔ r', ire: 'aɪ r, aɪ ɝ', ure: 'j ʊ r, ʊ r, ɝ/.3, j ɝ/.2',
  };
  // 不发音时的代价（没列出的字母不发音代价很高）
  const SILENT = { e: 0.5, h: 0.6, u: 0.5, w: 0.8, l: 0.8, t: 0.8, b: 1, k: 1, g: 1, p: 1, n: 1, d: 1, c: 1, s: 1, a: 1, i: 1, o: 1, y: 1 };
  // 只在词首 / 词尾成立的组合
  const AT_START = new Set(['kn', 'wr']);
  const AT_END = new Set(['mb', 'ed', 'ey', 're', 'et']);
  const NOT_END = new Set(['ge', 'gi', 'di', 'ci', 'ti', 'si', 'xi', 'sci']); // 词尾的 ge 留给 g + 不发音 e（魔法 e）
  const SEG_COST = 0.05;      // 每多切一块的代价：同等情况下优先用字母组合
  const FALLBACK = 3;         // 对照表里没有的"字母 → 音素"
  const IRREGULAR = 1.5;      // 总代价超过它，标为"不完全符合拼读规则"

  const parsed = {};
  for (const [g, spec] of Object.entries(TABLE)) {
    parsed[g] = spec.split(',').map((alt) => {
      const [ph, cost] = alt.trim().split('/');
      return { ph: ph === '-' ? [] : ph.split(' '), cost: cost ? parseFloat(cost) : 0 };
    });
  }
  const MAXG = Math.max(...Object.keys(TABLE).map((g) => g.length));

  const norm = (t) => t.replace(/[ˈˌː]/g, '').replace('ɚ', 'ɝ');
  const VOWEL_PH = /^(æ|ɑ|ɔ|ə|ɛ|ɪ|ʊ|ʌ|ɝ|i|u|eɪ|aɪ|oʊ|aʊ|ɔɪ)$/;

  const PH2SID = {
    p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'g', f: 'f', v: 'v', s: 's', z: 'z', θ: 'th', ð: 'th_v', ʃ: 'sh', ʒ: 'zh',
    tʃ: 'ch', dʒ: 'j', h: 'h', m: 'm', n: 'n', ŋ: 'ng', l: 'l', r: 'r', w: 'w', j: 'y',
    æ: 'a_s', ɛ: 'e_s', ɪ: 'i_s', ɑ: 'o_s', ʌ: 'u_s', ə: 'schwa', eɪ: 'a_l', i: 'e_l', aɪ: 'i_l', oʊ: 'o_l', u: 'oo_l',
    ʊ: 'oo_s', ɔɪ: 'oi', aʊ: 'ow', ɔ: 'aw', ɝ: 'er',
  };
  // 多个音素合成一个拼读单位（与课程里的组合音一致）。
  // 组合音播放的音必须与音标一致：-ed 读 /ɪd/ 才用 ed_id；音标是 /əd/ 时按 ə + d 逐个读（不映射到 /ɪd/）
  const COMBO = {
    'k s': 'x', 'k w': 'qu', 'j u': 'u_l', 'ɑ r': 'ar', 'ɔ r': 'or', 'ɛ r': 'air', 'ɪ r': 'ear', 'ŋ k': 'nk',
    'ʃ ə n': 'tion', 'ʒ ə n': 'sion', 'tʃ ɝ': 'ture', 'ʒ ɝ': 'sure', 'ə l': 'le', 'aɪ r': 'ire', 'j ʊ r': 'ure',
    'aʊ r': 'our', 'aɪ ɝ': 'ire', 'aʊ ɝ': 'our', 'ʌ f': 'uf', 'ɔ f': 'awf', 'æ f': 'af', 'ɪ d': 'ed_id',
  };
  const LONG_SID = new Set(['a_l', 'e_l', 'i_l', 'o_l', 'u_l', 'oo_l']);

  function silentCost(word, i) {
    const c = word[i];
    if (c === 'e' && (i === word.length - 1 || (i === word.length - 2 && /[sd]/.test(word[i + 1])))) return 0.1;
    return SILENT[c] ?? 2.5;
  }

  /* word：小写字母串；tokens：音标音素数组（可带重音符号）
   * 返回 { segs:[{t,start,ph:[音素下标],sid,seq,silent,cost}], cost, irregular } 或 null */
  function align(word, tokens) {
    const w = word.toLowerCase();
    if (!/^[a-z]+$/.test(w) || !tokens || !tokens.length) return null;
    const ph = tokens.map(norm);
    const L = w.length, P = ph.length;
    const INF = 1e9;
    const dp = Array.from({ length: L + 1 }, () => new Array(P + 1).fill(INF));
    const back = Array.from({ length: L + 1 }, () => new Array(P + 1).fill(null));
    dp[0][0] = 0;
    const relax = (i, j, gl, k, cost) => {
      const v = dp[i][j] + cost + SEG_COST;
      if (v < dp[i + gl][j + k]) { dp[i + gl][j + k] = v; back[i + gl][j + k] = { gl, k, cost }; }
    };
    for (let i = 0; i < L; i++) for (let j = 0; j <= P; j++) {
      if (dp[i][j] >= INF) continue;
      for (let gl = 1; gl <= Math.min(MAXG, L - i); gl++) {
        const g = w.substr(i, gl);
        const alts = parsed[g];
        if (!alts) continue;
        if (AT_START.has(g) && i !== 0) continue;
        if (AT_END.has(g) && i + gl !== L) continue;
        if (NOT_END.has(g) && i + gl === L) continue;
        for (const a of alts) {
          const k = a.ph.length;
          if (j + k > P) continue;
          let ok = true;
          for (let t = 0; t < k; t++) if (ph[j + t] !== a.ph[t]) { ok = false; break; }
          if (ok) relax(i, j, gl, k, a.cost);
        }
      }
      // 单个字母不发音 / 读成对照表外的音
      relax(i, j, 1, 0, silentCost(w, i));
      if (j < P) relax(i, j, 1, 1, FALLBACK);
      if (j + 1 < P) relax(i, j, 1, 2, FALLBACK * 1.5);
    }
    if (dp[L][P] >= INF) return null;
    const segs = [];
    let i = L, j = P;
    while (i > 0) {
      const b = back[i][j];
      const start = i - b.gl;
      segs.unshift({ t: w.substr(start, b.gl), start, ph: Array.from({ length: b.k }, (_, t) => j - b.k + t), cost: b.cost });
      i -= b.gl; j -= b.k;
    }
    segs.forEach((s) => {
      const key = s.ph.map((x) => ph[x]).join(' ');
      s.silent = !s.ph.length;
      s.seq = s.ph.map((x) => PH2SID[ph[x]]).filter(Boolean);
      s.sid = s.silent ? 'silent' : COMBO[key] || (s.ph.length === 1 ? PH2SID[ph[s.ph[0]]] : null);
      // 注意：不能把音标 /ɔ/ 改成播放短 o /ɑ/——词典里 along、across 等词显示的是 /ɔ/，播放必须与显示一致。
      // 课程单词（dog、long 等）在 scripts/lib/cmu.mjs 的 PICK 里已选 /ɑ/ 读法，显示与播放本来就一致
    });
    // 魔法 e：元音 + 辅音 + 不发音的 e，且元音读长音
    segs.forEach((s, k) => {
      if (!s.silent || s.t !== 'e' || k < 2) return;
      const v = segs[k - 2], c = segs[k - 1];
      if (v.t.length === 1 && 'aeiou'.includes(v.t) && LONG_SID.has(v.sid) && !/[aeiouy]/.test(c.t) && !c.silent) {
        s.magic = true; v.magicE = k;
      }
    });
    const cost = dp[L][P] - SEG_COST * segs.length;
    return { segs, cost, irregular: cost >= IRREGULAR || segs.some((s) => s.cost >= FALLBACK || s.cost >= 2.5) };
  }

  /* 音节划分（只用于展示）：返回每个音节的起始字母下标
   * isWord：可选，判断某个字符串是不是单词，用来识别 -ing / -er / -ed / -est 等后缀（teach·ing 而不是 tea·ching） */
  const SUFFIX = ['ing', 'est', 'er', 'ed'];
  function syllables(word, tokens, segs, isWord) {
    const starts = syllableStarts(word, tokens, segs);
    if (!isWord || starts.length < 2) return starts;
    const w = word.toLowerCase();
    for (const suf of SUFFIX) {
      if (!w.endsWith(suf)) continue;
      const at = w.length - suf.length;
      const stem = w.slice(0, at);
      const last = starts[starts.length - 1];
      if (last === at || last < at - 3 || last > at + 1) break;
      if (!(isWord(stem) || isWord(stem + 'e'))) break;
      if (segs && !segs.some((sg) => sg.start === at)) break;           // 后缀开头必须是字母组合边界
      if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2] && !isWord(stem)) break; // run·ning
      starts[starts.length - 1] = at;
      break;
    }
    return starts;
  }

  function syllableStarts(word, tokens, segs) {
    const ph = tokens.map(norm);
    const vowels = ph.map((p, i) => (VOWEL_PH.test(p) ? i : -1)).filter((i) => i >= 0);
    if (vowels.length < 2 || !segs) return [0];
    const owner = new Array(ph.length);
    segs.forEach((s, k) => s.ph.forEach((x) => { owner[x] = k; }));
    const ONSET = /^(p|b|t|d|k|g|f|v|θ|s|ʃ|h|m|n|l|r|w|j|z|ʒ|tʃ|dʒ|ð|pl|bl|kl|gl|fl|sl|pr|br|tr|dr|kr|gr|fr|θr|ʃr|sp|st|sk|sm|sn|sw|tw|kw|dw|spl|spr|str|skr|skw)$/;
    const starts = [0];
    let pStart = 0; // 上一个音节开头的音素下标
    for (let v = 1; v < vowels.length; v++) {
      const a = vowels[v - 1], b = vowels[v];
      // 重音符号直接标出了音节开头
      let at = -1;
      for (let x = a + 1; x <= b; x++) if (/^[ˈˌ]/.test(tokens[x])) { at = x; break; }
      if (at < 0) {
        at = b;
        // 最大首音原则
        while (at - 1 > a && ONSET.test(ph.slice(at - 1, b).join(''))) at--;
        // 前一个音节是重读短元音：留一个辅音给它（闭音节，lem·on）；双写辅音从中间切开（rab·bit）
        const prevShort = /^(æ|ɛ|ɪ|ɑ|ʌ|ʊ)$/.test(ph[a]) && /^[ˈˌ]/.test(tokens[pStart]);
        if (prevShort && at === a + 1 && b > a + 1) {
          const k = owner[at];
          const dbl = k !== undefined && segs[k].t.length === 2 && segs[k].t[0] === segs[k].t[1];
          if (!dbl && owner[a + 1] !== owner[a + 2]) at = a + 2; // tion 这类一块多音的组合不拆开
        }
      }
      pStart = at;
      // 音素位置 → 字母位置
      const k = owner[at];
      if (k === undefined) continue;
      const s = segs[k];
      let letter = s.start;
      if (s.t.length === 2 && s.t[0] === s.t[1] && s.ph.length === 1) letter = s.start + 1;  // 双写辅音从中间切开
      else if (s.ph[0] !== at) letter = s.start + (s.t.length === s.ph.length ? at - s.ph[0] : s.t.length); // 一块读两个音被切开：ex·cite
      else {
        // 紧挨在前面的不发音辅音字母归后一个音节（cas·tle、con·scious）
        let k2 = k - 1;
        while (k2 >= 0 && segs[k2].silent && !/[aeiouy]/.test(segs[k2].t) && segs[k2].start > starts[starts.length - 1]) letter = segs[k2--].start;
      }
      if (letter > starts[starts.length - 1]) starts.push(letter);
    }
    return starts;
  }

  const api = { align, syllables, PH2SID };
  root.G2P = api;
})(typeof window !== 'undefined' ? window : globalThis);
