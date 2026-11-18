import { test, expect } from "@playwright/test";

// 离线缓存（PWA）：安装后断网仍能打开任意页面、播放音素和播放过的单词
test.use({ serviceWorkers: "allow" });

test("installs the offline cache and works without network", async ({ page, context }) => {
  await page.goto("./");
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href;
    return (await fetch(href)).json();
  });
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);

  // 等 service worker 装好并接管页面，预缓存写完
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100));
  });
  const cached = await page.evaluate(async () => {
    const core = (await caches.keys()).find((n) => n.startsWith("core-"))!;
    return (await (await caches.open(core)).keys()).map((r) => new URL(r.url).pathname);
  });
  expect(cached).toContain("/index.html");
  expect(cached).toContain("/audio/p/a_s.mp3");
  expect(cached.some((p) => p.startsWith("/audio/t/"))).toBe(false);

  // 联网时播放一个单词：会被存进音频缓存
  const canPlay = (src: string) =>
    page.evaluate(
      (s) =>
        new Promise<string>((res) => {
          const a = new Audio(s);
          a.oncanplaythrough = () => res("ok");
          a.onerror = () => res("error");
          a.load();
          setTimeout(() => res("timeout"), 5000);
        }),
      src,
    );
  const word = await page.evaluate(() => "audio/" + window.AUDIO_MANIFEST.t["cat"]);
  expect(await canPlay(word)).toBe("ok");
  const range = await page.evaluate(async () => {
    const r = await fetch("audio/p/a_s.mp3", { headers: { Range: "bytes=0-9" } });
    return [r.status, r.headers.get("content-range")];
  });
  expect(range[0]).toBe(206);

  await context.setOffline(true);
  await page.goto("./phonics");
  await expect(page.locator("h1")).toBeVisible();
  expect(await canPlay("audio/p/sh.mp3")).toBe("ok");
  expect(await canPlay(word)).toBe("ok");
  await context.setOffline(false);
});
