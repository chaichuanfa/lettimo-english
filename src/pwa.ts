/* PWA：注册离线缓存（service worker），并提供"下载全部课程音频"等与它通信的小接口。
 * 只在构建产物里注册：开发服务器没有 sw.js，也不应缓存正在修改的代码。 */
import { useEffect, useState } from "react";

const swUrl = () => new URL("sw.js", document.baseURI).href;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(swUrl(), { scope: new URL("./", document.baseURI).pathname })
      .catch((error) => console.warn("离线缓存注册失败", error));
  });
}

export type OfflineStatus = { version: string; audioTotal: number; audioCached: number; audioBytes: number };
type Progress = { type: "progress" | "done"; done: number; total: number; failed: number };

/** 课程单词、例句音频的地址（相对站点根目录），与 js/audio.js 的播放地址一致 */
const audioUrls = () => [...new Set(Object.values(window.AUDIO_MANIFEST?.t || {}))].map((f) => `audio/${f}`);

function ask(message: object, onMessage: (data: any) => boolean | void) {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return false;
  const channel = new MessageChannel();
  channel.port1.onmessage = (event) => {
    if (onMessage(event.data) === true) channel.port1.close();
  };
  sw.postMessage(message, [channel.port2]);
  return true;
}

/** 离线状态：null = 还没有离线缓存（开发环境、首次打开尚未安装完成、或浏览器不支持） */
export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const refresh = () => ask({ type: "status", urls: audioUrls() }, (s) => (setStatus(s), true));
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    refresh();
    // 首次打开时 service worker 装好后才接管页面
    const onChange = () => refresh();
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);
  const download = () => {
    // 申请持久化存储：浏览器空间紧张时不优先清掉这些音频（Safari 对长期不用的网站会清理）
    navigator.storage?.persist?.().catch(() => {});
    ask({ type: "download-audio", urls: audioUrls() }, (p: Progress) => {
      setProgress(p);
      if (p.type === "done") {
        refresh();
        return true;
      }
    });
  };
  return { status, progress, download };
}
