/* 每日一句：读取站内快照，按北京时间缓存；接口异常时保留最近一次成功内容。 */
(function (root) {
  const KEY = 'phonics-path.daily-quote';
  const day = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);

  function normalize(value) {
    if (!value || typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
    const parsed = new Date(value.date + 'T00:00:00Z');
    if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value.date) return null;
    if (typeof value.english !== 'string' || !value.english.trim() || typeof value.chinese !== 'string' || !value.chinese.trim()) return null;
    let audio = '';
    try { const url = new URL(value.audio); if (url.protocol === 'https:') audio = url.href; } catch { /* 无音频时使用浏览器朗读 */ }
    return { date: value.date, english: value.english.trim(), chinese: value.chinese.trim(), audio,
      source: '金山词霸', sourceUrl: 'https://www.iciba.com/' };
  }

  function browserStorage() {
    try { return root.localStorage; } catch { return null; }
  }
  function cachedQuote(storage, today) {
    try { const q = normalize(JSON.parse(storage?.getItem(KEY))); return q && q.date <= today ? q : null; } catch { return null; }
  }

  async function load({ storage = browserStorage(), fetcher = root.fetch.bind(root), today = day() } = {}) {
    const cached = cachedQuote(storage, today);
    if (cached?.date === today) return cached;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetcher('data/daily-quote.json', { cache: 'no-cache', priority: 'low', signal: controller.signal });
      if (!response.ok) throw Error('每日一句暂不可用');
      const q = normalize(await response.json());
      if (!q || q.date > today || (cached && q.date < cached.date)) return cached;
      try { storage?.setItem(KEY, JSON.stringify(q)); } catch { /* 隐私模式仍然显示内容 */ }
      return q;
    } catch { return cached; } finally { clearTimeout(timeout); }
  }

  async function mount(section) {
    if (!section) return;
    const paint = (q) => {
      if (!section.isConnected) return;
      section.querySelector('.dq-english').textContent = q ? q.english : '今天的一句话暂时没加载出来，下次来看看。';
      section.querySelector('.dq-chinese').textContent = q?.chinese || '';
      const time = section.querySelector('time');
      time.textContent = q?.date.replaceAll('-', '.') || ''; time.dateTime = q?.date || '';
      const source = section.querySelector('.dq-source'); source.hidden = !q;
      const button = section.querySelector('button'); button.hidden = !q;
      if (q) { button.dataset.say = q.english; button.dataset.clip = q.audio; }
    };
    const cached = cachedQuote(browserStorage(), day());
    if (cached) paint(cached);
    paint(await load());
    section.removeAttribute('aria-busy');
  }

  const api = { day, normalize, load, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DailyQuote = api;
})(globalThis);
