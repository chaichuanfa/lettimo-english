import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
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
export default defineConfig({
  base: process.env.SITE_BASE || "/",
  publicDir: false,
  plugins: [
    react(),
    {
      name: "learning-content",
      transformIndexHtml: {
        order: "post",
        handler() {
          return classicScripts.map((src) => ({
            tag: "script",
            attrs: {
              src,
              ...(src === "audio/manifest.js"
                ? { onerror: "window.AUDIO_MANIFEST={p:{},t:{}}" }
                : src === "js/ipa.js"
                  ? { onerror: "window.IPA={}" }
                  : {}),
            },
            injectTo: "body-prepend",
          }));
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
      },
    },
  ],
  build: { outDir: "dist", emptyOutDir: true },
});
