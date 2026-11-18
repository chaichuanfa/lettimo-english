/* Lettimo 英语 · 离线缓存（service worker）
 * 由 vite.config.ts 在构建最后一步填入下面的常量后写到 dist/sw.js，不经过打包。
 *
 * 缓存策略：
 *   页面（导航请求）        网络优先，3 秒没响应或离线时用缓存的 index.html（客户端路由都由它渲染）
 *   每日一句 data/*.json    网络优先，离线时用上次的缓存
 *   预缓存的静态资源        缓存优先（网页代码、45 个音素、词典分片、字体、图片；内容一变构建版本号就变，会整体更新）
 *   课程单词 / 例句音频     缓存优先，没有就从网络取完整文件存起来（播放过的离线也能听）
 * <audio> 播放时 Safari 会发 Range 请求，所以音频都按 Range 切片返回 206。
 */
const VERSION = __VERSION__;
const PRECACHE = __PRECACHE__;
const AUDIO_VERSION = __AUDIO_VERSION__;

const CORE = `core-${VERSION}`;
const AUDIO = `audio-${AUDIO_VERSION}`;
const RUNTIME = 'runtime-v1';
const BASE = new URL('./', self.location).href;          // sw.js 放在站点根目录（含 GitHub Pages 子路径）
const SHELL = new URL('index.html', BASE).href;
const AUDIO_PREFIX = new URL('audio/t/', BASE).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE);
    // cache: 'reload' 绕过浏览器 HTTP 缓存，确保存进来的是这次构建的文件
    await cache.addAll(PRECACHE.map((path) => new Request(new URL(path, BASE), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    // 上一版的核心缓存保留一代：已经打开的旧页面还可能按需加载旧版的代码块（如吉祥物动画）
    const cores = names.filter((n) => n.startsWith('core-') && n !== CORE).sort();
    const keep = new Set([CORE, AUDIO, RUNTIME, cores[cores.length - 1]]);
    await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;  // 第三方（如每日一句的外链音频）不经过这里

  if (request.mode === 'navigate') return event.respondWith(page(request));
  if (url.href.startsWith(AUDIO_PREFIX)) return event.respondWith(audio(request, url));
  if (/\/data\/[^/]+\.json$/.test(url.pathname)) return event.respondWith(networkFirst(request, RUNTIME));
  event.respondWith(staticAsset(request, url));
});

async function page(request) {
  let net = null;
  try {
    net = await Promise.race([fetch(request), timeout(3000)]);
    if (net && net.ok) return net;
  } catch { /* 离线 */ }
  // 客户端路由（/phonics、/words …）都由同一个应用外壳渲染：网络返回 404/5xx、超时或离线时都用缓存的 index.html
  // （GitHub Pages 对这些路由返回的 404.html 本来就是同一个外壳）
  return (await caches.match(SHELL)) || net || fetch(request);
}

async function networkFirst(request, cacheName) {
  try {
    const net = await fetch(request);
    if (net.ok) (await caches.open(cacheName)).put(request, net.clone());
    return net;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) || Response.error();
  }
}

async function staticAsset(request, url) {
  const hit = await caches.match(url.href, { ignoreSearch: true });
  if (hit) return withRange(request, hit);
  const net = await fetch(request);
  // 不在预缓存清单里的同站资源（理论上没有）也顺手存一份，第二次离线可用
  if (net.ok && net.status === 200) (await caches.open(RUNTIME)).put(url.href, net.clone());
  return net;
}

async function audio(request, url) {
  const key = url.origin + url.pathname;
  const cache = await caches.open(AUDIO);
  let full = await cache.match(key);
  if (!full) {
    // <audio> 的请求带 Range，网络返回的是 206 片段，不能直接缓存；另取一次完整文件
    full = await fetch(key, { cache: 'no-cache' });
    if (full.ok && full.status === 200) await cache.put(key, full.clone());
    else return full;
  }
  return withRange(request, full);
}

/** 按请求里的 Range 头从完整响应切出 206 片段（Safari 播放媒体文件必须支持） */
async function withRange(request, response) {
  const range = request.headers.get('range');
  if (!range) return response;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return response;
  const buf = await response.arrayBuffer();
  const size = buf.byteLength;
  let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (!(start >= 0 && start <= end)) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve(null), ms));
