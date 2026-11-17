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
console.log(
  "React bundle, lazy data, quote and unchanged phoneme assets verified; private source files excluded.",
);
