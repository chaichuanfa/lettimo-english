/* 拼读之路 · 主程序（无依赖，hash 路由） */
(function () {
  /* ---------------- 存储 ---------------- */
  const KEY = 'phonics-path.';
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* 隐私模式 */ } };

  const App = {
    settings: Object.assign({ rate: 1, tts: false, zh: true }, load('settings', {})),
    progress: Object.assign({ lessons: {}, last: null, grammar: {} }, load('progress', {})),
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
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
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
        if (!s.silent && s.sid && SOUNDS[s.sid] && s.sid !== 'silent') steps.push({ type: 'p', v: s.sid }, { type: 'wait', v: 140 });
        else if (!s.silent && s.seq?.length) { s.seq.forEach((p) => steps.push({ type: 'p', v: p }, { type: 'wait', v: 60 })); steps.push({ type: 'wait', v: 80 }); }
        else steps.push({ type: 'wait', v: 450 });
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
    const nav = [['#/', '学习路径', 'home'], ['#/grammar', '语法', 'grammar'], ['#/dict', '词典', 'dict'], ['#/sounds', '音标总表', 'sounds'], ['#/practice', '练习场', 'practice'], ['#/guide', '学习指南', 'guide']];
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
      <ol class="sentences ${App.settings.zh ? '' : 'nozh'}">${l.sentences.map((s, si) => { const [en, zh] = s.split('|'); return `<li data-s="${si}"><button class="icon-btn play" data-say="${esc(en)}" data-toggle title="朗读整句" aria-label="朗读整句">${ICON.play}</button><div><p class="en">${highlightSentence(en, lessonWords)}</p><p class="zh">${esc(zh)}</p></div></li>`; }).join('')}</ol>
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
      <h2 class="block-title">词典说明</h2>
      <ul class="plain">
        <li><a href="#/dict">词典</a>收录约 4 万个常用词。释义来自开源英汉词典 ECDICT，例句来自 Tatoeba 例句库（CC BY 2.0 FR，繁体译文已转为简体），音标来自 CMU 发音词典（美式）。</li>
        <li>拼读拆解是根据词典读音自动对齐出来的：先确定这个词实际怎么读，再找出每个音对应哪几个字母。所以弱读（如 pencil 里的 i 读 /ə/）也会如实显示，可能和课程里按规则教的读法略有不同。</li>
        <li>课程里学过的单词和例句播放预录音频；其他单词和例句由浏览器内置的语音朗读，音色可能和课程不同。</li>
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
    let dictWord = '';
    if (!name) { html = viewHome(); active = 'home'; }
    else if (name === 'stage') { html = viewStage(arg); active = 'home'; const st = STAGES.find((s) => s.id === +arg); if (st) title = `${st.title} · 拼读之路`; }
    else if (name === 'lesson') { html = viewLesson(arg); active = 'home'; const l = lessonById(arg); if (l) title = `${l.title} · 第 ${l.id} 课 · 拼读之路`; }
    else if (name === 'sounds') { html = viewSounds(); active = 'sounds'; title = '音标总表 · 拼读之路'; }
    else if (name === 'practice') { html = viewPractice(); active = 'practice'; title = '练习场 · 拼读之路'; }
    else if (name === 'guide') { html = viewGuide(); active = 'guide'; title = '学习指南 · 拼读之路'; }
    else if (name === 'grammar') {
      const gl = arg && gLessonById(arg);
      html = arg ? viewGrammarLesson(arg) : viewGrammar(); active = 'grammar';
      title = gl ? `${gl.title} · 语法 · 拼读之路` : '语法 · 拼读之路';
    }
    else if (name === 'dict') {
      try { dictWord = normWord(decodeURIComponent(arg || '')); } catch { dictWord = normWord(arg); }
      html = viewDict(dictWord); active = 'dict'; title = dictWord ? `${dictWord} · 词典 · 拼读之路` : '词典 · 拼读之路';
    }
    else html = viewNotFound();
    document.title = title;
    $('#app').innerHTML = shell(html, active);
    fitWords();
    window.scrollTo(0, 0);
    if (name === 'lesson') revealTarget(params);
    if (name === 'dict') initDict(dictWord);
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
  const SUGGEST = ['cake', 'th', 'ough', '/eɪ/', '魔法 e', '不发音', '现在完成时', '定语从句', '苹果'];
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
    G_LESSONS.forEach((l) => {
      const extra = [...(l.forms || []).flatMap((f) => f.parts), ...(l.signals || [])].join(' ').toLowerCase();
      items.push({ type: 'grammar', l, title: l.title.toLowerCase(), en: l.en.toLowerCase(), extra, stage: l.stage.title.toLowerCase(),
        rule: (l.intro + l.rule).replace(/<[^>]+>/g, '').toLowerCase() });
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
    if (it.type === 'grammar') {
      let best = 0;
      const up = (v) => { if (v > best) best = v; };
      if (it.title === q) up(100);
      else if (it.title.includes(q) && (zhQ || q.length >= 2)) up(it.title.startsWith(q) ? 80 : 65);
      if (q.length >= 3 && (it.en.includes(q) || it.en.split(/[^a-z]+/).some((w) => w.startsWith(q)))) up(45);
      if (q.length >= 2 && it.extra.includes(q)) up(40);
      if (zhQ && it.stage.includes(q)) up(35);
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
      ['grammar', '语法', 5],
      ['word', '单词', 24],
      ['sent', '例句', 6],
    ].map(([type, label, max]) => [label, scored.filter(([, it]) => it.type === type).slice(0, max).map(([, it]) => it)]).filter(([, list]) => list.length);
    // 英文单词：加一项"在词典中查"（课程里没有结果时放在最前面）
    if (/^[a-z]{1,30}$/.test(q)) {
      const g = ['词典', [{ type: 'dict', w: q }]];
      if (groups.length) groups.push(g); else groups.unshift(g);
    }
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
      if (it.type === 'grammar') {
        it.href = `#/grammar/${it.l.id}`;
        return `<div role="option" id="${id}" class="sr-item" aria-selected="false" data-i="${n - 1}">
          <span class="sr-badge" style="--lv:${gLevel(it.l.stage).color}">语法</span>
          <span class="sr-main"><b>${markText(it.l.title, q)}</b> <span class="sr-sub">${markText(it.l.en, q)}</span></span>
          <span class="sr-where">语法 · ${esc(it.l.stage.title)}</span></div>`;
      }
      if (it.type === 'dict') {
        it.href = `#/dict/${encodeURIComponent(it.w)}`;
        return `<div role="option" id="${id}" class="sr-item" aria-selected="false" data-i="${n - 1}">
          <span class="sr-emoji" aria-hidden="true">📖</span>
          <span class="sr-main"><b class="sr-word">${esc(it.w)}</b> <span class="sr-sub">在词典中查看音标、释义、例句和拼读拆解</span></span>
          <span class="sr-where">词典</span></div>`;
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

  /* ---------------- 语法 ---------------- */
  const G_LESSONS = [];
  (window.GRAMMAR || []).forEach((st) => st.lessons.forEach((l) => { l.stage = st; G_LESSONS.push(l); }));
  const gLessonById = (id) => G_LESSONS.find((l) => l.id === id);
  const gProgress = () => (App.progress.grammar ||= {});
  const gLevel = (st) => LEVELS.find((x) => x.key === st.level) || LEVELS[0];
  const ROLE = { S: '主语', V: '谓语', O: '宾语', C: '表语', IO: '间接宾语', DO: '直接宾语', OC: '宾补', A: '状语', AT: '定语' };
  const gPlain = (en) => en.replace(/\{[A-Z]+:([^}]*)\}/g, '$1').replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim();

  // 例句：[重点] 高亮，{S:成分} 标出句子成分；每个单词仍可点击朗读
  function gSentence(en) {
    return en.replace(/\{([A-Z]+):([^}]*)\}|\[([^\]]*)\]|([^[{]+)/g, (m, role, rtext, hl, plain) => {
      if (role) return `<span class="ge ge-${role}"><span class="ge-t">${highlightSentence(rtext, [])}</span><span class="ge-r" aria-hidden="true">${ROLE[role] || role}</span></span>`;
      if (hl !== undefined) return `<b class="g-hl">${highlightSentence(hl, [])}</b>`;
      return highlightSentence(plain, []);
    });
  }
  const gTable = (t) => `<div class="table-wrap"><table><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  function viewGrammar() {
    const all = G_LESSONS.length;
    const done = G_LESSONS.filter((l) => gProgress()[l.id]?.done).length;
    const nextL = G_LESSONS.find((l) => !gProgress()[l.id]?.done) || G_LESSONS[0];
    return `
    <section class="page-head">
      <p class="eyebrow">Grammar</p>
      <h1>语法</h1>
      <p class="lead">从词类、基本句子到时态、五大基本句型和复合句，${GRAMMAR.length} 个阶段 ${all} 节课。每课都有规则讲解、句型公式、带发音的例句和小测验。</p>
      <div class="g-progress"><div class="bar"><i style="width:${(done / all) * 100}%"></i></div><span>已完成 <b>${done}</b> / ${all}</span>
        <a class="btn primary" href="#/grammar/${nextL.id}">${done ? '继续学习' : '从第一课开始'}：${esc(nextL.title)} ${ICON.arrow}</a></div>
    </section>
    ${GRAMMAR.map((st) => {
      const lv = gLevel(st);
      const n = st.lessons.filter((l) => gProgress()[l.id]?.done).length;
      return `<section class="g-stage" style="--lv:${lv.color}">
        <div class="sh-row">
          <div class="sh-icon">${st.icon}</div>
          <div><p class="eyebrow" style="color:var(--lv-ink)">第 ${st.id} 阶段 · ${st.level} · ${n}/${st.lessons.length}</p>
            <h2 class="g-stage-title">${esc(st.title)} <small>${esc(st.en)}</small></h2>
            <p class="hint">${esc(st.desc)}</p></div>
        </div>
        <div class="lesson-list">${st.lessons.map((l, i) => {
          const pr = gProgress()[l.id];
          return `<a class="lesson-row ${pr?.done ? 'done' : ''}" href="#/grammar/${l.id}" style="--lv:${lv.color}">
            <span class="lr-num">${pr?.done ? ICON.check : i + 1}</span>
            <span class="lr-body"><span class="lr-title">${esc(l.title)}</span><span class="lr-en">${esc(l.en)}</span></span>
            <span class="lr-stars">${pr?.stars ? stars(pr.stars) : ''}</span>
          </a>`;
        }).join('')}</div>
      </section>`;
    }).join('')}`;
  }

  function viewGrammarLesson(id) {
    const l = gLessonById(id);
    if (!l) return viewNotFound();
    const st = l.stage;
    const lv = gLevel(st);
    const i = G_LESSONS.indexOf(l);
    const prev = G_LESSONS[i - 1];
    const next = G_LESSONS[i + 1];
    const pr = gProgress()[id];
    let n = 1;
    const forms = l.forms ? `<div class="g-forms">${l.forms.map((f) => `<div class="g-form"><span class="g-form-label">${esc(f.label)}</span><span class="g-form-parts">${f.parts.map((p) => `<span class="g-part${/[a-z]/.test(p) ? ' key' : ''}">${esc(p)}</span>`).join('<span class="g-plus">+</span>')}</span></div>`).join('')}</div>` : '';
    const signals = l.signals ? `<div class="g-signals"><span class="g-sig-label">时间标志词</span>${l.signals.map((s) => `<span class="mini-g">${esc(s)}</span>`).join('')}</div>` : '';
    const roles = [...new Set(l.examples.flatMap((e) => [...e.matchAll(/\{([A-Z]+):/g)].map((m) => m[1])))];
    const legend = roles.length ? `<div class="g-legend">${roles.map((r) => `<span class="ge ge-${r}"><span class="ge-t">${ROLE[r]}</span></span>`).join('')}</div>` : '';
    return `
    <section class="lesson-head" style="--lv:${lv.color}">
      <a class="crumb" href="#/grammar">${ICON.back} 语法 · 第 ${st.id} 阶段 ${esc(st.title)}</a>
      <p class="eyebrow">语法第 ${l.id.slice(1)} 课 · ${st.level}</p>
      <h1>${esc(l.title)} <small>${esc(l.en)}</small></h1>
      ${pr?.done ? `<span class="done-badge">${ICON.check} 已完成 ${stars(pr.stars || 1)}</span>` : ''}
      <p class="goal" style="--lv:${lv.color}">${esc(l.intro)}</p>
    </section>
    <section class="block">
      <h2 class="block-title"><span class="num">${n++}</span>规则讲解</h2>
      <div class="rule">${l.rule}</div>
      ${forms}${signals}${l.table ? gTable(l.table) : ''}
    </section>
    <section class="block">
      <h2 class="block-title"><span class="num">${n++}</span>例句 <small>点句中单词可单独听</small>
        <button class="link-btn" data-action="zh">${App.settings.zh ? '隐藏中文' : '显示中文'}</button></h2>
      ${legend}
      <ol class="sentences g-sentences ${App.settings.zh ? '' : 'nozh'}">${l.examples.map((s) => { const [en, zh] = s.split('|'); return `<li><button class="icon-btn play" data-say="${esc(gPlain(en))}" data-toggle title="朗读整句" aria-label="朗读整句">${ICON.play}</button><div><p class="en">${gSentence(en)}</p><p class="zh">${esc(zh)}</p></div></li>`; }).join('')}</ol>
    </section>
    ${l.traps ? `<section class="block">
      <h2 class="block-title"><span class="num">${n++}</span>易错提醒</h2>
      <ul class="g-traps">${l.traps.map((t) => `<li>${t}</li>`).join('')}</ul>
    </section>` : ''}
    <section class="block quiz-block">
      <h2 class="block-title"><span class="num">${n++}</span>小测验</h2>
      <div id="gquiz" data-glesson="${l.id}">
        <p>共 ${l.quiz.length} 题（选择题和连词成句），答对 ${gPassMark(l)} 题即可完成本课。${pr?.done ? `你的最好成绩：${stars(pr.stars || 1)}` : ''}</p>
        <button class="btn primary" data-action="gquiz">开始测验 ${ICON.arrow}</button>
        ${pr?.done ? '' : '<button class="link-btn" data-action="gmarkdone">我已掌握，直接标记完成</button>'}
      </div>
    </section>
    <nav class="pager">
      ${prev ? `<a class="btn ghost" href="#/grammar/${prev.id}">${ICON.back} ${esc(prev.title)}</a>` : '<a class="btn ghost" href="#/grammar">语法目录</a>'}
      ${next ? `<a class="btn ghost" href="#/grammar/${next.id}">${esc(next.title)} ${ICON.arrow}</a>` : '<a class="btn ghost" href="#/grammar">语法目录</a>'}
    </nav>`;
  }
  const gPassMark = (l) => Math.ceil(l.quiz.length * 2 / 3);

  // 选择题填空后的完整句子（用于朗读）；"不填"表示空白处不需要词
  function gFilled(q) {
    if (!q.c.includes('___') || /[一-鿿]/.test(q.answer) && q.answer !== '不填' || /^(Which|In ")/.test(q.c)) return null;
    const parts = q.answer === '不填' ? [''] : q.answer.split(/,\s*/);
    let k = 0;
    return q.c.replace(/___/g, () => parts[Math.min(k++, parts.length - 1)]).replace(/\s+/g, ' ').replace(/\s([.,?!])/g, '$1').trim();
  }

  function startGrammarQuiz(container) {
    const l = gLessonById(container.dataset.glesson);
    const qs = l.quiz.map((q) => (q.c !== undefined ? { ...q, type: 'c', options: shuffle(q.o), answer: q.o[0] } : { ...q, type: 'o' }));
    let i = 0, score = 0;
    const render = () => {
      const q = qs[i];
      let body;
      if (q.type === 'c') {
        body = `<p class="q-prompt">${q.c.includes('___') ? '选出正确的答案' : '请选择'}</p>
          <div class="g-q">${esc(q.c).replace(/___/g, '<span class="gap">　　</span>')}</div>
          <div class="q-opts g-opts">${q.options.map((o) => `<button class="opt" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
      } else {
        q.punct = (q.s.match(/[.?!]$/) || [''])[0];
        q.words = q.s.replace(/[.?!]$/, '').split(' ');
        let order = shuffle(q.words.map((w, k) => k));
        for (let t = 0; t < 5 && order.every((v, k) => v === k); t++) order = shuffle(order);
        body = `<p class="q-prompt">连词成句</p>
          <p class="g-zh">${esc(q.zh)}</p>
          <div class="g-answer" aria-label="你的句子"><span class="g-ph">依次点击下面的单词</span></div>
          <div class="g-bank">${order.map((k) => `<button class="g-word" data-k="${k}">${esc(q.words[k])}</button>`).join('')}</div>
          <div class="g-order-btns"><button class="btn small ghost" data-greset>重新排</button><button class="btn small primary" data-gcheck disabled>检查</button></div>`;
      }
      container.innerHTML = `<div class="quiz">
        <div class="q-head"><span>第 ${i + 1} / ${qs.length} 题</span><div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div><span>得分 ${score}</span></div>
        ${body}
        <div class="q-feedback" aria-live="polite"></div>
      </div>`;
      if (q.type === 'c') $$('.opt', container).forEach((b) => b.addEventListener('click', () => answerChoice(b, q)));
      else wireOrder(q);
    };
    const feedback = (ok, q, html, sayText) => {
      if (ok) score++;
      const fb = $('.q-feedback', container);
      fb.innerHTML = `${ok ? '<b class="ok">✓ 正确！</b>' : `<b class="no">✗ ${html}</b>`}
        ${q.why ? `<span class="g-why">${esc(q.why)}</span>` : ''}
        ${sayText ? `<button class="link-btn" data-say="${esc(sayText)}">${ICON.speaker} 听整句</button>` : ''}
        <button class="btn small primary" data-next>${i + 1 < qs.length ? '下一题' : '查看结果'} ${ICON.arrow}</button>`;
      if (sayText) Speech.say(sayText);
      $('[data-next]', fb).addEventListener('click', () => { i++; if (i < qs.length) render(); else finish(); });
      $('[data-next]', fb).focus({ preventScroll: true });
    };
    const answerChoice = (btn, q) => {
      const ok = btn.dataset.opt === q.answer;
      $$('.opt', container).forEach((b) => { b.disabled = true; if (b.dataset.opt === q.answer) b.classList.add('right'); });
      if (!ok) btn.classList.add('wrong');
      const filled = gFilled(q);
      if (filled) $('.g-q', container).innerHTML = esc(filled);
      feedback(ok, q, `正确答案：${esc(q.answer)}`, filled);
    };
    const wireOrder = (q) => {
      const ans = $('.g-answer', container), bank = $('.g-bank', container), check = $('[data-gcheck]', container);
      const sync = () => {
        $('.g-ph', ans)?.toggleAttribute('hidden', !!ans.querySelector('.g-word'));
        check.disabled = !!bank.querySelector('.g-word');
      };
      const move = (e) => {
        const w = e.target.closest('.g-word');
        if (!w || container.querySelector('.q-feedback').childElementCount) return;
        (w.parentElement === bank ? ans : bank).append(w);
        sync();
      };
      ans.addEventListener('click', move);
      bank.addEventListener('click', move);
      $('[data-greset]', container).addEventListener('click', () => { $$('.g-word', ans).forEach((w) => bank.append(w)); sync(); });
      check.addEventListener('click', () => {
        const got = $$('.g-word', ans).map((w) => w.textContent).join(' ');
        const ok = got === q.words.join(' ');
        ans.classList.add(ok ? 'right' : 'wrong');
        $$('.g-word', container).forEach((w) => { w.disabled = true; });
        check.disabled = true; $('[data-greset]', container).disabled = true;
        feedback(ok, q, `正确的句子：${esc(q.s)}`, q.s);
      });
    };
    const finish = () => {
      const total = qs.length;
      const passed = score >= gPassMark(l);
      const s = score >= total ? 3 : score >= total - 1 ? 2 : 1;
      if (passed) {
        const old = gProgress()[l.id];
        gProgress()[l.id] = { done: true, stars: Math.max(s, old?.stars || 0), at: Date.now() };
        saveAll();
      }
      const next = G_LESSONS[G_LESSONS.indexOf(l) + 1];
      container.innerHTML = `<div class="result ${passed ? 'pass' : ''}">
        <div class="r-score">${score}<small>/${total}</small></div>
        <div class="r-stars">${passed ? stars(s) : ''}</div>
        <p>${passed ? (score === total ? '满分！太棒了 🎉' : '通过！本课已完成 👍') : '还差一点，再看看规则和例句，然后重试吧 💪'}</p>
        <div class="r-btns"><button class="btn ghost" data-action="gquiz">再测一次</button>${passed && next ? `<a class="btn primary" href="#/grammar/${next.id}">下一课：${esc(next.title)} ${ICON.arrow}</a>` : ''}</div>
      </div>`;
    };
    render();
  }

  /* ---------------- 词典 ---------------- */
  // 数据按单词前两个字母分片（js/dict/xx.js），用到时才加载；js/dict/index.js 是按词频排序的全部词条
  const DICT = { shards: {}, loading: {}, words: null, set: null };
  window.DICT_SHARD = (k, o) => { DICT.shards[k] = o; };
  const FORM_NAMES = { s: '复数', p: '过去式', d: '过去分词', i: '现在分词', 3: '第三人称单数', r: '比较级', t: '最高级' };
  const TAG_NAMES = { zk: '中考', gk: '高考', cet4: '四级', cet6: '六级', ky: '考研', toefl: '托福', ielts: '雅思', gre: 'GRE' };
  const DICT_TRY = ['night', 'knight', 'beautiful', 'enough', 'phone', 'treasure', 'station', 'laugh', 'island', 'cake', 'rabbit', 'chocolate'];
  const normWord = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z]/g, '');

  function loadScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve(true);
      s.onerror = () => { s.remove(); resolve(false); };
      document.head.append(s);
    });
  }
  function dictIndex() {
    if (DICT.words) return Promise.resolve(DICT.words);
    return (DICT.loading.index ||= loadScript('js/dict/index.js').then((ok) => {
      if (!ok) { delete DICT.loading.index; return []; }
      DICT.words = (window.DICT_INDEX || '').split(' ').filter(Boolean);
      DICT.set = new Set(DICT.words);
      return DICT.words;
    }));
  }
  function dictShard(key) {
    if (DICT.shards[key]) return Promise.resolve(DICT.shards[key]);
    return (DICT.loading[key] ||= loadScript(`js/dict/${key}.js`).then(() => { delete DICT.loading[key]; return DICT.shards[key] || {}; }));
  }
  async function dictLookup(w) {
    if (!w || (DICT.set && !DICT.set.has(w))) return null;
    const row = (await dictShard(w.slice(0, 2)))[w];
    if (!row) return null;
    const [ipa = '', zh = '', lemma = '', exch = '', tags = '', ex = []] = row;
    const e = { word: w, ipa: ipa.split('|'), zh, tags, ex, forms: [], lemma: null };
    if (lemma) { const [lw, type] = lemma.split(':'); e.lemma = { word: lw, type }; }
    exch.split('/').filter(Boolean).forEach((p) => { const [k, v] = p.split(':'); if (FORM_NAMES[k] && v) e.forms.push([k, v]); });
    return e;
  }
  const isDictWord = (x) => !!(DICT.shards[x.slice(0, 2)]?.[x] || DICT.set?.has(x));
  const firstSense = (zh) => (zh.split('\n')[0] || '').replace(/^[a-z]+\.\s*/, '').split('；').slice(0, 2).join('；');
  const formGloss = (row) => {
    if (!row) return '';
    if (row[1]) return firstSense(row[1]);
    if (row[2]) { const [lw, t] = row[2].split(':'); return `${lw} 的${FORM_NAMES[t] || '变形'}`; }
    return '';
  };

  // 课程索引：单词 → 所在课；字母组合（+读音）→ 讲它的课
  let CUR = null;
  function curIndex() {
    if (CUR) return CUR;
    CUR = { words: new Map(), cards: new Map() };
    LESSONS.forEach((l) => {
      l.words.forEach((raw) => { const p = Phonics.parseWord(raw); const k = p.text.toLowerCase(); if (!CUR.words.has(k)) CUR.words.set(k, { l, emoji: p.emoji }); });
      (l.cards || []).forEach((c) => {
        if (typeof c.s !== 'string') return;
        const k = `${c.g}|${c.s}`;
        if (!CUR.cards.has(k)) CUR.cards.set(k, l);
        if (c.s !== 'silent' && !CUR.cards.has(c.g)) CUR.cards.set(c.g, l);
      });
    });
    return CUR;
  }
  function lessonForSeg(sg) {
    const C = curIndex().cards;
    if (sg.magicE !== undefined) return C.get(`${sg.t}_e|${sg.sid}`) || C.get(`${sg.t}_e`);
    if (sg.magic) return null;
    return C.get(`${sg.t}|${sg.sid}`) || (sg.t.length > 1 && !sg.silent ? C.get(sg.t) : null);
  }

  // 用词典读音给单词做拼读拆解
  function dictAnalyze(e) {
    const tokens = e.ipa[0].split(' ');
    const r = window.G2P && G2P.align(e.word, tokens);
    const a = { text: e.word, tokens, segs: null, ipaMap: null, irregular: false, syl: null };
    // 缩写（etc、hiv）或读法完全对不上的词不做拆解
    if (r && /[aeiouy]/.test(e.word) && !r.segs.some((s) => s.cost >= 4)) {
      a.segs = r.segs.map((s) => ({ ...s, display: s.t, hl: s.magic || s.magicE !== undefined })); // 高亮魔法 e 和它影响的元音
      a.ipaMap = a.segs.map((s) => s.ph);
      a.irregular = r.irregular;
      a.syl = G2P.syllables(e.word, tokens, r.segs, isDictWord);
    }
    return a;
  }
  const tokIPA = (t) => t.replace(/[ˈˌ]/g, '');
  const ipaSpansTokens = (tokens, cls) => `<span class="${cls}">/${tokens.map((x, i) => `<span class="ip" data-p="${i}">${esc(x)}</span>`).join('')}/</span>`;

  function viewDict(word) {
    return `
    <section class="page-head dict-head">
      <p class="eyebrow">Dictionary</p>
      <h1>词典</h1>
      <p class="lead">输入英文单词，查看音标、中文释义和例句，听发音，并按自然拼读规则一块一块拼出来。</p>
      <form class="dict-form" id="dict-form" role="search" autocomplete="off">
        <div class="dict-box">
          ${ICON.search}
          <input id="dict-input" type="search" role="combobox" aria-expanded="false" aria-controls="dict-suggest" aria-autocomplete="list"
            aria-label="输入要查的英文单词" placeholder="输入英文单词，如 night" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" value="${esc(word || '')}">
          <button class="btn primary" type="submit">查询</button>
        </div>
        <div id="dict-suggest" class="dict-suggest" role="listbox" aria-label="联想词" hidden></div>
      </form>
    </section>
    <div id="dict-main" aria-live="polite">${word ? '<p class="hint dict-loading">正在查询…</p>' : dictHomeHtml()}</div>
    <p class="hint dict-credit">收录约 4 万个常用词（含常见变形）。释义来自 ECDICT，例句来自 Tatoeba（CC BY 2.0 FR），音标来自 CMU 发音词典（美式）。课程里学过的单词和例句播放预录音频，其他内容由浏览器朗读。</p>`;
  }

  function dictHomeHtml() {
    const recent = load('dictRecent', []);
    const chips = (list) => `<div class="chip-row">${list.map((w) => `<a class="chip-btn" href="#/dict/${encodeURIComponent(w)}">${esc(w)}</a>`).join('')}</div>`;
    return `${recent.length ? `<section class="block">
      <h2 class="block-title">最近查过 <button class="link-btn" data-action="dictclear">清空</button></h2>${chips(recent)}</section>` : ''}
    <section class="block">
      <h2 class="block-title">试试这些</h2>${chips(DICT_TRY)}
      <p class="hint">每个单词都会按自然拼读规则拆成字母组合。点"拼读"逐个听每块的发音，对应的音标会同步高亮。</p>
    </section>`;
  }

  function dictNotFound(w) {
    const near = [];
    const within1 = (a, b) => {
      if (Math.abs(a.length - b.length) > 1) return false;
      let i = 0, j = 0, diff = 0;
      while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { i++; j++; continue; }
        if (++diff > 1) return false;
        if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
      }
      return diff + (a.length - i) + (b.length - j) <= 1;
    };
    for (const x of DICT.words || []) { if (within1(x, w)) { near.push(x); if (near.length >= 8) break; } }
    if (near.length < 8) for (const x of DICT.words || []) { if (x.startsWith(w) && !near.includes(x)) { near.push(x); if (near.length >= 8) break; } }
    return `<section class="block dict-miss">
      <h2 class="block-title">没有找到"${esc(w)}"</h2>
      ${near.length ? `<p>你是不是要找：</p><div class="chip-row">${near.map((x) => `<a class="chip-btn" href="#/dict/${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div>` : ''}
      <p class="hint">词典收录约 4 万个常用词，暂不支持词组和专有名词。请检查拼写，或换成单词原形再查。</p>
    </section>`;
  }

  function dictEntryHtml(e, base) {
    const a = dictAnalyze(e);
    const idx = registerWord(a);
    const C = curIndex();
    const cur = C.words.get(e.word);
    const defsSrc = e.zh || base?.zh || '';
    const defs = defsSrc.split('\n').filter(Boolean).map((line) => {
      const m = line.match(/^([a-z]+\.)\s*(.*)$/);
      return `<li>${m ? `<span class="pos">${esc(m[1])}</span><span>${esc(m[2])}</span>` : `<span>${esc(line)}</span>`}</li>`;
    }).join('');
    const lemmaNote = e.lemma ? `<p class="de-lemma">${esc(e.word)} 是 <a href="#/dict/${encodeURIComponent(e.lemma.word)}">${esc(e.lemma.word)}</a> 的${FORM_NAMES[e.lemma.type] || '变形'}${base && !e.zh ? '，下面是原形的释义' : ''}</p>` : '';
    // 变形：同一个词合并（lit：过去式 / 过去分词）
    const byWord = new Map();
    const ORDER = 'spdi3rt';
    [...e.forms].sort((x, y) => ORDER.indexOf(x[0]) - ORDER.indexOf(y[0]))
      .forEach(([k, v]) => v.split(',').forEach((f) => { if (f && f !== e.word) byWord.set(f, [...(byWord.get(f) || []), FORM_NAMES[k]]); }));
    const forms = [...byWord].map(([f, names]) => `<span class="de-form"><em>${[...new Set(names)].join(' / ')}</em><a href="#/dict/${encodeURIComponent(f)}">${esc(f)}</a></span>`).join('');
    const tags = (e.tags || base?.tags || '').split(' ').filter((t) => TAG_NAMES[t]).map((t) => `<span class="de-tag">${TAG_NAMES[t]}</span>`).join('');
    const syl = a.syl && a.syl.length > 1 ? a.syl.map((st, i) => e.word.slice(st, a.syl[i + 1])).join('·') : '';
    const alt = e.ipa.slice(1).map((x) => '/' + x.split(' ').join('') + '/').join('　');

    const head = `<article class="block de-card" data-w="${idx}">
      <div class="de-head">
        ${cur?.emoji ? `<div class="de-emoji" aria-hidden="true">${cur.emoji}</div>` : ''}
        <h2 class="de-word"><button class="wc-word" data-say="${esc(e.word)}" aria-label="朗读 ${esc(e.word)}">${a.segs ? wordTiles(a) : `<span class="de-plain">${esc(e.word)}</span>`}</button></h2>
        <div class="de-ipa">${ipaSpansTokens(a.tokens, 'wc-ipa')}${alt ? `<span class="de-alt">也读 ${esc(alt)}</span>` : ''}</div>
        <div class="de-actions">
          <button class="btn primary" data-say="${esc(e.word)}">${ICON.speaker} 发音</button>
          ${a.segs ? `<button class="btn ghost" data-blend="${idx}">${ICON.blend} 拼读</button>` : ''}
        </div>
        ${syl || tags || cur ? `<div class="de-meta">${syl ? `<span class="de-syl">音节 <b>${esc(syl)}</b></span>` : ''}${tags}${cur ? `<a class="de-lesson" href="#/lesson/${cur.l.id}?w=${encodeURIComponent(e.word)}">课程单词 · 第 ${cur.l.id} 课 ${esc(cur.l.title)}</a>` : ''}</div>` : ''}
      </div>
      ${lemmaNote}
      ${defs ? `<h3 class="de-sub">释义</h3><ul class="de-defs">${defs}</ul>` : ''}
      ${forms ? `<h3 class="de-sub">词形变化</h3><div class="de-forms">${forms}</div>` : ''}
    </article>`;

    let breakdown = '';
    if (a.segs) {
      const segIPA = (sg) => (sg.silent ? '' : '/' + sg.ph.map((k) => tokIPA(a.tokens[k])).join('') + '/');
      const segName = (sg) => {
        if (sg.silent) return sg.magic ? '魔法 e · 不发音' : '不发音';
        if (sg.sid && SOUNDS[sg.sid]) return SOUNDS[sg.sid].zh;
        return sg.seq.map((x) => SOUNDS[x]?.zh || '').join(' + ');
      };
      const card = (sg) => {
        const l = lessonForSeg(sg);
        const act = sg.silent ? 'disabled' : sg.sid && SOUNDS[sg.sid] ? `data-ph="${sg.sid}"` : `data-phs="${sg.seq.join(',')}"`;
        const odd = !sg.silent && sg.cost >= 0.6;
        return `<div class="ph-seg${sg.silent ? ' silent' : ''}${odd ? ' odd' : ''}">
          <button class="ph-btn" ${act} aria-label="${esc(sg.t)} ${sg.silent ? '不发音' : '读 ' + esc(segIPA(sg))}">
            <span class="tile${sg.silent ? ' silent' : ''}${sg.t.length > 1 ? ' multi' : ''}">${esc(sg.t)}</span>
            <span class="ph-ipa">${sg.silent ? '—' : esc(segIPA(sg))}</span>
          </button>
          <span class="ph-name">${esc(segName(sg))}${odd ? '<i title="这个字母组合在这里的读法不常见">特殊</i>' : ''}</span>
          ${l ? `<a class="ph-lesson" href="#/lesson/${l.id}">第 ${l.id} 课</a>` : ''}
        </div>`;
      };
      const notes = [];
      const sounding = a.segs.filter((s) => !s.silent);
      notes.push(`${esc(e.word)} 拆成 ${a.segs.length} 块，读出 ${a.tokens.length} 个音：${sounding.map(segIPA).join(' + ')}。`);
      a.segs.forEach((sg) => {
        if (sg.magicE === undefined) return;
        notes.push(`${esc(sg.t)}…e 是<b>魔法 e</b>：结尾的 e 不发音，让前面的 ${esc(sg.t)} 读长音 ${esc(segIPA(sg))}。`);
      });
      const silent = a.segs.filter((s) => s.silent && !s.magic).map((s) => s.t);
      if (silent.length) notes.push(`不发音的字母：${silent.map(esc).join('、')}。`);
      breakdown = `<section class="block">
        <h2 class="block-title">拼读拆解 <small>点任意一块听它的发音</small></h2>
        ${a.irregular ? '<p class="de-warn">这个词的读法不完全符合常规拼读规则（常见于外来词和高频词），建议结合发音整体记忆。</p>' : ''}
        <div class="ph-grid">${a.segs.map(card).join('')}</div>
        <p class="hint ph-notes">${notes.join('<br>')}</p>
      </section>`;
    } else {
      breakdown = `<section class="block"><h2 class="block-title">拼读拆解</h2><p class="hint">这个词是缩写或读法特殊，没有拼读拆解，请直接听发音。</p></section>`;
    }

    const ex = e.ex.length ? e.ex : base?.ex || [];
    const hitWords = [e.word, ...(base ? [base.word] : []), ...[...byWord.keys()]];
    const hasZh = ex.some(([, zh]) => zh);
    const examples = ex.length ? `<section class="block">
      <h2 class="block-title">例句 <small>点句中单词可单独听</small>
        ${hasZh ? `<button class="link-btn" data-action="zh">${App.settings.zh ? '隐藏中文' : '显示中文'}</button>` : ''}</h2>
      <ol class="sentences ${App.settings.zh ? '' : 'nozh'}">${ex.map(([en, zh]) => `<li><button class="icon-btn play" data-say="${esc(en)}" data-toggle title="朗读整句" aria-label="朗读整句">${ICON.play}</button><div><p class="en">${highlightSentence(en, hitWords)}</p>${zh ? `<p class="zh">${esc(zh)}</p>` : ''}</div></li>`).join('')}</ol>
    </section>` : '';
    return head + breakdown + examples;
  }

  // 大号单词：缩小字号直到字母块放得下
  function fitDictWord() {
    const btn = $('.de-word .wc-word');
    if (!btn) return;
    btn.style.fontSize = '';
    const box = btn.closest('.de-head');
    let size = parseFloat(getComputedStyle(btn).fontSize);
    while (btn.scrollWidth > box.clientWidth - 8 && size > 16) { size -= 2; btn.style.fontSize = size + 'px'; }
  }

  let dictToken = 0;
  async function initDict(word) {
    const my = ++dictToken;
    setupDictSearch(word);
    if (!word) { dictIndex(); return; }
    const main = $('#dict-main');
    const [e] = await Promise.all([dictLookup(word), dictIndex()]);
    if (my !== dictToken || !main.isConnected) return;
    if (!e) { main.innerHTML = dictNotFound(word); return; }
    const base = e.lemma ? await dictLookup(e.lemma.word) : null;
    if (my !== dictToken || !main.isConnected) return;
    main.innerHTML = dictEntryHtml(e, base);
    fitDictWord();
    save('dictRecent', [word, ...load('dictRecent', []).filter((x) => x !== word)].slice(0, 12));
  }

  function setupDictSearch(word) {
    const form = $('#dict-form'), input = $('#dict-input'), box = $('#dict-suggest');
    if (!form) return;
    let items = [], active = -1, timer, seq = 0;
    const close = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const go = (w) => {
      w = normWord(w);
      if (!w) return;
      close();
      const h = `#/dict/${encodeURIComponent(w)}`;
      if (location.hash === h) route(); else location.hash = h;
    };
    const setAct = (i) => {
      $$('.ds-item[aria-selected="true"]', box).forEach((el) => el.setAttribute('aria-selected', 'false'));
      active = i;
      const el = $(`#ds-${i}`);
      if (el) { el.setAttribute('aria-selected', 'true'); el.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', el.id); }
      else input.removeAttribute('aria-activedescendant');
    };
    async function suggest() {
      const q = normWord(input.value);
      const my = ++seq;
      if (!q) { items = []; close(); return; }
      const words = await dictIndex();
      if (my !== seq) return;
      items = [];
      for (const w of words) { if (w.startsWith(q)) { items.push(w); if (items.length >= 8) break; } }
      if (DICT.set.has(q)) items = [q, ...items.filter((x) => x !== q)].slice(0, 8);
      if (!items.length) { close(); return; }
      const sh = q.length >= 2 ? await dictShard(q.slice(0, 2)) : null;
      if (my !== seq) return;
      box.innerHTML = items.map((w, i) => `<div role="option" id="ds-${i}" class="ds-item" aria-selected="false" data-word="${esc(w)}"><b><mark>${esc(w.slice(0, q.length))}</mark>${esc(w.slice(q.length))}</b><span>${esc(formGloss(sh?.[w]))}</span></div>`).join('');
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      active = -1;
      input.removeAttribute('aria-activedescendant');
    }
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(suggest, 60); });
    input.addEventListener('keydown', (e) => {
      if (box.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setAct((active + 1) % items.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((active - 1 + items.length) % items.length); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); go(active >= 0 ? items[active] : input.value); });
    box.addEventListener('pointerdown', (e) => e.preventDefault()); // 点联想词时输入框不失焦
    box.addEventListener('click', (e) => { const o = e.target.closest('.ds-item'); if (o) go(o.dataset.word); });
    box.addEventListener('pointermove', (e) => { const o = e.target.closest('.ds-item'); if (o) setAct(+o.id.slice(3)); });
    input.addEventListener('blur', () => setTimeout(close, 120));
    if (!word) input.focus({ preventScroll: true });
  }

  /* ---------------- 事件委托 ---------------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-say],[data-ph],[data-phs],[data-phkw],[data-blend],[data-pair],[data-action],[data-mode]');
    if (!t) return;
    if (t.matches('.opt')) return;
    const d = t.dataset;
    if (d.blend !== undefined) { e.preventDefault(); blend(+d.blend, t.closest('[data-w]')); return; }
    if (d.say !== undefined && d.toggle !== undefined) { e.preventDefault(); toggleSay(t); return; }
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
    else if (act === 'gquiz') startGrammarQuiz($('#gquiz'));
    else if (act === 'gmarkdone') { const id = $('#gquiz').dataset.glesson; gProgress()[id] = { done: true, stars: gProgress()[id]?.stars || 1, at: Date.now() }; saveAll(); route(); }
    else if (act === 'dictclear') { save('dictRecent', []); route(); }
    else if (act === 'reset') { if (confirm('确定要清空所有学习进度、星级和错词本吗？')) { App.progress = { lessons: {}, last: null, grammar: {} }; App.wrong = []; saveAll(); route(); } }
  });

  // 例句播放按钮：点一下开始，再点一下停止；播完、被其他声音打断时恢复成播放图标
  let playingBtn = null;
  function setPlaying(btn) {
    if (playingBtn && playingBtn !== btn) {
      playingBtn.classList.remove('playing');
      playingBtn.innerHTML = ICON.play;
      playingBtn.title = '朗读整句';
      playingBtn.setAttribute('aria-label', '朗读整句');
    }
    playingBtn = btn;
    if (btn) {
      btn.classList.add('playing');
      btn.innerHTML = ICON.stop;
      btn.title = '停止朗读';
      btn.setAttribute('aria-label', '停止朗读');
    }
  }
  function toggleSay(btn) {
    if (playingBtn === btn) { Speech.stop(); setPlaying(null); return; }
    setPlaying(btn);
    Speech.say(btn.dataset.say).then(() => { if (playingBtn === btn) setPlaying(null); });
  }

  function pulse(el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

  window.addEventListener('hashchange', route);
  route();
})();
