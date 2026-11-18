/* PWA：注册离线缓存（service worker）。
 * 只在构建产物里注册：开发服务器没有 sw.js，也不应缓存正在修改的代码。 */
const swUrl = () => new URL("sw.js", document.baseURI).href;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(swUrl(), { scope: new URL("./", document.baseURI).pathname })
      .catch((error) => console.warn("离线缓存注册失败", error));
  });
}
