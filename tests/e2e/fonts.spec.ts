import { test, expect } from "@playwright/test";

test("Chinese headings and body text render with the bundled rounded font", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator("main h1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  for (const selector of ["main h1", ".lead", ".foot p"]) {
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector,
    });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    expect(
      fonts.some(
        (font) => font.familyName === "EP Rounded CN" && font.isCustomFont,
      ),
      selector,
    ).toBe(true);
    expect(
      fonts.filter((font) => !font.isCustomFont),
      selector,
    ).toEqual([]);
  }
});
