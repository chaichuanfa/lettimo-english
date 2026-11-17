/* 单词（背单词）页面：选词书、每日学习、单词列表、进度导出导入。
 * 排期、排队和出题规则都在 js/vocab-core.js，这里只负责显示、保存和接线；通用工具取自 App.ui（js/app.js 导出）。
 * 本文件先于 app.js 加载，所以 App.ui 一律在调用时才取。 */
(function () {
  const C = window.VocabCore;
  const ui = () => window.App.ui;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLOR = '#CE82FF';

  /* ---------------- 存储（适配层：换平台时只换这里） ---------------- */
  const KEY = 'phonics-path.vocab';
  const store = {
    load() { try { return C.normalize(JSON.parse(localStorage.getItem(KEY))); } catch { return C.emptyData(); } },
    save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } },
  };
  let data = store.load();
  const save = () => store.save(data);
  const today = () => C.dayIndex(Date.now());
  const nowSec = () => Math.floor(Date.now() / 1000);

  /* ---------------- 词书数据（js/vocab/core.js，进入单词页时才加载） ---------------- */
  let CORE = null, coreLoading = null;
  function loadCore() {
    if (CORE) return Promise.resolve(CORE);
    return (coreLoading ||= ui().loadScript('js/vocab/core.js').then(() => {
      const v = window.VOCAB_CORE;
      if (!v) { coreLoading = null; return null; }
      const list = v.words.map(([w, ipa, g, bits], i) => ({ w, ipa, g, bits, i }));
      CORE = { books: v.books, list, map: new Map(list.map((x) => [x.w, x])) };
      return CORE;
    }));
  }
  const CUSTOM = { id: 'custom', name: '生词本', desc: '在词典里点"加入生词本"收藏的词' };
  const books = () => [...CORE.books, ...(data.custom.length ? [{ ...CUSTOM, count: data.custom.length }] : [])];
  const currentBook = () => books().find((b) => b.id === data.settings.book) || null;
  const orders = {};
  function bookOrder(id) {
    if (id === 'custom') return data.custom;
    const b = CORE.books.find((x) => x.id === id);
    return (orders[id] ||= CORE.list.filter((x) => (x.bits & b.bit) && !(x.bits & b.not)).map((x) => x.w));
  }
  // 一个词出题要用的信息：词书里的词直接取；生词本、错词里的其他词从词典分片里查
  const extra = new Map();
  async function info(w) {
    const c = CORE.map.get(w) || extra.get(w);
    if (c) return c;
    const e = await ui().dictLookup(w);
    if (!e) return null;
    let zh = e.zh;
    if (!zh && e.lemma) zh = (await ui().dictLookup(e.lemma.word))?.zh || '';
    const g = C.shortGloss(zh);
    if (!g) return null;
    const x = { w, ipa: e.ipa[0].replace(/ /g, ''), g, i: -1 };
    extra.set(w, x);
    return x;
  }
  // 干扰项从词频相近的词里挑，难度才相当
  function pool(x) {
    const L = CORE.list;
    const mid = x.i >= 0 ? x.i : Math.floor(Math.random() * L.length);
    const from = Math.max(0, Math.min(mid - 150, L.length - 300));
    return L.slice(from, from + 300);
  }

  // 不在今年的日期带上年份（"还要 700 天"时只写月日会看错）
  const fmtDate = (day) => { const d = C.dayToDate(day), y = d.getUTCFullYear(); return `${y === C.dayToDate(today()).getUTCFullYear() ? '' : `${y} 年 `}${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`; };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  function statusOf(w) {
    const r = data.words[w];
    if (!r) return ['unseen', '未学'];
    if (r.s >= C.MASTERED || r.k) return ['mastered', '已掌握'];
    if (r.s >= 5) return ['familiar', '熟悉'];
    return ['learning', '学习中'];
  }

  /* ---------------- 页面入口 ---------------- */
  function view() {
    return `<div id="words-root" style="--lv:${COLOR}"><section class="page-head"><p class="eyebrow">Words</p><h1>单词</h1><p class="lead">正在加载词书…</p></section></div>`;
  }
  async function init(sub, params) {
    const root = $('#words-root');
    if (!root) return;
    const core = await loadCore();
    if (!root.isConnected) return;
    if (!core) { root.innerHTML = `<section class="page-head"><h1>单词</h1><p class="lead">词书数据加载失败，请检查网络后刷新页面。</p></section>`; return; }
    if (sub === 'study') study(root, params);
    else if (sub === 'list') list(root, params);
    else home(root);
  }

  /* ---------------- 首页：今日任务、学习记录、词书进度 ---------------- */
  function bookPicker(title, hint) {
    return `<section class="block">
      <h2 class="block-title">${title}</h2>
      ${hint ? `<p class="hint">${hint}</p>` : ''}
      <div class="modes ws-books">${books().map((b) => {
        const st = C.bookStats(data, bookOrder(b.id));
        const learned = st.total - st.unseen;
        return `<button class="mode${b.id === data.settings.book ? ' on' : ''}" data-ws-book="${b.id}">
          <b>${esc(b.name)} <small>${st.total} 词</small></b><span>${esc(b.desc)}</span>
          ${learned ? `<span class="ws-book-prog"><span class="bar"><i style="width:${pct(learned, st.total)}%"></i></span>已学 ${learned}</span>` : ''}
        </button>`;
      }).join('')}</div>
    </section>`;
  }

  function home(root) {
    const book = currentBook();
    const head = (lead) => `<section class="page-head">
      <div class="ws-headrow"><div><p class="eyebrow">Words</p><h1>单词</h1></div>
        <button class="btn small ghost ws-set-btn" data-ws-settings aria-haspopup="dialog">${ICON_SET}<span>设置</span></button></div>
      <p class="lead">${lead}</p></section>`;
    if (!book) {
      root.innerHTML = head('每天学一点新词，学过的词按 1、2、4、7、15、30、60 天的间隔安排复习。先选一本词书。')
        + bookPicker('选一本词书', '进度按单词记录：在一本书里学过的词，换到别的书里也算已学。以后可以随时换书。');
      bindHome(root);
      return;
    }
    const order = bookOrder(book.id);
    const t = today();
    const plan = C.planToday(data, order, t);
    const st = C.bookStats(data, order);
    const log = data.days[t] || {};
    const S = data.settings;
    const todo = plan.dueWords.length + plan.learning.length + plan.newQuota;
    const started = (log.n || 0) + (log.k || 0) + (log.r || 0) > 0;
    const notes = [];
    if (plan.due > plan.dueWords.length) notes.push(`到期的词共 ${plan.due} 个，今天先复习最久没复习的 ${plan.dueWords.length} 个。`);
    if (plan.backlog === 'half') notes.push('待复习的词超过了每日上限，今天的新词减半，先把复习补上。');
    if (plan.backlog === 'stop') notes.push('待复习的词太多了，今天不安排新词，先把复习补上。');
    const lee = C.leeches(data).length;
    const days = st.unseen ? Math.ceil(st.unseen / S.newPerDay) : 0;
    const seg = (k, n) => (n ? `<i class="${k}" style="width:${(n / st.total) * 100}%"></i>` : '');

    root.innerHTML = head(`正在学：<b>${esc(book.name)}</b>。每天先复习到期的词，再学新词。`) + `
    <section class="block ws-today">
      <h2 class="block-title">今日任务</h2>
      <div class="ws-nums">
        <div><b>${plan.dueWords.length}</b><span>待复习</span></div>
        <div><b>${plan.newQuota}</b><span>新词</span></div>
        ${plan.learning.length ? `<div><b>${plan.learning.length}</b><span>没巩固完</span></div>` : ''}
      </div>
      ${notes.map((n) => `<p class="hint">${n}</p>`).join('')}
      <div class="dc-cta">
        ${todo ? `<a class="btn primary" href="#/words/study">${started ? '继续学习' : '开始今天的学习'} ${ui().ICON.arrow}</a>`
          : `<p class="ws-done">今天的任务完成了 🎉</p>${st.unseen ? '<a class="btn ghost" href="#/words/study?more=5">再学 5 个新词</a>' : ''}`}
      </div>
    </section>
    <section class="block">
      <h2 class="block-title">学习记录</h2>
      <div class="ws-stats">
        <div><b>${log.n || 0}</b><span>今日新学</span></div>
        <div><b>${log.r || 0}</b><span>今日复习</span></div>
        <div><b>${log.r ? pct(log.ok || 0, log.r) + '%' : '—'}</b><span>复习正确率</span></div>
        <div><b>${C.streak(data, t)}</b><span>连续学习天数</span></div>
      </div>
    </section>
    <section class="block">
      <h2 class="block-title">${esc(book.name)} <small>${st.total} 词</small><a class="link-btn" href="#/words/list">单词列表</a></h2>
      <div class="ws-bar" role="img" aria-label="已掌握 ${st.mastered}，熟悉 ${st.familiar}，学习中 ${st.learning}，未学 ${st.unseen}">${seg('mastered', st.mastered)}${seg('familiar', st.familiar)}${seg('learning', st.learning)}</div>
      <ul class="ws-legend">
        <li><i class="mastered"></i>已掌握 <b>${st.mastered}</b></li><li><i class="familiar"></i>熟悉 <b>${st.familiar}</b></li>
        <li><i class="learning"></i>学习中 <b>${st.learning}</b></li><li><i class="unseen"></i>未学 <b>${st.unseen}</b></li>
      </ul>
      <p class="hint">${st.unseen ? `按每天 ${S.newPerDay} 个新词，最晚 ${fmtDate(t + days)}学完（还要 ${days} 天）。新词会先考一下，认识的直接跳过，实际会更快。` : '这本书的词都学过了，继续按时复习就好。'}</p>
      ${lee ? `<p class="hint"><a href="#/words/list?f=leech">顽固词 ${lee} 个</a>：累计答错 ${C.LEECH_LAPSES} 次以上的词，建议到词典里看看拼读拆解。</p>` : ''}
    </section>`;
    bindHome(root);
  }

  function bindHome(root) {
    $$('[data-ws-book]', root).forEach((b) => b.addEventListener('click', () => { data.settings.book = b.dataset.wsBook; save(); home(root); }));
    $('[data-ws-settings]', root)?.addEventListener('click', openSettings);
  }

  /* ---------------- 设置弹窗（单词首页右上角的"设置"按钮打开） ---------------- */
  const ICON_SET = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.6"/><circle cx="9" cy="17" r="2.6"/></svg>';
  let dlg = null;
  // 改了设置之后，把弹窗后面的单词首页重画一遍
  const refreshHome = () => { const root = $('#words-root'); if (root && $('[data-ws-settings]', root)) home(root); };
  function settingsHtml(msg) {
    const S = data.settings;
    const opt = (v, label, cur) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${label}</option>`;
    return `<div class="ws-dlg">
      <div class="ws-dlg-head"><h2 id="ws-set-title">单词设置</h2><button class="sd-close" data-ws-close aria-label="关闭设置">Esc</button></div>
      <div class="ws-dlg-body">
        <div class="field"><label for="ws-book">词书</label>
          <select id="ws-book">${currentBook() ? '' : '<option value="" selected disabled>还没有选词书</option>'}${books().map((b) => opt(b.id, `${esc(b.name)}（${b.count} 词）`, S.book)).join('')}</select></div>
        <div class="field"><label for="ws-per">每天新词</label>
          <select id="ws-per">${[5, 10, 20, 30, 50].map((n) => opt(n, `${n} 个`, S.newPerDay)).join('')}</select></div>
        <div class="field"><label for="ws-spell">熟悉之后的复习方式</label>
          <select id="ws-spell">${opt(1, '听发音拼写单词', S.spelling ? 1 : 0)}${opt(0, '回忆意思后自己判断', S.spelling ? 1 : 0)}</select></div>
        <p class="hint">修改后立即生效。每天最多复习 ${S.reviewCap} 个词。</p>
        <div class="ws-dlg-data">
          <h3>学习进度</h3>
          <p class="hint">进度保存在这台设备的浏览器里。换设备时先导出成文件，再到另一台设备导入。</p>
          <div class="dc-cta">
            <button class="btn small ghost" data-ws-export>导出进度</button>
            <button class="btn small ghost" data-ws-import>导入进度</button>
            <input type="file" id="ws-file" accept="application/json,.json" hidden>
          </div>
          <p class="hint" id="ws-msg" role="status">${esc(msg || '')}</p>
        </div>
      </div>
      <div class="ws-dlg-foot"><button class="btn primary" data-ws-close>完成</button></div>
    </div>`;
  }
  function settingsDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'ws-settings'; dlg.className = 'ws-dialog';
    dlg.setAttribute('closedby', 'any');   // 点弹窗外面或按 Esc 关闭；不支持这个属性的浏览器由下面的点击处理兜底
    dlg.setAttribute('aria-labelledby', 'ws-set-title');
    document.body.append(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-ws-close]')) dlg.close();
      else if (e.target.closest('[data-ws-export]')) exportData();
      else if (e.target.closest('[data-ws-import]')) $('#ws-file', dlg).click();
    });
    dlg.addEventListener('change', async (e) => {
      const el = e.target;
      if (el.id === 'ws-file') { await importData(el.files[0]); return; }
      if (el.id === 'ws-book') data.settings.book = el.value;
      else if (el.id === 'ws-per') data.settings.newPerDay = +el.value;
      else if (el.id === 'ws-spell') data.settings.spelling = el.value === '1';
      else return;
      save(); refreshHome();
    });
    window.addEventListener('hashchange', () => { if (dlg.open) dlg.close(); });   // 按浏览器的后退键离开页面时一起关掉
    return dlg;
  }
  async function openSettings() {
    if (!(await loadCore())) return;
    settingsDialog().innerHTML = settingsHtml('');
    if (!dlg.open) dlg.showModal();
  }

  async function importData(f) {
    if (!f) return;
    let msg;
    try {
      const obj = JSON.parse(await f.text());
      if (!C.isValid(obj)) throw new Error('format');
      const before = Object.keys(data.words).length;
      data = C.mergeData(data, obj);
      msg = save() ? `已导入：合并后共 ${Object.keys(data.words).length} 个词的进度（原来 ${before} 个）。两边都有的词保留较新的记录。` : '导入失败：浏览器存储空间不足。';
    } catch { msg = '导入失败：这不是本站导出的单词进度文件。'; }
    refreshHome();
    dlg.innerHTML = settingsHtml(msg);   // 词书列表可能多了生词本，整块重画
  }

  function exportData() {
    const d = new Date();
    const name = `english-path-words-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const el = $('#ws-msg'); if (el) el.textContent = `已导出 ${Object.keys(data.words).length} 个词的进度到文件 ${name}。`;
  }

  /* ---------------- 学习：一次只显示一个任务 ---------------- */
  const KIND = { review: '复习', probe: '新词 · 先考一下', verify: '新词 · 再确认一次', learn: '新词 · 学习', drill: '新词 · 巩固' };
  const PROMPT = { meaning: '这个单词是什么意思？', audio: '听发音，选出它的意思', listen: '听发音，选出正确的单词', spell: '听发音，拼出这个单词', recall: '先回忆它的意思，再看答案' };

  function study(root, params) {
    const book = currentBook();
    if (!book) { home(root); return; }
    const reviewOnly = params.get('only') === 'review';   // 从"复习"页进来：只复习到期的词
    const sess = C.createSession({ data, order: bookOrder(book.id), today: today(), extra: Math.max(0, +params.get('more') || 0), reviewOnly });
    const pendingN = reviewOnly ? 0 : sess.plan.learning.length;   // 上次没巩固完的词
    const goal = sess.reviewTotal + pendingN + sess.quota;
    root.innerHTML = `<section class="block ws" id="ws">
      <div class="ws-head"><a class="crumb" href="#/words">${ui().ICON.back} 退出</a><span class="ws-kind"></span></div>
      <div class="q-head"><span class="ws-count"></span><div class="bar"><i></i></div><span class="ws-new"></span></div>
      <div id="ws-task" aria-live="polite"></div>
    </section>`;
    const box = $('#ws-task', root);
    const alive = () => box.isConnected;
    let timer = 0, busy = false;   // busy：上一题已提交、下一题还没显示出来时，忽略多余的点击

    function header(t) {
      const p = sess.progress();
      const done = p.reviewDone + p.graduated;
      $('.ws-kind', root).textContent = t ? KIND[t.kind] + (t.retry ? ' · 再来一次' : '') : '';
      $('.ws-count', root).textContent = sess.reviewTotal ? `复习 ${p.reviewDone}/${sess.reviewTotal}` : '';
      $('.ws-new', root).textContent = sess.quota || pendingN ? `新词 ${p.graduated}/${sess.quota + pendingN}` : '';
      $('.q-head .bar i', root).style.width = `${goal ? Math.min(100, (done / goal) * 100) : 100}%`;
    }
    const submit = (res) => { if (busy) return; busy = true; clearTimeout(timer); sess.submit(res); save(); step(); };

    async function step() {
      const t = sess.current();
      save();
      if (!alive()) return;
      if (!t) { finish(); return; }
      const x = await info(t.w);
      if (!alive()) return;
      if (!x) { sess.skip(); step(); return; }   // 查不到释义（词典里没有或网络出错）就没法出题，这次先跳过
      busy = false;
      header(t);
      if (t.kind === 'learn') learn(x);
      else question(t, x, t.kind === 'probe' || t.kind === 'verify' ? 'meaning' : t.qtype);   // 摸底和复核都是看词选义
      prefetch();
    }
    // 提前加载后面几个词的词典分片，翻到学习卡片时不用等
    function prefetch() { const t = sess.current(); if (t && (t.kind === 'probe' || t.kind === 'learn')) ui().dictLookup(t.w); }

    const wordHead = (x) => `<div class="q-word ws-word">${esc(x.w)}</div><span class="wc-ipa big">/${esc(x.ipa)}/</span>
      <button class="link-btn" data-say="${esc(x.w)}">${ui().ICON.speaker} 听发音</button>`;
    const sayLater = (w) => setTimeout(() => { if (alive()) window.Speech.say(w); }, 250);

    // 答完之后：答对自动进入下一题，答错停下来看答案
    // kind 是任务类型：新词的摸底（probe）和复核（verify）答错不算错，只是说明这个词要学
    function feedback(x, ok, res, holder, kind) {
      const fresh = kind === 'probe' || kind === 'verify';
      const msg = ok ? `<b class="ok">✓ ${kind === 'verify' ? '两次都答对，这个词算认识，跳过' : '正确'}</b>`
        : `<b class="no">${fresh ? '这个词还不熟，接下来学它' : '✗ 答错了，过一会儿再考一次'}</b>`;
      holder.innerHTML = `${msg}
        <div class="ws-ans"><b>${esc(x.w)}</b><span class="wc-ipa">/${esc(x.ipa)}/</span><button class="icon-btn" data-say="${esc(x.w)}" title="朗读" aria-label="朗读 ${esc(x.w)}">${ui().ICON.speaker}</button><span>${esc(x.g)}</span></div>
        <div class="ws-fb-btns">${ok || fresh ? '' : '<button class="btn small ghost" data-card>看单词卡片</button>'}<button class="btn small primary" data-next>继续 ${ui().ICON.arrow}</button></div>
        <div class="ws-inline-card"></div>`;
      const go = () => submit(res);
      $('[data-next]', holder).addEventListener('click', go);
      $('[data-card]', holder)?.addEventListener('click', async (e) => { e.target.remove(); const html = await cardHtml(x); if (alive()) { $('.ws-inline-card', holder).innerHTML = html; ui().fitDictWord(); } });
      if (ok) timer = setTimeout(go, 1200);
      else $('[data-next]', holder).focus({ preventScroll: true });
    }

    function question(t, x, qtype) {
      const frame = (body, tail) => { box.innerHTML = `<div class="quiz"><p class="q-prompt">${PROMPT[qtype]}</p><div class="q-body">${body}</div>${tail}<div class="q-feedback ws-fb" aria-live="polite"></div></div>`; };
      const play = `<button class="big-play" data-say="${esc(x.w)}">${ui().ICON.speaker}<span>再听一遍</span></button>`;
      const fb = () => $('.q-feedback', box);
      if (qtype === 'spell') {
        frame(`${play}<p class="ws-gloss">${esc(x.g)}</p>`, `<form class="spell-form" autocomplete="off"><input id="ws-in" type="text" inputmode="latin" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="输入单词" placeholder="在这里输入…"><button class="btn primary" type="submit">检查</button></form>`);
        const input = $('#ws-in', box);
        setTimeout(() => { if (alive()) { window.Speech.say(x.w); input.focus({ preventScroll: true }); } }, 250);
        $('.spell-form', box).addEventListener('submit', (e) => {
          e.preventDefault();
          if (input.disabled || !input.value.trim()) return;
          const ok = input.value.trim().toLowerCase() === x.w;
          input.disabled = true; input.classList.add(ok ? 'right' : 'wrong');
          $('.spell-form button', box).disabled = true;
          feedback(x, ok, { ok }, fb());
        });
      } else if (qtype === 'recall') {
        frame(wordHead(x), `<div class="fc-judge ws-judge"><button class="btn primary" data-reveal>显示答案</button></div>`);
        sayLater(x.w);
        $('[data-reveal]', box).addEventListener('click', () => {
          $('.ws-judge', box).innerHTML = `<p class="ws-gloss">${esc(x.g)}</p><button class="btn no" data-ans="0">忘了</button><button class="btn primary" data-ans="1">记得</button>`;
          $$('[data-ans]', box).forEach((b) => b.addEventListener('click', () => submit({ ok: b.dataset.ans === '1' })));
        });
      } else {
        const { options, answer } = qtype === 'listen' ? C.wordOptions(x, pool(x), Math.random) : C.meaningOptions(x, pool(x), Math.random);
        frame(qtype === 'meaning' ? wordHead(x) : play,
          `<div class="q-opts ${qtype === 'listen' ? '' : 'zh ws-one'}">${options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
          ${t.kind === 'probe' ? '<p class="hint ws-center ws-probe-tip">新词先考一下：连着答对两次算认识，直接跳过；答错就开始学。<button class="link-btn" data-unknown>不认识，直接学</button></p>' : ''}`);
        sayLater(x.w);
        // 不想蒙的话可以直接说不认识（不是必选，直接答题就行）
        $('[data-unknown]', box)?.addEventListener('click', () => submit({ ok: false }));
        $$('.opt', box).forEach((b) => b.addEventListener('click', () => {
          const ok = options[+b.dataset.i] === answer;
          $$('.opt', box).forEach((o) => { o.disabled = true; if (options[+o.dataset.i] === answer) o.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          if (qtype !== 'meaning') window.Speech.say(x.w);
          $('.ws-probe-tip', box)?.remove();
          feedback(x, ok, { ok }, fb(), t.kind);
        }));
      }
    }

    async function learn(x) {
      box.innerHTML = `<p class="hint ws-center">正在加载…</p>`;
      const html = await cardHtml(x);
      if (!alive()) return;
      box.innerHTML = `${html}<div class="fc-judge ws-judge"><button class="btn primary" data-next>记住了，继续 ${ui().ICON.arrow}</button></div>`;
      ui().fitDictWord();
      sayLater(x.w);
      $('[data-next]', box).addEventListener('click', () => submit({}));
    }

    function finish() {
      const p = sess.progress();
      header(null);
      const st = C.bookStats(data, bookOrder(book.id));
      const nothing = !p.reviewDone && !p.graduated && !p.known;
      box.innerHTML = `<div class="result pass">
        <div class="r-score">${nothing ? '✓' : '🎉'}</div>
        <p>${nothing ? (reviewOnly ? '现在没有到期要复习的词。' : '现在没有要学的词了。') : reviewOnly ? '复习完成了！' : '这次学习完成了！'}</p>
        ${nothing ? '' : `<div class="ws-stats"><div><b>${p.graduated}</b><span>新学会</span></div><div><b>${p.known}</b><span>认识并跳过</span></div><div><b>${p.reviewDone}</b><span>复习</span></div><div><b>${p.reviewDone ? pct(p.reviewRight, p.reviewDone) + '%' : '—'}</b><span>复习正确率</span></div></div>`}
        <p class="hint">${reviewOnly ? '' : '新学的词明天开始复习。'}${C.planToday(data, bookOrder(book.id), today()).due > 0 ? '还有到期的词没复习完，可以再来一轮。' : ''}</p>
        <div class="r-btns">${reviewOnly
          ? `<a class="btn ghost" href="#/review">返回复习</a>${C.planToday(data, bookOrder(book.id), today()).newQuota ? `<a class="btn primary" href="#/words/study">接着学今天的新词 ${ui().ICON.arrow}</a>` : ''}`
          : `<a class="btn ghost" href="#/words">返回单词首页</a>${st.unseen ? '<button class="btn primary" data-ws-more>再学 5 个新词</button>' : ''}`}</div>
      </div>`;
      $('[data-ws-more]', box)?.addEventListener('click', () => study(root, new URLSearchParams('more=5')));
    }

    step();
  }

  // 单词卡片：拼读拆分和音标 → 释义 → 例句 → 词形变化。标记沿用词典页的样式
  async function cardHtml(x) {
    const U = ui();
    const e = await U.dictLookup(x.w);
    if (!e) return `<article class="ws-card"><div class="de-head"><h2 class="de-word"><span class="de-plain">${esc(x.w)}</span></h2><div class="de-ipa"><span class="wc-ipa">/${esc(x.ipa)}/</span></div></div><p class="ws-gloss">${esc(x.g)}</p></article>`;
    const base = e.lemma && !e.zh ? await U.dictLookup(e.lemma.word) : null;
    const a = U.dictAnalyze(e);
    const idx = U.registerWord(a);
    const defs = (e.zh || base?.zh || '').split('\n').filter(Boolean).slice(0, 5).map((line) => {
      const m = line.match(/^([a-z]+\.)\s*(.*)$/);
      return `<li>${m ? `<span class="pos">${esc(m[1])}</span><span>${esc(m[2])}</span>` : `<span>${esc(line)}</span>`}</li>`;
    }).join('');
    const forms = new Map();
    e.forms.forEach(([k, v]) => v.split(',').forEach((f) => { if (f && f !== e.word) forms.set(f, [...(forms.get(f) || []), U.FORM_NAMES[k]]); }));
    const ex = (e.ex.length ? e.ex : base?.ex || []).slice(0, 2);
    const syl = a.syl && a.syl.length > 1 ? a.syl.map((st, i) => e.word.slice(st, a.syl[i + 1])).join('·') : '';
    return `<article class="ws-card" data-w="${idx}">
      <div class="de-head">
        <h2 class="de-word"><button class="wc-word" data-say="${esc(e.word)}" aria-label="朗读 ${esc(e.word)}">${a.segs ? U.wordTiles(a) : `<span class="de-plain">${esc(e.word)}</span>`}</button></h2>
        <div class="de-ipa">${U.ipaSpansTokens(a.tokens, 'wc-ipa')}${syl ? `<span class="de-syl">音节 <b>${esc(syl)}</b></span>` : ''}</div>
        <div class="de-actions">
          <button class="btn small primary" data-say="${esc(e.word)}">${U.ICON.speaker} 发音</button>
          ${a.segs ? `<button class="btn small ghost" data-blend="${idx}">${U.ICON.blend} 拼读</button>` : ''}
        </div>
      </div>
      ${defs ? `<ul class="de-defs">${defs}</ul>` : ''}
      ${ex.length ? `<ol class="sentences">${ex.map(([en, zh]) => `<li><button class="icon-btn play" data-say="${esc(en)}" data-toggle title="朗读整句" aria-label="朗读整句">${U.ICON.play}</button><div><p class="en">${U.highlightSentence(en, [e.word, ...forms.keys()])}</p>${zh ? `<p class="zh">${esc(zh)}</p>` : ''}</div></li>`).join('')}</ol>` : ''}
      ${forms.size ? `<div class="de-forms">${[...forms].map(([f, names]) => `<span class="de-form"><em>${[...new Set(names)].join(' / ')}</em><b>${esc(f)}</b></span>`).join('')}</div>` : ''}
      <p class="hint"><a href="#/dict/${encodeURIComponent(e.word)}" target="_blank" rel="noopener">在词典里看完整的拼读拆解 ↗</a></p>
    </article>`;
  }

  // 键盘：1–4 选选项；回车进入下一步；自评时 1 / 2 对应左右两个按钮
  document.addEventListener('keydown', (e) => {
    const box = $('#ws-task');
    if (!box || e.metaKey || e.ctrlKey || e.altKey || e.target.matches('input, textarea, select')) return;
    const n = +e.key;
    if (n >= 1 && n <= 4) {
      const btns = $$('.opt:not(:disabled)', box).length ? $$('.opt', box) : $$('.ws-judge [data-ans]', box);
      const b = btns[n - 1];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    } else if (e.key === 'Enter') {
      const b = $('[data-next], [data-reveal]', box);
      if (b) { e.preventDefault(); b.click(); }   // 自己处理，不依赖"焦点正好在按钮上"
    }
  });

  /* ---------------- 单词列表 ---------------- */
  const FILTERS = [['all', '全部'], ['unseen', '未学'], ['learning', '学习中'], ['familiar', '熟悉'], ['mastered', '已掌握'], ['leech', '顽固词']];
  const PAGE_SIZE = 100;
  function list(root, params) {
    const book = currentBook();
    if (!book) { home(root); return; }
    const f = FILTERS.some(([k]) => k === params.get('f')) ? params.get('f') : 'all';
    const order = bookOrder(book.id);
    const words = f === 'leech' ? C.leeches(data) : f === 'all' ? order : order.filter((w) => statusOf(w)[0] === f);
    const pages = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
    const p = Math.min(pages, Math.max(1, +params.get('p') || 1));
    const t = today();
    const link = (ff, pp) => `#/words/list?f=${ff}${pp > 1 ? `&p=${pp}` : ''}`;
    const row = (w) => {
      const x = CORE.map.get(w) || extra.get(w);
      const [k, label] = statusOf(w);
      const r = data.words[w];
      const due = r && r.s >= 1 && r.s < C.MASTERED && !r.k ? (r.d <= t ? '今天复习' : `${r.d - t} 天后复习`) : '';
      return `<li><button class="icon-btn" data-say="${esc(w)}" title="朗读" aria-label="朗读 ${esc(w)}">${ui().ICON.speaker}</button>
        <div class="wl-main"><a class="wl-word" href="#/dict/${encodeURIComponent(w)}">${esc(w)}</a>${x ? `<span class="wc-ipa">/${esc(x.ipa)}/</span>` : ''}<p>${x ? esc(x.g) : ''}</p></div>
        <div class="wl-side"><span class="wl-tag ${k}">${label}</span>${due ? `<small>${due}</small>` : ''}${r && r.l ? `<small>错 ${r.l} 次</small>` : ''}
          ${book.id === 'custom' && f !== 'leech' ? `<button class="link-btn" data-ws-remove="${esc(w)}">移出生词本</button>` : ''}</div></li>`;
    };
    const slice = words.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
    const pager = pages > 1 ? `<nav class="wl-pager" aria-label="分页">${p > 1 ? `<a class="btn small ghost" href="${link(f, p - 1)}">上一页</a>` : ''}<span>第 ${p} / ${pages} 页</span>${p < pages ? `<a class="btn small ghost" href="${link(f, p + 1)}">下一页</a>` : ''}</nav>` : '';
    root.innerHTML = `<section class="page-head">
      <a class="crumb" href="#/words">${ui().ICON.back} 单词</a>
      <p class="eyebrow">Word List</p><h1>${esc(book.name)}</h1>
      <p class="lead">${f === 'leech' ? `累计答错 ${C.LEECH_LAPSES} 次以上、还没掌握的词（不限词书）。` : '按词频从高到低排列，学习时也按这个顺序。点单词可以查词典。'}</p>
    </section>
    <section class="block">
      <div class="chip-row wl-filters">${FILTERS.map(([k, label]) => `<a class="chip-btn${k === f ? ' accent' : ''}" href="${link(k, 1)}"${k === f ? ' aria-current="true"' : ''}>${label}</a>`).join('')}</div>
      <p class="hint">共 ${words.length} 个词</p>
      ${slice.length ? `<ul class="wl">${slice.map(row).join('')}</ul>` : '<p class="empty">这里还没有单词。</p>'}
      ${pager}
    </section>`;
    $$('[data-ws-remove]', root).forEach((b) => b.addEventListener('click', () => { data.custom = data.custom.filter((w) => w !== b.dataset.wsRemove); save(); if (!data.custom.length) data.settings.book = null; save(); list(root, params); }));
    // 生词本和顽固词里可能有词书以外的词，补查释义后刷新一次
    const missing = slice.filter((w) => !CORE.map.get(w) && !extra.has(w));
    if (missing.length) Promise.all(missing.map(info)).then((xs) => {
      missing.forEach((w, i) => { if (!xs[i]) extra.set(w, null); });   // 查不到的记下来，免得反复查
      if (root.isConnected && xs.some(Boolean)) list(root, params);
    });
  }

  /* ---------------- 和其他页面的接线 ---------------- */
  // 学过多少词、今天有多少到期（不限词书）
  function counts() {
    const t = today();
    let due = 0, learned = 0;
    for (const r of Object.values(data.words)) { if (r.s >= 1) learned++; if (r.s >= 1 && r.s < C.MASTERED && r.d !== null && r.d <= t) due++; }
    return { due, learned, started: !!data.settings.book };
  }
  // "复习"页里的单词区块
  function reviewHtml() {
    const { due, learned, started } = counts();
    const arrow = ui().ICON.arrow;
    if (!started) return `<p class="rv-line">还没有开始背单词。选一本词书学起来之后，到期要复习的词会出现在这里。</p>
      <div class="dc-cta"><a class="btn ghost" href="#/words">去选词书 ${arrow}</a></div>`;
    const cap = data.settings.reviewCap;
    return `<p class="rv-line">${due ? `今天有 <b>${due}</b> 个词到期要复习${due > cap ? `，一次先复习 ${cap} 个` : ''}。` : `到期的词都复习完了。已学 ${learned} 个词，下一批到期后会出现在这里。`}</p>
      <div class="dc-cta">${due ? `<a class="btn primary" href="#/words/study?only=review">开始复习 ${arrow}</a>` : ''}<a class="btn ghost" href="#/words">单词首页</a></div>`;
  }
  // 首页"单词"卡片
  function dash() {
    const t = today();
    const { due, learned } = counts();
    const arrow = ui().ICON.arrow;
    if (!data.settings.book) return { tag: '选词书', note: '中考、高考、四级、六级词汇。每天学一点新词，学过的词按间隔安排复习。', cta: `<a class="btn primary" href="#/words">选一本词书 ${arrow}</a><a class="btn ghost" href="#/dict">词典</a>` };
    const log = data.days[t] || {};
    const started = (log.n || 0) + (log.k || 0) + (log.r || 0) > 0;
    return {
      tag: due ? `${due} 个待复习` : '复习已清空',
      note: `已学 ${learned} 个词 · 今日新学 ${log.n || 0} 个 · 连续学习 ${C.streak(data, t)} 天`,
      cta: `<a class="btn primary" href="#/words/study">${started ? '继续学习' : '开始今天的学习'} ${arrow}</a><a class="btn ghost" href="#/words">学习计划</a>`,
    };
  }
  // 课程测验、复习里答错的词进入单词复习（开始用背单词之后才生效，免得没用过的人攒下一堆待复习）
  function onWrong(texts) {
    if (!data.settings.book) return;
    const t = today();
    let changed = false;
    for (const raw of texts) {
      const w = String(raw || '').toLowerCase();
      if (!/^[a-z]{2,}$/.test(w)) continue;
      data.words[w] = C.wrongAnswer(data.words[w], t, nowSec());
      changed = true;
    }
    if (changed) save();
  }
  // 词典页的"加入生词本"按钮
  const dictButton = (w) => `<button class="btn ghost" data-ws-custom="${esc(w)}">${data.custom.includes(w) ? '✓ 已在生词本' : '＋ 加入生词本'}</button>`;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ws-custom]');
    if (!b) return;
    const w = b.dataset.wsCustom;
    data.custom = data.custom.includes(w) ? data.custom.filter((x) => x !== w) : [...data.custom, w];
    if (!data.custom.length && data.settings.book === 'custom') data.settings.book = null;
    save();
    b.textContent = data.custom.includes(w) ? '✓ 已在生词本' : '＋ 加入生词本';
  });
  function reset() { data = C.emptyData(); save(); }

  window.Words = { view, init, dash, counts, reviewHtml, onWrong, dictButton, reset };
})();
