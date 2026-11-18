import { readFile, stat, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { join } from "node:path";
const html = await readFile("dist/index.html", "utf8");
assert.equal(
  await readFile("dist/404.html", "utf8"),
  html,
  "Pages fallback must match app shell",
);
assert.equal(
  html.match(/<base href="([^"]+)">/)?.[1],
  process.env.SITE_BASE || "/",
  "Nested routes need stable asset base",
);
assert.match(html, /type="module"/, "React entry must be bundled");
assert.doesNotMatch(
  html,
  /js\/(app|words)\.js/,
  "Legacy renderers must not ship",
);
for (const path of [
  "audio-src",
  "src",
  "scripts",
  ".git",
  "js/app.js",
  "js/words.js",
]) {
  const exists = await stat(join("dist", path)).then(
    () => true,
    () => false,
  );
  assert.equal(exists, false, `Unexpected published source: ${path}`);
}
for (const path of [
  "audio/manifest.js",
  "js/dict/index.js",
  "js/vocab/core.js",
  "data/daily-quote.json",
  "assets/phonics-logo.webp",
])
  assert.ok(
    (await stat(join("dist", path))).size > 0,
    `Missing runtime asset ${path}`,
  );
for (const file of await readdir("audio/p")) {
  if (!file.endsWith(".mp3")) continue;
  assert.deepEqual(
    await readFile(join("dist/audio/p", file)),
    await readFile(join("audio/p", file)),
    `Audio was changed: ${file}`,
  );
}
// PWA：清单、图标、离线缓存清单（每个预缓存文件都存在；课程音频按需缓存，不在清单里）
assert.match(html, /<link rel="manifest" href="manifest.webmanifest">/, "Missing web app manifest link");
const manifest = JSON.parse(await readFile("dist/manifest.webmanifest", "utf8"));
assert.equal(manifest.start_url, process.env.SITE_BASE || "/", "Manifest start_url must match the site base");
for (const icon of manifest.icons)
  assert.ok((await stat(join("dist", icon.src))).size > 0, `Missing icon ${icon.src}`);
const sw = await readFile("dist/sw.js", "utf8");
assert.doesNotMatch(sw, /__[A-Z_]+__/, "Service worker placeholders were not filled");
const precache: string[] = JSON.parse(sw.match(/const PRECACHE = (\[.*?\]);/s)![1]);
for (const path of precache)
  assert.ok((await stat(join("dist", path))).size >= 0, `Precached file missing: ${path}`);
assert.ok(precache.includes("index.html"), "App shell must be precached");
assert.ok(!precache.some((p) => p.startsWith("audio/t/")), "Lesson audio is cached on demand, not precached");
console.log(
  `React bundle, lazy data, quote and unchanged phoneme assets verified; private source files excluded; PWA precaches ${precache.length} files.`,
);
