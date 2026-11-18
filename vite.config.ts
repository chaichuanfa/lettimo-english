import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname, join, relative, sep } from "node:path";
// Explicit publication list: source recordings, tools and credentials never enter dist.
export const staticPaths = [
  "audio",
  "fonts",
  "assets",
  "data",
  "css/fonts-cn.css",
  "js/data.js",
  "js/grammar.js",
  "js/ipa.js",
  "js/phonics.js",
  "js/g2p.js",
  "js/audio.js",
  "js/vocab-core.js",
  "js/daily-quote.js",
  "js/dict",
  "js/vocab",
];
const classicScripts = [
  "js/data.js",
  "js/grammar.js",
  "audio/manifest.js",
  "js/ipa.js",
  "js/phonics.js",
  "js/g2p.js",
  "js/audio.js",
  "js/vocab-core.js",
  "js/daily-quote.js",
];
const SITE_NAME = "Lettimo 英语";
// PWA：离线时首次打开就要用到的文件都预缓存；课程单词 / 例句音频（audio/t，约 36MB）按需缓存（播放过的才存）。404.html 与 index.html 内容相同，不重复缓存；fonts/ 与 css/fonts-cn.css 是原样发布的副本，
// 页面实际用的是 Vite 打包进 assets/ 的带哈希字体，也不缓存。
const notPrecached = (path: string) =>
  path.startsWith("audio/t/") ||
  path.startsWith("fonts/") ||
  path === "css/fonts-cn.css" ||
  path === "404.html" ||
  path === "sw.js" ||
  path.endsWith(".map");

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}
const sha = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

/** 生成 dist/manifest.webmanifest 与 dist/sw.js（填入预缓存清单和按内容计算的版本号） */
async function writePwa(base: string) {
  const files = (await walk(resolve("dist")))
    .map((f) => relative(resolve("dist"), f).split(sep).join("/"))
    .sort();
  const fingerprint = async (paths: string[]) =>
    sha(
      (
        await Promise.all(paths.map(async (p) => `${p}:${sha(await readFile(resolve("dist", p)))}`))
      ).join("\n"),
    ).slice(0, 12);
  const audio = files.filter((p) => p.startsWith("audio/t/"));
  const manifest = {
    id: base,
    name: SITE_NAME,
    short_name: "Lettimo",
    description: "自然拼读、单词积累、语法进阶，可离线学习。",
    lang: "zh-CN",
    start_url: base,
    scope: base,
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "assets/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "assets/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "assets/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "拼读", url: `${base}phonics` },
      { name: "单词", url: `${base}words` },
      { name: "复习", url: `${base}review` },
      { name: "词典", url: `${base}dict` },
    ],
  };
  await writeFile(resolve("dist/manifest.webmanifest"), JSON.stringify(manifest, null, 2));
  const precache = [...files.filter((p) => !notPrecached(p)), "manifest.webmanifest"];
  const template = await readFile(resolve("pwa/sw.js"), "utf8");
  // 版本号：缓存文件的内容 + service worker 自身的代码，任一改变都会换一个新的缓存
  const version = sha((await fingerprint(precache)) + sha(template)).slice(0, 12);
  const sw = template
    .replace("__VERSION__", JSON.stringify(version))
    .replace("__PRECACHE__", JSON.stringify(precache))
    .replace("__AUDIO_VERSION__", JSON.stringify(await fingerprint(audio)));
  await writeFile(resolve("dist/sw.js"), sw);
}

let resolvedBase = "/";
export default defineConfig({
  base: process.env.SITE_BASE || "/",
  publicDir: false,
  plugins: [
    react(),
    {
      name: "learning-content",
      configResolved(config) {
        resolvedBase = config.base;
      },
      transformIndexHtml: {
        order: "post",
        handler(_html, ctx) {
          // PWA 清单和图标只在构建产物里有（manifest.webmanifest 由 writePwa 生成）
          const pwaTags = ctx.server
            ? []
            : [
                { tag: "link", attrs: { rel: "manifest", href: "manifest.webmanifest" }, injectTo: "head" as const },
                { tag: "link", attrs: { rel: "apple-touch-icon", href: "assets/icons/apple-touch-icon.png" }, injectTo: "head" as const },
                { tag: "meta", attrs: { name: "apple-mobile-web-app-capable", content: "yes" }, injectTo: "head" as const },
                { tag: "meta", attrs: { name: "apple-mobile-web-app-title", content: "Lettimo" }, injectTo: "head" as const },
              ];
          return [...pwaTags, ...classicScripts.map((src) => ({
            tag: "script",
            attrs: {
              src,
              ...(src === "audio/manifest.js"
                ? { onerror: "window.AUDIO_MANIFEST={p:{},t:{}}" }
                : src === "js/ipa.js"
                  ? { onerror: "window.IPA={}" }
                  : {}),
            },
            injectTo: "body-prepend" as const,
          }))];
        },
      },
      async closeBundle() {
        // GitHub Pages serves this app shell for direct visits to client routes.
        await cp(resolve("dist/index.html"), resolve("dist/404.html"));
        for (const path of staticPaths) {
          const target = resolve("dist", path);
          await mkdir(dirname(target), { recursive: true });
          await cp(resolve(path), target, { recursive: true });
        }
        await writePwa(resolvedBase);
      },
    },
  ],
  build: { outDir: "dist", emptyOutDir: true },
});
