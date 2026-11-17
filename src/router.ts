export type Route = ReturnType<typeof parseRoute>;
export function parseRoute(input = "/", base = "/") {
  const url = new URL(input, "https://route.invalid");
  const root = base.replace(/\/$/, "");
  const inside = url.pathname === root || url.pathname.startsWith(root + "/");
  const path = inside
    ? url.pathname.slice(root.length).replace(/^\/|\/$/g, "")
    : "not-found";
  let [name = "", arg = "", extra] = path.split("/");
  if (name === "practice") name = "review";
  const routes = [
    "",
    "phonics",
    "stage",
    "lesson",
    "sounds",
    "review",
    "words",
    "guide",
    "grammar",
    "dict",
  ];
  if (
    !routes.includes(name) ||
    extra ||
    (arg && !["stage", "lesson", "words", "grammar", "dict"].includes(name))
  )
    name = "not-found";
  if (name === "dict") {
    try {
      arg = decodeURIComponent(arg);
    } catch {}
    arg = arg
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "");
  }
  if (name === "words" && arg && !["study", "list"].includes(arg))
    name = "not-found";
  return { name, arg, params: url.searchParams };
}

export function currentPath() {
  return window.location.pathname + window.location.search;
}
export function siteBase() {
  return new URL(document.baseURI).pathname;
}
export function navigate(to: string) {
  const url = new URL(to, document.baseURI);
  if (url.origin !== location.origin) return;
  if (url.href !== location.href) history.pushState(null, "", url);
  window.dispatchEvent(new Event("phonics:navigate"));
}
export function subscribeNavigation(update: () => void) {
  const click = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (
      !anchor ||
      anchor.hasAttribute("download") ||
      (anchor.target && anchor.target !== "_self")
    )
      return;
    const url = new URL(anchor.href);
    if (
      url.origin !== location.origin ||
      !url.pathname.startsWith(siteBase()) ||
      url.hash
    )
      return;
    // Only application links opt into client routing; assets and downloads remain native.
    if (parseRoute(url.pathname + url.search, siteBase()).name === "not-found")
      return;
    event.preventDefault();
    navigate(url.href);
  };
  const pop = () => window.dispatchEvent(new Event("phonics:navigate"));
  document.addEventListener("click", click);
  window.addEventListener("popstate", pop);
  window.addEventListener("phonics:navigate", update);
  return () => {
    document.removeEventListener("click", click);
    window.removeEventListener("popstate", pop);
    window.removeEventListener("phonics:navigate", update);
  };
}
