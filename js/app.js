/* 拼读之路 · 主程序（无依赖，hash 路由） */
(function () {
  /* ---------------- 存储 ---------------- */
  const KEY = 'phonics-path.';
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* 隐私模式 */ } };

  const App = {
    settings: Object.assign({ rate: 1, tts: false, zh: true }, load('settings', {})),
    progress: Object.assign({ lessons: {}, last: null }, load('progress', {})),
    wrong: load('wrong', []),
  };
  window.App = App;
  const saveAll = () => { save('settings', App.settings); save('progress', App.progress); save('wrong', App.wrong); };

  /* ---------------- 数据索引 ---------------- */
  const LESSONS = [];
  STAGES.forEach((st) => st.lessons.forEach((l) => { l.stage = st; LESSONS.push(l); }));
  const lessonById = (id) => LESSONS.find((l) => l.id === id);
  const levelOf = (st) => LEVELS.find((l) => l.key === st.level);
  const isDone = (id) => !!App.progress.lessons[id]?.done;
  const stageDone = (st) => st.lessons.filter((l) => isDone(l.id)).length;
  const nextUp = () => LESSONS.find((l) => !isDone(l.id)) || LESSONS[LESSONS.length - 1];
  const totalWeeks = STAGES.reduce((a, s) => a + s.weeks, 0);

  /* ---------------- 工具 ---------------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const ipa = (sid) => (SOUNDS[sid] ? '/' + SOUNDS[sid].ipa + '/' : '');
  const gDisplay = (g) => g.replace('_', '‿');
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const ipaTokens = (text) => { const v = window.IPA && window.IPA[String(text).toLowerCase()]; return v ? v.split(' ') : null; };
  const ipaOf = (text) => { const t = ipaTokens(text); return t ? '/' + t.join('') + '/' : ''; };
  // 音标按音素拆成 span，拼读时可逐个高亮
  const ipaSpans = (a, cls) => { const t = ipaTokens(a.text); return t ? `<span class="${cls}">/${t.map((x, i) => `<span class="ip" data-p="${i}">${esc(x)}</span>`).join('')}/</span>` : ''; };
  const ipaTag = (text, cls = 'ipa') => { const v = ipaOf(text); return v ? `<span class="${cls}">${esc(v)}</span>` : ''; };

  const ICON = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.3 3.6a.8.8 0 0 0 1.3-.6V5.5a.8.8 0 0 0-1.3-.6L8 8.5H5a1 1 0 0 0-1 1z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    blend: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="5" height="10" rx="1.5"/><rect x="10" y="7" width="5" height="10" rx="1.5"/><path d="M17 12h4m-2-2 2 2-2 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6 6-6-6 6-6"/></svg>',
  };

  /* ---------------- 单词渲染 ---------------- */
  let PAGE = { words: [] };
  function registerWord(a) { PAGE.words.push(a); return PAGE.words.length - 1; }

  function wordTiles(a, cls = '') {
    if (a.syllables) {
      return `<span class="tiles syl ${cls}">${a.syllables.map((s, i) => `<span class="tile${s.stress ? ' stress' : ''}" data-i="${i}">${esc(s.t)}</span>`).join('<span class="dot">·</span>')}</span>`;
    }
    return `<span class="tiles ${cls}">${a.segs.map((s, i) => `<span class="tile${s.hl ? ' hl' : ''}${s.silent ? ' silent' : ''}${s.t.length > 1 ? ' multi' : ''}" data-i="${i}">${esc(s.display)}</span>`).join('')}</span>`;
  }

  function wordCard(raw, lesson) {
    const a = Phonics.analyze(raw, lesson);
    const idx = registerWord(a);
    return `<div class="word-card" data-w="${idx}">
      <div class="wc-emoji" aria-hidden="true">${a.emoji || ''}</div>
      <button class="wc-word" data-say="${esc(a.text)}" aria-label="朗读 ${esc(a.text)}">${wordTiles(a)}</button>
      ${ipaSpans(a, 'wc-ipa')}
      <div class="wc-zh">${esc(a.zh)}</div>
      <div class="wc-actions">
        <button class="icon-btn" data-say="${esc(a.text)}" title="朗读">${ICON.speaker}</button>
        <button class="chip-btn" data-blend="${idx}" title="逐个音拼读">${ICON.blend}<span>拼读</span></button>
      </div>
    </div>`;
  }

  async function blend(idx, root) {
    const a = PAGE.words[idx];
    const card = root || $(`[data-w="${idx}"]`);
    if (!a || !card) return;
    const tiles = $$('.tile', card);
    const ips = $$('.ip', card);
    if (a.ipaMap === undefined) a.ipaMap = Phonics.alignIPA(a, ipaTokens(a.text));
    const map = a.ipaMap;
    const clear = () => { tiles.forEach((t) => t.classList.remove('active', 'done')); ips.forEach((p) => p.classList.remove('active', 'done', 'all')); };
    // 第 i 块亮起，同时高亮它对应的音素
    const mark = (i) => {
      tiles.forEach((t) => t.classList.remove('active')); tiles[i]?.classList.add('active', 'done');
      ips.forEach((p) => p.classList.remove('active'));
      (map?.[i] || []).forEach((k) => ips[k]?.classList.add('active', 'done'));
    };
    clear();
    const steps = [];
    if (a.syllables) {
      a.syllables.forEach((s, i) => {
        steps.push(() => mark(i));
        steps.push({ type: 't', v: s.t.toLowerCase() }, { type: 'wait', v: 180 });
      });
    } else {
      a.segs.forEach((s, i) => {
        steps.push(() => mark(i));
        if (s.silent || !s.sid || !SOUNDS[s.sid] || s.sid === 'silent') steps.push({ type: 'wait', v: 450 });
        else steps.push({ type: 'p', v: s.sid }, { type: 'wait', v: 140 });
      });
    }
    steps.push(() => { tiles.forEach((t) => { t.classList.remove('active'); t.classList.add('done'); }); ips.forEach((p) => { p.classList.remove('active'); p.classList.add('all'); }); });
    steps.push({ type: 't', v: a.text });
    card.querySelector('.fc-reveal')?.removeAttribute('hidden');  // 闪卡里先揭晓音标，才能看到高亮
    card.classList.add('blending');
    await Speech.sequence(steps);
    card.classList.remove('blending');
    setTimeout(clear, 600);
  }

  /* ---------------- 布局 ---------------- */
  function shell(content, active) {
    const nav = [['#/', '学习路径', 'home'], ['#/sounds', '音标总表', 'sounds'], ['#/practice', '练习场', 'practice'], ['#/guide', '学习指南', 'guide']];
    const done = Object.values(App.progress.lessons).filter((l) => l.done).length;
    return `
    <header class="topbar">
      <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">Aa</span><span class="brand-text">拼读之路<small>Phonics Path</small></span></a>
      <nav class="nav">${nav.map(([h, t, k]) => `<a href="${h}" class="${active === k ? 'on' : ''}">${t}</a>`).join('')}</nav>
      <div class="tools">
        <button class="pill search-btn" data-action="search" aria-label="搜索（快捷键 /）">${ICON.search}<span>搜索</span><kbd>/</kbd></button>
        <span class="pill" title="已完成课程">${ICON.check}<b>${done}</b>/${LESSONS.length}</span>
        <button class="pill toggle ${App.settings.rate < 1 ? 'on' : ''}" data-action="slow" title="切换慢速朗读">🐢 慢速</button>
      </div>
    </header>
    <main id="view">${content}</main>
    <footer class="foot">
      <p>拼读之路 · 从字母音到多音节词的自然拼读学习路径 · 进度保存在本机浏览器</p>
      <p><a href="#/guide">学习指南与音频来源说明</a></p>
    </footer>`;
  }

  /* ---------------- 首页 / 学习路径 ---------------- */
  function viewHome() {
    const nu = nextUp();
    const done = LESSONS.filter((l) => isDone(l.id)).length;
    const pct = Math.round((done / LESSONS.length) * 100);
    let levelSeen = null;
    const stages = STAGES.map((st, i) => {
      const lv = levelOf(st);
      const d = stageDone(st);
      const p = d / st.lessons.length;
      const head = levelSeen !== st.level ? `<div class="level-band" style="--lv:${lv.color}"><span>${st.level}</span><em>${lv.en}</em></div>` : '';
      levelSeen = st.level;
      const current = nu.stage === st && done < LESSONS.length;
      return `${head}
      <a class="stage-node ${i % 2 ? 'right' : 'left'} ${p === 1 ? 'complete' : ''} ${current ? 'current' : ''}" href="#/stage/${st.id}" style="--lv:${lv.color};--p:${p}">
        <span class="node-ring"><span class="node-icon">${st.icon}</span></span>
        <span class="node-body">
          <span class="node-kicker">第 ${st.id} 阶段 · 约 ${st.weeks} 周</span>
          <span class="node-title">${esc(st.title)}</span>
          <span class="node-en">${esc(st.en)}</span>
          <span class="node-meta">${d}/${st.lessons.length} 课${current ? ' · <b>进行中</b>' : p === 1 ? ' · 已完成' : ''}</span>
        </span>
      </a>`;
    }).join('');
    return `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">自然拼读 · Phonics</p>
        <h1>看到单词就会读，<br>听到发音就会拼。</h1>
        <p class="lead">10 个阶段、${LESSONS.length} 节课，从 26 个字母的发音开始，一步步走到多音节长单词。每节课都有发音示范、拼读演示、例句和小测验。</p>
        <div class="hero-cta">
          <a class="btn primary" href="#/lesson/${nu.id}">${done ? '继续学习' : '从第一课开始'}：${esc(nu.title)} ${ICON.arrow}</a>
          <a class="btn ghost" href="#/guide">怎么学？</a>
        </div>
        <button class="hero-search" data-action="search">${ICON.search}<span>搜单词、字母组合、音标或中文…</span><kbd>/</kbd></button>
      </div>
      <div class="hero-card">
        <div class="demo-word" data-w="${registerWord(Phonics.analyze('ship|船|🚢', lessonById('4-1')))}">
          <button class="wc-word big" data-say="ship">${wordTiles(PAGE.words[PAGE.words.length - 1])}</button>
          ${ipaSpans(PAGE.words[PAGE.words.length - 1], 'wc-ipa big')}
          <button class="chip-btn" data-blend="${PAGE.words.length - 1}">${ICON.blend}<span>点我拼读 s‿h → /ʃ/</span></button>
        </div>
        <div class="progress-block">
          <div class="pb-row"><span>总进度</span><b>${pct}%</b></div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="pb-row small"><span>已完成 ${done} / ${LESSONS.length} 课</span><span>建议周期约 ${totalWeeks} 周</span></div>
        </div>
      </div>
    </section>
    <section class="path">
      <h2 class="section-title">学习路径 <small>入门 → 基础 → 进阶 → 高级 → 精通</small></h2>
      <div class="path-track">${stages}</div>
    </section>`;
  }

  /* ---------------- 阶段页 ---------------- */
  function viewStage(id) {
    const st = STAGES.find((s) => s.id === +id);
    if (!st) return viewNotFound();
    const lv = levelOf(st);
    const prev = STAGES.find((s) => s.id === st.id - 1);
    const next = STAGES.find((s) => s.id === st.id + 1);
    return `
    <section class="stage-head" style="--lv:${lv.color}">
      <a class="crumb" href="#/">${ICON.back} 学习路径</a>
      <div class="sh-row">
        <div class="sh-icon">${st.icon}</div>
        <div>
          <p class="eyebrow">第 ${st.id} 阶段 · ${st.level} ${lv.en} · 建议 ${st.weeks} 周</p>
          <h1>${esc(st.title)} <small>${esc(st.en)}</small></h1>
        </div>
      </div>
      <p class="goal"><b>阶段目标：</b>${st.goal}</p>
      <p class="intro">${st.intro}</p>
    </section>
    <section class="lesson-list">
      ${st.lessons.map((l, i) => {
        const pr = App.progress.lessons[l.id];
        return `<a class="lesson-row ${pr?.done ? 'done' : ''}" href="#/lesson/${l.id}" style="--lv:${lv.color}">
          <span class="lr-num">${pr?.done ? ICON.check : i + 1}</span>
          <span class="lr-body"><span class="lr-title">${esc(l.title)}</span><span class="lr-en">${esc(l.en)}</span></span>
          <span class="lr-cards">${(l.cards || []).slice(0, 6).map((c) => `<span class="mini-g">${esc(gDisplay(c.g))}</span>`).join('')}</span>
          <span class="lr-stars">${pr?.stars ? stars(pr.stars) : ''}</span>
        </a>`;
      }).join('')}
    </section>
    <nav class="pager">
      ${prev ? `<a class="btn ghost" href="#/stage/${prev.id}">${ICON.back} 第 ${prev.id} 阶段</a>` : '<span></span>'}
      ${next ? `<a class="btn ghost" href="#/stage/${next.id}">第 ${next.id} 阶段 ${ICON.arrow}</a>` : '<span></span>'}
    </nav>`;
  }

  /* ---------------- 课程页 ---------------- */
  function soundCard(c) {
    const seq = Array.isArray(c.s);
    const sid = seq ? null : c.s;
    const S = sid ? SOUNDS[sid] : null;
    const silent = sid === 'silent';
    const ipaText = silent ? '不发音' : seq ? '/' + c.s.map((x) => SOUNDS[x].ipa).join('') + '/' : ipa(sid);
    const tip = c.tip || (S && S.tip) || (silent ? `在这些单词里，${esc(c.g)} 写出来但不发音。` : seq ? `连缀：${c.s.map((x) => '/' + SOUNDS[x].ipa + '/').join(' + ')}，每个音都要发出来，快速连读。` : '');
    return `<div class="sound-card">
      <div class="sc-top">
        <span class="sc-g">${esc(gDisplay(c.g))}</span>
        <span class="sc-ipa">${ipaText}</span>
      </div>
      <div class="sc-btns">
        ${silent ? '' : `<button class="btn small primary" ${seq ? `data-phs="${c.s.join(',')}"` : `data-ph="${sid}"`}>${ICON.play} 发音</button>`}
        ${c.kw ? `<button class="btn small ghost" data-say="${esc(c.kw)}">${ICON.speaker} ${esc(c.kw)}</button>` : ''}
      </div>
      <p class="sc-tip">${tip}</p>
    </div>`;
  }

  function highlightSentence(en, lessonWords) {
    const set = new Set(lessonWords.map((w) => w.toLowerCase()));
    return en.split(/(\s+)/).map((tok) => {
      if (/^\s+$/.test(tok)) return tok;
      const m = tok.match(/^([^A-Za-z']*)([A-Za-z']+)([^A-Za-z']*)$/);
      if (!m) return esc(tok);
      const [, pre, w, post] = m;
      const lw = w.toLowerCase();
      const hit = set.has(lw) || set.has(lw.replace(/(es|s)$/, '')) || set.has(lw.replace(/s$/, ''));
      return `${esc(pre)}<span class="sw${hit ? ' hit' : ''}" data-say="${esc(w)}">${esc(w)}</span>${esc(post)}`;
    }).join('');
  }

  function viewLesson(id) {
    const l = lessonById(id);
    if (!l) return viewNotFound();
    App.progress.last = id; saveAll();
    const st = l.stage;
    const lv = levelOf(st);
    const i = LESSONS.indexOf(l);
    const prev = LESSONS[i - 1];
    const next = LESSONS[i + 1];
    const pr = App.progress.lessons[id];
    const lessonWords = l.words.map((w) => Phonics.parseWord(w).text);

    const table = l.table ? `<div class="table-wrap"><table><thead><tr>${l.table.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${l.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    const pairs = l.pairs ? `<section class="block">
      <h2 class="block-title"><span class="num">对比</span>短音 → 长音 / 最小对立词</h2>
      <div class="pairs">${l.pairs.map((p) => { const [a, b] = p.split('>'); return `<button class="pair" data-pair="${esc(a)}|${esc(b)}"><span class="pw">${esc(a)}${ipaTag(a)}</span>${ICON.arrow}<span class="pw b">${esc(b)}${ipaTag(b)}</span></button>`; }).join('')}</div>
      <p class="hint">点击一组，先后听两个单词，体会元音的变化。</p>
    </section>` : '';
    const sight = l.sight ? `<section class="block">
      <h2 class="block-title"><span class="num">高频词</span>Sight Words — 整体认读</h2>
      <div class="sight">${l.sight.map((w) => `<button class="sight-w" data-say="${esc(w)}">${esc(w)}${ipaTag(w)}</button>`).join('')}</div>
    </section>` : '';

    let n = 1;
    const cards = (l.cards || []).length ? `<section class="block">
      <h2 class="block-title"><span class="num">${n++}</span>发音卡片</h2>
      <div class="cards">${l.cards.map(soundCard).join('')}</div>
    </section>` : '';

    return `
    <section class="lesson-head" style="--lv:${lv.color}">
      <a class="crumb" href="#/stage/${st.id}">${ICON.back} 第 ${st.id} 阶段 · ${esc(st.title)}</a>
      <p class="eyebrow">第 ${l.id} 课 · ${st.level}</p>
      <h1>${esc(l.title)} <small>${esc(l.en)}</small></h1>
      ${pr?.done ? `<span class="done-badge">${ICON.check} 已完成 ${stars(pr.stars || 1)}</span>` : ''}
    </section>
    ${cards}
    <section class="block">
      <h2 class="block-title"><span class="num">${n++}</span>规则讲解</h2>
      <div class="rule">${l.rule}</div>
      ${table}
    </section>
    ${pairs}
    <section class="block">
      <h2 class="block-title"><span class="num">${n++}</span>示例单词 <small>点单词听发音，点"拼读"看逐音演示</small></h2>
      <div class="words">${l.words.map((w) => wordCard(w, l)).join('')}</div>
      <div class="legend"><span class="tile hl">ab</span> 本课重点 <span class="tile silent">e</span> 不发音 ${l.words.some((w) => w.includes('·')) ? '<span class="tile stress">ab</span> 重读音节' : ''}</div>
    </section>
    ${sight}
    <section class="block">
      <h2 class="block-title"><span class="num">${n++}</span>例句 <small>点句子任意单词可单独听</small>
        <button class="link-btn" data-action="zh">${App.settings.zh ? '隐藏中文' : '显示中文'}</button></h2>
      <ol class="sentences ${App.settings.zh ? '' : 'nozh'}">${l.sentences.map((s, si) => { const [en, zh] = s.split('|'); return `<li data-s="${si}"><button class="icon-btn play" data-say="${esc(en)}" title="朗读整句">${ICON.play}</button><div><p class="en">${highlightSentence(en, lessonWords)}</p><p class="zh">${esc(zh)}</p></div></li>`; }).join('')}</ol>
    </section>
    <section class="block quiz-block">
      <h2 class="block-title"><span class="num">${n++}</span>小测验</h2>
      <div id="quiz" data-lesson="${l.id}">
        <p>共 6 题，答对 4 题即可完成本课。${pr?.done ? `你的最好成绩：${stars(pr.stars || 1)}` : ''}</p>
        <button class="btn primary" data-action="quiz">开始测验 ${ICON.arrow}</button>
        ${pr?.done ? '' : '<button class="link-btn" data-action="markdone">我已掌握，直接标记完成</button>'}
      </div>
    </section>
    <nav class="pager">
      ${prev ? `<a class="btn ghost" href="#/lesson/${prev.id}">${ICON.back} ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="btn ghost" href="#/lesson/${next.id}">${esc(next.title)} ${ICON.arrow}</a>` : '<a class="btn ghost" href="#/practice">去练习场</a>'}
    </nav>`;
  }

  /* ---------------- 测验 ---------------- */
  const GRAPH_POOL = ['a', 'e', 'i', 'o', 'u', 'sh', 'ch', 'th', 'ck', 'ng', 'ee', 'ea', 'ai', 'ay', 'oa', 'ow', 'ou', 'oi', 'oy', 'oo', 'ar', 'or', 'er', 'ir', 'ur', 'aw', 'au', 'igh', 'ie', 'ue', 'ew', 'bl', 'st', 'tr', 'kn', 'wr'];

  function buildQuestions(pool, count, lesson) {
    const analyses = pool.map((w) => (typeof w === 'string' ? Phonics.analyze(w, lesson) : w));
    const allTexts = [...new Set(analyses.map((a) => a.text))];
    const extra = LESSONS.flatMap((l) => l.words.map((w) => Phonics.parseWord(w))).filter((a) => !allTexts.includes(a.text));
    const distract = (a, key, n) => {
      const own = shuffle(analyses.filter((b) => b.text !== a.text && b[key] !== a[key]));
      const more = shuffle(extra.filter((b) => b[key] !== a[key]));
      const out = []; const seen = new Set([a[key]]);
      for (const b of [...own, ...more]) { if (!seen.has(b[key])) { seen.add(b[key]); out.push(b[key]); } if (out.length >= n) break; }
      return out;
    };
    const types = ['listen', 'meaning', 'gap'];
    const qs = [];
    const picks = shuffle(analyses);
    for (let k = 0; qs.length < count && k < picks.length * 3; k++) {
      const a = picks[k % picks.length];
      let type = types[qs.length % types.length];
      if (type === 'gap' && (!a.segs || !a.segs.some((s) => s.hl && !s.silent))) type = a.syllables ? 'syll' : 'listen';
      if (qs.some((q) => q.a.text === a.text && q.type === type)) continue;
      if (type === 'listen') qs.push({ type, a, prompt: '听发音，选出正确的单词', options: shuffle([a.text, ...distract(a, 'text', 3)]), answer: a.text });
      else if (type === 'meaning') qs.push({ type, a, prompt: '这个单词是什么意思？', options: shuffle([a.zh, ...distract(a, 'zh', 3)]), answer: a.zh });
      else if (type === 'syll') { const c = a.syllables.length; qs.push({ type, a, prompt: '这个单词有几个音节？', options: [1, 2, 3, 4].map(String), answer: String(c) }); }
      else {
        const seg = a.segs.find((s) => s.hl && !s.silent);
        const opts = new Set([seg.t]);
        const lessonGs = (lesson?.cards || []).map((c) => c.g).filter((g) => !g.includes('_'));
        shuffle([...lessonGs, ...GRAPH_POOL]).forEach((g) => { if (opts.size < 4 && g.length <= 3 && !opts.has(g)) opts.add(g); });
        qs.push({ type: 'gap', a, seg, prompt: '听发音，补全缺少的字母', options: shuffle([...opts]), answer: seg.t });
      }
    }
    return qs;
  }

  function runQuiz(container, questions, onFinish) {
    let i = 0, score = 0;
    const missed = [];
    const render = () => {
      const q = questions[i];
      const a = q.a;
      let body = '';
      if (q.type === 'listen') body = `<button class="big-play" data-say="${esc(a.text)}">${ICON.speaker}<span>再听一遍</span></button>`;
      else if (q.type === 'meaning') body = `<div class="q-word">${wordTiles(a)}</div>${ipaSpans(a, 'wc-ipa')}<button class="link-btn" data-say="${esc(a.text)}">${ICON.speaker} 听发音</button>`;
      else if (q.type === 'syll') body = `<div class="q-word">${esc(a.text)}</div><button class="link-btn" data-say="${esc(a.text)}">${ICON.speaker} 听发音（可以拍手数一数）</button>`;
      else body = `<div class="q-word">${a.segs.map((s) => (s === q.seg ? '<span class="gap">?</span>' : `<span class="${s.silent ? 'silent' : ''}">${esc(s.display)}</span>`)).join('')}</div><button class="link-btn" data-say="${esc(a.text)}">${ICON.speaker} 听发音</button>`;
      container.innerHTML = `<div class="quiz">
        <div class="q-head"><span>第 ${i + 1} / ${questions.length} 题</span><div class="bar"><i style="width:${(i / questions.length) * 100}%"></i></div><span>得分 ${score}</span></div>
        <p class="q-prompt">${q.prompt}</p>
        <div class="q-body">${body}</div>
        <div class="q-opts ${q.type === 'meaning' ? 'zh' : ''}">${q.options.map((o) => `<button class="opt" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>
        <div class="q-feedback" aria-live="polite"></div>
      </div>`;
      if (q.type !== 'meaning' && q.type !== 'syll') setTimeout(() => Speech.say(a.text), 250);
      $$('.opt', container).forEach((b) => b.addEventListener('click', () => answer(b, q)));
    };
    const answer = (btn, q) => {
      const ok = btn.dataset.opt === q.answer;
      $$('.opt', container).forEach((b) => { b.disabled = true; if (b.dataset.opt === q.answer) b.classList.add('right'); });
      if (ok) { score++; btn.classList.add('right'); } else { btn.classList.add('wrong'); missed.push(q.a.raw); }
      const fb = $('.q-feedback', container);
      fb.innerHTML = `${ok ? '<b class="ok">✓ 正确！</b>' : `<b class="no">✗ 正确答案：${esc(q.answer)}</b>`} <span>${esc(q.a.text)} ${ipaTag(q.a.text)} · ${esc(q.a.zh)}</span> <button class="btn small primary" data-next>${i + 1 < questions.length ? '下一题' : '查看结果'} ${ICON.arrow}</button>`;
      Speech.say(q.a.text);
      $('[data-next]', fb).addEventListener('click', () => { i++; if (i < questions.length) render(); else onFinish(score, questions.length, missed); });
    };
    render();
  }

  function startLessonQuiz(container) {
    const l = lessonById(container.dataset.lesson);
    let pool = l.words;
    if (pool.length < 6) pool = [...pool, ...l.stage.lessons.flatMap((x) => x.words).filter((w) => !pool.includes(w))];
    const qs = buildQuestions(pool, 6, l);
    runQuiz(container, qs, (score, total, missed) => {
      const s = score >= total ? 3 : score >= total - 1 ? 2 : 1;
      const passed = score >= 4;
      recordWrong(missed);
      if (passed) {
        const old = App.progress.lessons[l.id];
        App.progress.lessons[l.id] = { done: true, stars: Math.max(s, old?.stars || 0), at: Date.now() };
        saveAll(); refreshPills();
      }
      const i = LESSONS.indexOf(l);
      const next = LESSONS[i + 1];
      container.innerHTML = `<div class="result ${passed ? 'pass' : ''}">
        <div class="r-score">${score}<small>/${total}</small></div>
        <div class="r-stars">${passed ? stars(s) : ''}</div>
        <p>${passed ? (score === total ? '满分！太棒了 🎉' : '通过！本课已完成 👍') : '还差一点，再复习一下单词和例句，然后重试吧 💪'}</p>
        ${missed.length ? `<p class="hint">答错的单词已加入练习场的"错词本"。</p>` : ''}
        <div class="r-btns"><button class="btn ghost" data-action="quiz">再测一次</button>${passed && next ? `<a class="btn primary" href="#/lesson/${next.id}">下一课：${esc(next.title)} ${ICON.arrow}</a>` : ''}</div>
      </div>`;
    });
  }

  function recordWrong(raws) {
    raws.forEach((r) => { if (!App.wrong.includes(r)) App.wrong.push(r); });
    App.wrong = App.wrong.slice(-200);
    saveAll();
  }

  /* ---------------- 音标总表 ---------------- */
  const LETTER_SOUND = { a: 'a_s', b: 'b', c: 'k', d: 'd', e: 'e_s', f: 'f', g: 'g', h: 'h', i: 'i_s', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o_s', p: 'p', q: 'qu', r: 'r', s: 's', t: 't', u: 'u_s', v: 'v', w: 'w', x: 'x', y: 'y', z: 'z' };
  const LETTER_KW = { a: 'apple', b: 'bed', c: 'cat', d: 'dog', e: 'egg', f: 'fan', g: 'gum', h: 'hat', i: 'in', j: 'jam', k: 'kid', l: 'leg', m: 'map', n: 'net', o: 'octopus', p: 'pig', q: 'queen', r: 'red', s: 'sun', t: 'top', u: 'up', v: 'van', w: 'web', x: 'box', y: 'yes', z: 'zip' };

  function viewSounds() {
    const groups = [
      ['short', '短元音', 'Short Vowels', '元音字母在闭音节中的基本读音，最先学习。'],
      ['long', '长元音', 'Long Vowels', '多数长元音就是读字母本身的名字。'],
      ['other', '其他元音与双元音', 'Other Vowels', '包括短 oo、双元音和最常见的弱读音 /ə/。'],
      ['r', 'R 控制元音', 'R-Controlled', '元音后跟 r，美式发音需要卷舌。'],
      ['consonant', '辅音', 'Consonants', '清辅音声带不振动，浊辅音声带振动，可以把手放在喉咙上感受。'],
    ];
    const cell = (sid) => {
      const S = SOUNDS[sid];
      return `<button class="ipa-cell" data-phkw="${sid}" title="${esc(S.tip || '')}">
        <span class="ic-ipa">/${S.ipa}/</span>
        <span class="ic-spell">${S.spell.map(esc).join(' · ')}</span>
        <span class="ic-kw">${esc(S.kw)}</span>
      </button>`;
    };
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    return `
    <section class="page-head">
      <p class="eyebrow">Sound Chart</p>
      <h1>音标总表</h1>
      <p class="lead">英语约有 44 个音素。点击任意格子：先听这个音，再听关键词。悬停可查看发音要领。</p>
    </section>
    ${groups.map(([t, zh, en, desc]) => `<section class="block">
      <h2 class="block-title">${zh} <small>${en}</small></h2>
      <p class="hint">${desc}</p>
      <div class="ipa-grid">${Object.keys(SOUNDS).filter((k) => SOUNDS[k].type === t).map(cell).join('')}</div>
    </section>`).join('')}
    <section class="block">
      <h2 class="block-title">26 个字母：名字与声音 <small>Letter Names & Sounds</small></h2>
      <p class="hint">左边按钮读字母的<b>名字</b>（背字母表时用），右边按钮读字母的<b>声音</b>（拼读时用）。</p>
      <div class="alpha">${letters.map((c) => `<div class="alpha-cell">
        <span class="al-letter">${c.toUpperCase()}<i>${c}</i></span>
        <span class="al-btns"><button class="chip-btn" ${c === 'a' ? 'data-ph="a_l"' : `data-say="${c}"`}>名字</button><button class="chip-btn accent" data-phkw="${LETTER_SOUND[c]}" data-kw="${LETTER_KW[c]}">声音 ${ipa(LETTER_SOUND[c])}</button></span>
      </div>`).join('')}</div>
    </section>`;
  }

  /* ---------------- 练习场 ---------------- */
  function viewPractice() {
    const learned = LESSONS.filter((l) => isDone(l.id));
    return `
    <section class="page-head">
      <p class="eyebrow">Practice</p>
      <h1>练习场</h1>
      <p class="lead">选择练习范围和玩法，巩固已经学过的拼读规则。</p>
    </section>
    <section class="block practice-setup">
      <div class="field">
        <label for="p-range">练习范围</label>
        <select id="p-range">
          <option value="learned" ${learned.length ? 'selected' : ''}>已完成的课程（${learned.length} 课）</option>
          <option value="wrong">错词本（${App.wrong.length} 个）</option>
          <option value="all" ${learned.length ? '' : 'selected'}>全部课程</option>
          ${STAGES.map((s) => `<option value="s${s.id}">第 ${s.id} 阶段：${esc(s.title)}</option>`).join('')}
        </select>
      </div>
      <div class="modes">
        <button class="mode" data-mode="listen"><b>👂 听音选词</b><span>听发音，从四个单词中选出正确的一个</span></button>
        <button class="mode" data-mode="spell"><b>✍️ 听写拼词</b><span>听发音，用键盘拼出单词</span></button>
        <button class="mode" data-mode="flash"><b>🃏 闪卡认读</b><span>看单词先自己读，再听标准发音核对</span></button>
        <button class="mode" data-mode="sound"><b>🔤 听音辨字母</b><span>听一个音，选出它对应的字母组合</span></button>
      </div>
      ${App.wrong.length ? `<button class="link-btn" data-action="clearwrong">清空错词本</button>` : ''}
    </section>
    <section class="block" id="game"></section>`;
  }

  function practicePool() {
    const v = $('#p-range').value;
    let ls;
    if (v === 'wrong') return App.wrong.map((r) => ({ raw: r, lesson: LESSONS.find((l) => l.words.includes(r)) }));
    if (v === 'learned') ls = LESSONS.filter((l) => isDone(l.id));
    else if (v === 'all') ls = LESSONS;
    else ls = STAGES.find((s) => 's' + s.id === v).lessons;
    if (!ls.length) ls = LESSONS.slice(0, 6);
    return ls.flatMap((l) => l.words.map((raw) => ({ raw, lesson: l })));
  }

  function startPractice(mode) {
    const game = $('#game');
    const pool = practicePool();
    if (pool.length < 4 && mode !== 'sound') { game.innerHTML = '<p class="empty">这个范围里的单词太少了，换一个范围试试。</p>'; return; }
    const analyses = sample(pool, Math.min(10, pool.length)).map((p) => Phonics.analyze(p.raw, p.lesson));
    const finish = (score, total, missed) => {
      recordWrong(missed);
      game.innerHTML = `<div class="result pass"><div class="r-score">${score}<small>/${total}</small></div><p>${score === total ? '全对！🎉' : '继续加油！'}</p>${missed.length ? '<p class="hint">答错的单词已加入错词本。</p>' : ''}<div class="r-btns"><button class="btn primary" data-mode="${mode}">再来一轮</button></div></div>`;
    };
    game.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (mode === 'listen') {
      const qs = analyses.map((a) => {
        const others = sample(pool.filter((p) => Phonics.parseWord(p.raw).text !== a.text), 12).map((p) => Phonics.parseWord(p.raw).text);
        const opts = [...new Set(others)].slice(0, 3);
        return { type: 'listen', a, prompt: '听发音，选出正确的单词', options: shuffle([a.text, ...opts]), answer: a.text };
      });
      runQuiz(game, qs, finish);
    } else if (mode === 'sound') {
      const sounds = [...new Set(pool.flatMap((p) => (p.lesson?.cards || []).filter((c) => typeof c.s === 'string' && SOUNDS[c.s] && SOUNDS[c.s].type !== 'combo').map((c) => c.g + '|' + c.s)))];
      const allG = [...new Set(LESSONS.flatMap((l) => (l.cards || []).map((c) => c.g)))];
      if (sounds.length < 2) { game.innerHTML = '<p class="empty">这个范围里的发音卡片太少，换一个范围试试。</p>'; return; }
      const qs = sample(sounds, Math.min(8, sounds.length)).map((gs) => {
        const [g, s] = gs.split('|');
        const sameSound = sounds.filter((x) => x.endsWith('|' + s)).map((x) => x.split('|')[0]);
        const opts = new Set([g]);
        shuffle(allG).forEach((x) => { if (opts.size < 4 && !sameSound.includes(x)) opts.add(x); });
        return { type: 'sound', a: { text: SOUNDS[s].kw, zh: ipa(s), raw: '' }, sid: s, prompt: '听这个音，它对应哪个字母组合？', options: shuffle([...opts]).map(gDisplay), answer: gDisplay(g) };
      });
      runSoundQuiz(game, qs, finish);
    } else if (mode === 'spell') runSpell(game, analyses, finish);
    else runFlash(game, analyses);
  }

  function runSoundQuiz(container, qs, onFinish) {
    let i = 0, score = 0;
    const render = () => {
      const q = qs[i];
      container.innerHTML = `<div class="quiz">
        <div class="q-head"><span>第 ${i + 1} / ${qs.length} 题</span><div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div><span>得分 ${score}</span></div>
        <p class="q-prompt">${q.prompt}</p>
        <div class="q-body"><button class="big-play" data-ph="${q.sid}">${ICON.speaker}<span>再听一遍</span></button></div>
        <div class="q-opts">${q.options.map((o) => `<button class="opt mono" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>
        <div class="q-feedback" aria-live="polite"></div></div>`;
      setTimeout(() => Speech.phoneme(q.sid), 250);
      $$('.opt', container).forEach((b) => b.addEventListener('click', () => {
        const ok = b.dataset.opt === q.answer;
        $$('.opt', container).forEach((x) => { x.disabled = true; if (x.dataset.opt === q.answer) x.classList.add('right'); });
        if (ok) score++; else b.classList.add('wrong');
        const fb = $('.q-feedback', container);
        fb.innerHTML = `${ok ? '<b class="ok">✓ 正确！</b>' : `<b class="no">✗ 正确答案：${esc(q.answer)}</b>`} <span>${q.a.zh}，如 ${esc(q.a.text)}</span> <button class="btn small primary" data-next>${i + 1 < qs.length ? '下一题' : '查看结果'} ${ICON.arrow}</button>`;
        Speech.say(q.a.text);
        $('[data-next]', fb).addEventListener('click', () => { i++; if (i < qs.length) render(); else onFinish(score, qs.length, []); });
      }));
    };
    render();
  }

  function runSpell(container, list, onFinish) {
    let i = 0, score = 0;
    const missed = [];
    const render = () => {
      const a = list[i];
      container.innerHTML = `<div class="quiz">
        <div class="q-head"><span>第 ${i + 1} / ${list.length} 题</span><div class="bar"><i style="width:${(i / list.length) * 100}%"></i></div><span>得分 ${score}</span></div>
        <p class="q-prompt">听发音，拼出这个单词 <span class="hint">提示：${esc(a.zh)}</span></p>
        <div class="q-body"><button class="big-play" data-say="${esc(a.text)}">${ICON.speaker}<span>再听一遍</span></button></div>
        <form class="spell-form" autocomplete="off"><input id="spell-in" type="text" inputmode="latin" autocapitalize="off" spellcheck="false" aria-label="输入单词" placeholder="在这里输入…"><button class="btn primary" type="submit">检查</button></form>
        <div class="q-feedback" aria-live="polite"></div></div>`;
      const input = $('#spell-in', container);
      setTimeout(() => { Speech.say(a.text); input.focus(); }, 250);
      $('.spell-form', container).addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.disabled) return;
        const ok = input.value.trim().toLowerCase() === a.text.toLowerCase();
        input.disabled = true;
        if (ok) score++; else missed.push(a.raw);
        const fb = $('.q-feedback', container);
        fb.innerHTML = `${ok ? '<b class="ok">✓ 拼对了！</b>' : '<b class="no">✗ 正确拼写：</b>'} <span class="q-word inline">${wordTiles(a)}</span> ${ipaTag(a.text)} <button class="btn small primary" data-next>${i + 1 < list.length ? '下一题' : '查看结果'} ${ICON.arrow}</button>`;
        $('[data-next]', fb).addEventListener('click', () => { i++; if (i < list.length) render(); else onFinish(score, list.length, missed); });
        $('[data-next]', fb).focus();
      });
    };
    render();
  }

  function runFlash(container, list) {
    let i = 0, known = 0;
    const missed = [];
    const render = () => {
      const a = list[i];
      const idx = registerWord(a);
      container.innerHTML = `<div class="flash">
        <div class="q-head"><span>第 ${i + 1} / ${list.length} 张</span><div class="bar"><i style="width:${(i / list.length) * 100}%"></i></div><span>会读 ${known}</span></div>
        <div class="flash-card" data-w="${idx}">
          <div class="fc-word">${wordTiles(a)}</div>
          <p class="hint">先自己读一读，再点下面的按钮核对</p>
          <div class="fc-reveal" hidden>${ipaSpans(a, 'fc-ipa')}<span class="fc-emoji">${a.emoji || ''}</span> ${esc(a.zh)}</div>
          <div class="fc-btns">
            <button class="btn ghost" data-act="hear">${ICON.speaker} 听发音</button>
            <button class="btn ghost" data-blend="${idx}">${ICON.blend} 拼读演示</button>
          </div>
        </div>
        <div class="fc-judge"><button class="btn no" data-act="no">还不会</button><button class="btn primary" data-act="yes">我读对了 ✓</button></div>
      </div>`;
      $('[data-act="hear"]', container).addEventListener('click', () => { $('.fc-reveal', container).hidden = false; Speech.say(a.text); });
      $$('.fc-judge [data-act]', container).forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.act === 'yes') known++; else missed.push(a.raw);
        i++;
        if (i < list.length) render();
        else { recordWrong(missed); container.innerHTML = `<div class="result pass"><div class="r-score">${known}<small>/${list.length}</small></div><p>会读 ${known} 个单词${missed.length ? '，没掌握的已加入错词本' : '，全部掌握！🎉'}</p><div class="r-btns"><button class="btn primary" data-mode="flash">再来一轮</button></div></div>`; }
      }));
    };
    render();
  }

  /* ---------------- 学习指南 ---------------- */
  function viewGuide() {
    let w = 0;
    return `
    <section class="page-head">
      <p class="eyebrow">Guide</p>
      <h1>学习指南</h1>
      <p class="lead">自然拼读（Phonics）是英语母语国家孩子学习阅读的核心方法：建立<b>字母（组合）</b>与<b>发音</b>之间的对应关系，从而"见词能读、听音能写"。大约 75% 以上的英语单词符合拼读规律。</p>
    </section>
    <section class="block">
      <h2 class="block-title">学习路径总览 <small>建议每天 15–20 分钟，约 ${totalWeeks} 周完成</small></h2>
      <div class="timeline">${STAGES.map((s) => { const from = w + 1; w += s.weeks; const lv = levelOf(s); return `<a class="tl-row" href="#/stage/${s.id}" style="--lv:${lv.color}">
        <span class="tl-weeks">第 ${from}–${w} 周</span>
        <span class="tl-dot">${s.icon}</span>
        <span class="tl-body"><b>${s.id}. ${esc(s.title)}</b> <em>${s.level}</em><span>${s.goal}</span></span>
      </a>`; }).join('')}</div>
    </section>
    <section class="block">
      <h2 class="block-title">每节课怎么学 <small>五步学习法</small></h2>
      <ol class="steps">
        <li><b>听</b>：在"发音卡片"里反复听这个音，对照发音要领模仿口型。</li>
        <li><b>拼</b>：在"示例单词"里点<b>拼读</b>，看每个字母组合依次亮起、听每个音，再听整个单词。自己跟着一起拼。</li>
        <li><b>读</b>：遮住发音，自己先读单词，再点击核对。</li>
        <li><b>用</b>：朗读例句，注意高亮的本课单词；可以隐藏中文挑战自己。</li>
        <li><b>测</b>：完成小测验，答对 4/6 题即完成本课。答错的词会进入错词本，在练习场复习。</li>
      </ol>
    </section>
    <section class="block two-col">
      <div>
        <h2 class="block-title">每周节奏建议</h2>
        <ul class="plain">
          <li>周一至周四：每天学 1 课新内容（或复习上一课）。</li>
          <li>周五：练习场"听音选词""听写拼词"综合复习本周内容。</li>
          <li>周末：用"闪卡认读"清空错词本，大声朗读本周所有例句。</li>
          <li>一个阶段学完后，再进入下一个阶段；觉得吃力就放慢节奏，扎实比速度重要。</li>
        </ul>
      </div>
      <div>
        <h2 class="block-title">中国学习者常见问题</h2>
        <ul class="plain">
          <li><b>给辅音加尾音</b>：book 读成"布克-儿"、bed 读成"白的"。辅音结尾要干净利落。</li>
          <li><b>/æ/ 和 /ɛ/ 不分</b>：bad 和 bed 读成一样。/æ/ 嘴巴要张得更大。</li>
          <li><b>th 读成 s 或 z</b>：think 读成 sink。一定要把舌尖放到齿间。</li>
          <li><b>v 读成 w</b>：very 读成 wery。v 要上齿咬下唇。</li>
          <li><b>长短音不分</b>：ship / sheep、full / fool。短音短而松，长音长而紧。</li>
          <li><b>l 和 n 混淆</b>（部分方言区）：注意 n 从鼻腔出气，l 从舌头两侧出气。</li>
        </ul>
      </div>
    </section>
    <section class="block">
      <h2 class="block-title">发音与音频说明</h2>
      <ul class="plain">
        <li>本站采用<b>美式发音</b>，所有声音（单词、例句和每一个音素）都来自同一个美式女声（macOS Samantha 语音），口音一致。</li>
        <li>单个音素无法直接合成，所以是从这个声音朗读的真实单词中截取的，例如 /æ/ 取自 cat、/eɪ/ 取自 hay、/ʃ/ 取自 fish。每个音素都经过英语音素识别模型校验：元音必须被识别为目标元音；辅音与元音 /ɑ/ 拼在一起时必须被识别为"该辅音 + ɑ"。</li>
        <li>爆破音（p、b、t、d、k、g）以及 ch、j、h、w、y 无法单独持续发出，录音带有极短的弱元音，这是正常的；θ（thin）和 ŋ（sing）带有极短的元音过渡，因为它们主要靠过渡才能和 f、n 区分开。</li>
        <li>如果某个音频文件缺失，网站会自动改用浏览器内置的语音合成朗读。</li>
        <li>页面右上角"🐢 慢速"可以放慢所有发音，适合跟读。</li>
      </ul>
    </section>
    <section class="block">
      <h2 class="block-title">学习数据</h2>
      <p class="hint">学习进度、测验星级和错词本保存在当前浏览器的本地存储中，换设备或清除浏览器数据会丢失。</p>
      <button class="btn ghost" data-action="reset">重置全部学习进度</button>
    </section>`;
  }

  function viewNotFound() {
    return `<section class="page-head"><h1>页面不存在</h1><p><a class="btn primary" href="#/">返回学习路径</a></p></section>`;
  }

  /* ---------------- 路由 ---------------- */
  function route() {
    Speech.stop();
    PAGE = { words: [] };
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const [name, arg] = path.split('/');
    const params = new URLSearchParams(query || '');
    let html, active = '', title = '拼读之路 · 自然拼读学习';
    if (!name) { html = viewHome(); active = 'home'; }
    else if (name === 'stage') { html = viewStage(arg); active = 'home'; const st = STAGES.find((s) => s.id === +arg); if (st) title = `${st.title} · 拼读之路`; }
    else if (name === 'lesson') { html = viewLesson(arg); active = 'home'; const l = lessonById(arg); if (l) title = `${l.title} · 第 ${l.id} 课 · 拼读之路`; }
    else if (name === 'sounds') { html = viewSounds(); active = 'sounds'; title = '音标总表 · 拼读之路'; }
    else if (name === 'practice') { html = viewPractice(); active = 'practice'; title = '练习场 · 拼读之路'; }
    else if (name === 'guide') { html = viewGuide(); active = 'guide'; title = '学习指南 · 拼读之路'; }
    else html = viewNotFound();
    document.title = title;
    $('#app').innerHTML = shell(html, active);
    fitWords();
    window.scrollTo(0, 0);
    if (name === 'lesson') revealTarget(params);
  }

  // 长单词：逐步缩小字号直到字母块完全放进卡片
  function fitWords(root = document) {
    $$('.word-card .wc-word', root).forEach((btn) => {
      btn.style.fontSize = '';
      const card = btn.closest('.word-card');
      const tiles = btn.querySelector('.tiles');
      let size = parseFloat(getComputedStyle(btn).fontSize);
      while (tiles.scrollWidth > card.clientWidth - 12 && size > 11) {
        size -= 1;
        btn.style.fontSize = size + 'px';
      }
    });
  }
  let fitTimer;
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => fitWords(), 120); });

  function refreshPills() {
    const done = Object.values(App.progress.lessons).filter((l) => l.done).length;
    const pill = $('.tools .pill b'); if (pill) pill.textContent = done;
  }


  /* ---------------- 搜索 ---------------- */
  const dlg = $('#search-dialog');
  const sInput = $('#search-input');
  const sResults = $('#search-results');
  const sStatus = $('#search-status');
  let SEARCH_INDEX = null;
  let sItems = [];
  let sActive = -1;
  const SUGGEST = ['cake', 'th', 'ough', '/eɪ/', '魔法 e', '不发音', '长元音', '苹果'];
  const IPA_CHARS = /[æɑɔəɛɪʊʌɝɚθðʃʒŋː\/]/;
  const stripIpa = (x) => x.replace(/[\/\[\]ˈˌ\s]/g, '');

  function buildSearchIndex() {
    const items = [];
    LESSONS.forEach((l) => {
      const gs = (l.cards || []).map((c) => c.g);
      items.push({ type: 'lesson', l, gs: [...gs, ...gs.map(gDisplay)].map((g) => g.toLowerCase()), title: l.title.toLowerCase(), en: l.en.toLowerCase(),
        stage: l.stage.title.toLowerCase(), stageEn: l.stage.en.toLowerCase(), rule: l.rule.replace(/<[^>]+>/g, '').toLowerCase() });
      l.words.forEach((raw) => {
        const p = Phonics.parseWord(raw);
        items.push({ type: 'word', l, text: p.text, zh: p.zh, emoji: p.emoji, ipa: ipaOf(p.text) });
      });
      l.sentences.forEach((s, i) => { const [en, zh] = s.split('|'); items.push({ type: 'sent', l, i, en, zh }); });
    });
    return items;
  }

  function scoreItem(it, q, qi, zhQ, ipaQ) {
    if (it.type === 'lesson') {
      // 优先级：课号 / 字母组合 > 课程标题 > 英文副标题（按单词开头）> 阶段名 > 规则正文（仅中文查询）
      if (it.l.id === q) return 100;
      let best = 0;
      const up = (v) => { if (v > best) best = v; };
      for (const g of it.gs) { if (g === q) up(100); else if (q.length >= 2 && g.startsWith(q)) up(60); }
      if (it.title === q) up(100);
      else if (it.title.startsWith(q)) up(75);
      else if (q.length >= 2 && it.title.includes(q)) up(55);
      const wordStart = (txt) => txt.split(/[^a-z]+/).some((w) => w.startsWith(q));
      if (ipaQ && it.en.includes(q)) up(50);
      else if (q.length >= 3 && wordStart(it.en)) up(40);
      if (zhQ && it.stage.includes(q)) up(35);
      else if (q.length >= 3 && wordStart(it.stageEn)) up(25);
      if (!best && zhQ && q.length >= 2 && it.rule.includes(q)) up(15);
      return best;
    }
    if (it.type === 'word') {
      const t = it.text.toLowerCase();
      let sc = 0;
      if (t === q) sc = 95;
      else if (t.startsWith(q)) sc = 70 - Math.min(20, t.length - q.length);
      else if (q.length >= 2 && t.includes(q)) sc = 40;
      if (zhQ && it.zh.includes(q)) sc = Math.max(sc, it.zh.split(/[；（]/)[0] === q ? 85 : 60);
      if (ipaQ && it.ipa && qi) {
        const ip = stripIpa(it.ipa);
        if (ip === qi) sc = Math.max(sc, 85);
        else if (ip.includes(qi)) sc = Math.max(sc, 45);
      }
      return sc;
    }
    if (q.length >= 3 && it.en.toLowerCase().includes(q)) return 25;
    if (zhQ && q.length >= 2 && it.zh.includes(q)) return 30;
    return 0;
  }

  function markText(text, q) {
    if (!q) return esc(text);
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function runSearch() {
    sDirty = false;
    const raw = sInput.value.trim();
    const q = raw.toLowerCase();
    sActive = -1;
    if (!q) {
      sItems = [];
      sResults.innerHTML = `<div class="sr-empty"><p>可以搜索单词、中文意思、字母组合、音标或课程名，例如：</p>
        <div class="sr-suggest">${SUGGEST.map((s) => `<button type="button" class="chip-btn" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
      sStatus.textContent = '';
      sInput.setAttribute('aria-expanded', 'false');
      sInput.removeAttribute('aria-activedescendant');
      return;
    }
    SEARCH_INDEX = SEARCH_INDEX || buildSearchIndex();
    const zhQ = /[一-鿿]/.test(q);
    const ipaQ = IPA_CHARS.test(raw);
    const qi = stripIpa(q);
    const scored = SEARCH_INDEX.map((it) => [scoreItem(it, q, qi, zhQ, ipaQ), it]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]);
    const groups = [
      ['lesson', '课程', 6],
      ['word', '单词', 24],
      ['sent', '例句', 6],
    ].map(([type, label, max]) => [label, scored.filter(([, it]) => it.type === type).slice(0, max).map(([, it]) => it)]).filter(([, list]) => list.length);
    sItems = groups.flatMap(([, list]) => list);
    const where = (l) => `第 ${l.id} 课 · ${esc(l.title)}`;
    let n = 0;
    const optHtml = (it) => {
      const id = `sr-${n++}`;
      if (it.type === 'lesson') {
        it.href = `#/lesson/${it.l.id}`;
        return `<div role="option" id="${id}" class="sr-item" aria-selected="false" data-i="${n - 1}">
          <span class="sr-badge" style="--lv:${levelOf(it.l.stage).color}">${it.l.id}</span>
          <span class="sr-main"><b>${markText(it.l.title, q)}</b> <span class="sr-sub">${markText(it.l.en, q)}</span></span>
          <span class="sr-where">第 ${it.l.stage.id} 阶段 · ${esc(it.l.stage.title)}</span></div>`;
      }
      if (it.type === 'word') {
        it.href = `#/lesson/${it.l.id}?w=${encodeURIComponent(it.text)}`;
        return `<div role="option" id="${id}" class="sr-item" aria-selected="false" data-i="${n - 1}">
          <span class="sr-emoji" aria-hidden="true">${it.emoji || ''}</span>
          <span class="sr-main"><b class="sr-word">${markText(it.text, q)}</b> <span class="ipa">${esc(it.ipa)}</span> <span class="sr-sub">${markText(it.zh, q)}</span></span>
          <span class="sr-where">${where(it.l)}</span><span class="sr-lid">${it.l.id}</span></div>`;
      }
      it.href = `#/lesson/${it.l.id}?s=${it.i}`;
      return `<div role="option" id="${id}" class="sr-item" aria-selected="false" data-i="${n - 1}">
        <span class="sr-emoji" aria-hidden="true">💬</span>
        <span class="sr-main"><span class="sr-sent">${markText(it.en, q)}</span> <span class="sr-sub">${markText(it.zh, q)}</span></span>
        <span class="sr-where">${where(it.l)}</span><span class="sr-lid">${it.l.id}</span></div>`;
    };
    sResults.innerHTML = groups.length
      ? groups.map(([label, list], gi) => `<div role="group" class="sr-group" aria-labelledby="srg-${gi}"><h3 id="srg-${gi}" class="sr-gh">${label}</h3>${list.map(optHtml).join('')}</div>`).join('')
      : `<div class="sr-empty"><p>没有找到"${esc(raw)}"相关的内容。可以试试其他拼写、中文意思或音标。</p></div>`;
    sStatus.textContent = sItems.length ? `找到 ${sItems.length} 个结果` : '没有结果';
    sInput.setAttribute('aria-expanded', sItems.length ? 'true' : 'false');
    setActive(sItems.length ? 0 : -1);
  }

  function setActive(i) {
    $$('.sr-item[aria-selected="true"]', sResults).forEach((el) => el.setAttribute('aria-selected', 'false'));
    sActive = i;
    const el = i >= 0 ? $(`#sr-${i}`) : null;
    if (el) {
      el.setAttribute('aria-selected', 'true');
      el.scrollIntoView({ block: 'nearest' });
      sInput.setAttribute('aria-activedescendant', el.id);
    } else sInput.removeAttribute('aria-activedescendant');
  }

  function goResult(i) {
    const it = sItems[i];
    if (!it) return;
    dlg.close();
    if (location.hash === it.href) route();
    else location.hash = it.href;
  }

  function openSearch() {
    if (dlg.open) return;
    dlg.showModal();
    sInput.select();
    runSearch();
  }

  let sTimer;
  let sDirty = false; // 输入框内容在上次搜索之后是否变过
  sInput.addEventListener('input', () => { sDirty = true; clearTimeout(sTimer); sTimer = setTimeout(runSearch, 80); });
  sInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && sItems.length) { e.preventDefault(); setActive((sActive + 1) % sItems.length); }
    else if (e.key === 'ArrowUp' && sItems.length) { e.preventDefault(); setActive((sActive - 1 + sItems.length) % sItems.length); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (sDirty) { clearTimeout(sTimer); runSearch(); } // 只有内容变过才重新搜索，否则会把方向键选中的项重置
      goResult(sActive >= 0 ? sActive : 0);
    }
  });
  sResults.addEventListener('click', (e) => {
    const sug = e.target.closest('[data-suggest]');
    if (sug) { sInput.value = sug.dataset.suggest; runSearch(); sInput.focus(); return; }
    const opt = e.target.closest('.sr-item');
    if (opt) goResult(+opt.dataset.i);
  });
  sResults.addEventListener('pointermove', (e) => {
    const opt = e.target.closest('.sr-item');
    if (opt && +opt.dataset.i !== sActive) setActive(+opt.dataset.i);
  });
  // 快捷键：/ 或 Ctrl/⌘ + K
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey)) {
      e.preventDefault();
      openSearch();
    }
  });
  // closedby="any" 尚未支持的浏览器（Safari）：手动实现点击遮罩关闭
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e) => {
      const r = dlg.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dlg.addEventListener('pointerdown', (e) => { pressedOutside = outside(e); });
    dlg.addEventListener('pointerup', (e) => { if (pressedOutside && outside(e)) dlg.close(); });
  }

  // 从搜索结果进入课程页：滚动到对应单词 / 例句并高亮
  function revealTarget(params) {
    const w = params.get('w');
    const si = params.get('s');
    let el = null, focusEl = null;
    if (w) {
      const idx = PAGE.words.findIndex((a) => a.text.toLowerCase() === w.toLowerCase());
      if (idx >= 0) { el = $(`.word-card[data-w="${idx}"]`); focusEl = el?.querySelector('.wc-word'); }
    } else if (si !== null && /^\d+$/.test(si)) {
      el = $(`.sentences li[data-s="${si}"]`);
      focusEl = el?.querySelector('.play');
    }
    if (!el) return;
    requestAnimationFrame(() => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      focusEl?.focus({ preventScroll: true });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 2400);
    });
  }

  /* ---------------- 事件委托 ---------------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-say],[data-ph],[data-phs],[data-phkw],[data-blend],[data-pair],[data-action],[data-mode]');
    if (!t) return;
    if (t.matches('.opt')) return;
    const d = t.dataset;
    if (d.blend !== undefined) { e.preventDefault(); blend(+d.blend, t.closest('[data-w]')); return; }
    if (d.say !== undefined) { e.preventDefault(); Speech.say(d.say); pulse(t); return; }
    if (d.ph) { e.preventDefault(); Speech.phoneme(d.ph); pulse(t); return; }
    if (d.phs) { e.preventDefault(); Speech.sequence(d.phs.split(',').flatMap((p) => [{ type: 'p', v: p }, { type: 'wait', v: 80 }])); pulse(t); return; }
    if (d.phkw) { e.preventDefault(); Speech.sequence([{ type: 'p', v: d.phkw }, { type: 'wait', v: 350 }, { type: 't', v: d.kw || SOUNDS[d.phkw].kw }]); pulse(t); return; }
    if (d.pair) { const [a, b] = d.pair.split('|'); Speech.sequence([{ type: 't', v: a }, { type: 'wait', v: 450 }, { type: 't', v: b }]); pulse(t); return; }
    if (d.mode) { startPractice(d.mode); return; }
    const act = d.action;
    if (act === 'search') { openSearch(); return; }
    if (act === 'slow') { App.settings.rate = App.settings.rate < 1 ? 1 : 0.7; saveAll(); t.classList.toggle('on', App.settings.rate < 1); }
    else if (act === 'zh') { App.settings.zh = !App.settings.zh; saveAll(); $('.sentences')?.classList.toggle('nozh', !App.settings.zh); t.textContent = App.settings.zh ? '隐藏中文' : '显示中文'; }
    else if (act === 'quiz') startLessonQuiz($('#quiz'));
    else if (act === 'markdone') { const id = $('#quiz').dataset.lesson; App.progress.lessons[id] = { done: true, stars: App.progress.lessons[id]?.stars || 1, at: Date.now() }; saveAll(); route(); }
    else if (act === 'clearwrong') { App.wrong = []; saveAll(); route(); }
    else if (act === 'reset') { if (confirm('确定要清空所有学习进度、星级和错词本吗？')) { App.progress = { lessons: {}, last: null }; App.wrong = []; saveAll(); route(); } }
  });

  function pulse(el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

  window.addEventListener('hashchange', route);
  route();
})();
