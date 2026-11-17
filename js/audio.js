/* 发音播放：优先使用预生成的音频文件（audio/manifest.js），缺失时退回浏览器语音合成。 */
(function () {
  const M = () => window.AUDIO_MANIFEST || { p: {}, t: {} };
  let token = 0;
  let current = null;
  let voice = null;

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /en[-_]US/i.test(v.lang) && /Samantha|Google US|Aria|Jenny/i.test(v.name))
      || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  const settings = () => window.App?.settings || { rate: 1, tts: false };

  function stop() {
    token++;
    if (current) { current.pause(); current.done?.(false); current = null; } // 被打断的播放也要结束它的 Promise
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function playFile(src, my) {
    return new Promise((resolve) => {
      if (my !== token) return resolve(false);
      const a = new Audio(src);
      a.preservesPitch = true;
      a.playbackRate = settings().rate;
      current = a;
      a.done = resolve;
      a.onended = () => { if (current === a) current = null; resolve(true); };
      a.onerror = () => resolve(false);
      a.play().catch(() => resolve(false));
    });
  }

  function tts(text, my, rateMul = 1) {
    return new Promise((resolve) => {
      if (my !== token || !('speechSynthesis' in window)) return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      if (voice) u.voice = voice;
      u.rate = Math.max(0.5, settings().rate * 0.95 * rateMul);
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      speechSynthesis.speak(u);
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function textNow(text, my) {
    const key = text.trim();
    const f = M().t[key] || M().t[key.toLowerCase()];
    if (f && !settings().tts) { if (await playFile('audio/' + f, my)) return true; }
    return tts(key, my);
  }

  async function phonemeNow(sid, my) {
    const S = window.SOUNDS[sid];
    if (!S) return false;
    if (S.seq) {
      for (const p of S.seq) { if (my !== token) return false; await phonemeNow(p, my); await sleep(60); }
      return true;
    }
    const f = M().p[sid];
    if (f) return playFile('audio/' + f, my);
    // 无录音时：长元音等用字母名/近似词合成，其余读关键词
    return tts(S.tts || S.kw, my, 0.8);
  }

  const Speech = {
    stop,
    sleep,
    get token() { return token; },
    async say(text) { stop(); const my = token; return textNow(text, my); },
    async clip(url, text) {
      stop(); const my = token;
      if (url && !settings().tts && await playFile(url, my)) return true;
      return my === token ? tts(text, my) : false;
    },
    async phoneme(sid) { stop(); const my = token; return phonemeNow(sid, my); },
    /* 依次播放：items 为 {type:'p'|'t', v} 或回调 */
    async sequence(items) {
      stop(); const my = token;
      for (const it of items) {
        if (my !== token) return false;
        if (typeof it === 'function') { it(); continue; }
        if (it.type === 'wait') { await sleep(it.v); continue; }
        if (it.type === 'p') await phonemeNow(it.v, my); else await textNow(it.v, my);
      }
      return my === token;
    },
    hasPhoneme: (sid) => !!(M().p[sid] || window.SOUNDS[sid]?.seq),
  };
  window.Speech = Speech;
})();
