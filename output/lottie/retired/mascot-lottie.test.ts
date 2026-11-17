import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

for (const pose of ["reading", "listening", "teaching", "cheer"]) {
  test(`${pose} is an articulated vector animation with a stationary root`, async () => {
    const data = JSON.parse(
      await readFile(`assets/mascots/lottie/parrot-${pose}.json`, "utf8"),
    );
    assert.equal(
      data.assets.length,
      0,
      "No raster layers disguised as a Lottie animation",
    );
    assert.ok(
      data.layers.every((l: { ty: number }) => l.ty === 3 || l.ty === 4),
    );
    assert.ok(
      data.op / data.fr <= 5,
      "Auto playback must finish within five seconds",
    );
    const root = data.layers.find((l: { nm: string }) => l.nm === "Body root");
    assert.equal(root.ks.p.a, 0);
    assert.equal(root.ks.r.a, 0);
    for (const name of [
      "Left wing",
      "Right wing",
      "Head pivot",
    ]) {
      const layer = data.layers.find((l: { nm: string }) => l.nm === name);
      assert.ok(layer, `Missing articulated part: ${name}`);
      assert.ok(
        Object.values(layer.ks).some(
          (p: unknown) => (p as { a: number }).a === 1,
        ),
        `${name} must move independently`,
      );
    }
    const ids = new Set(data.layers.map((l: { ind: number }) => l.ind));
    for (const layer of data.layers) {
      if (layer.parent !== undefined)
        assert.ok(ids.has(layer.parent), `Broken joint ${layer.nm}`);
    }
  });
}

for (const pose of ["reading", "listening", "teaching", "cheer"]) {
  test(`${pose} preserves anatomy and avoids squash-based blinks or page flips`, async () => {
    const data = JSON.parse(await readFile(`assets/mascots/lottie/parrot-${pose}.json`, "utf8"));
    for (const layer of data.layers) {
      assert.equal(layer.ks.s.a, 0, `${layer.nm}: no animated scale that squashes anatomy`);
      if (layer.nm.endsWith("pupil") || layer.nm.endsWith("eye white")) {
        let ancestor = layer;
        while (ancestor) {
          assert.equal(ancestor.ks.s.a, 0, `${layer.nm}: eyes must retain their proportions`);
          ancestor = data.layers.find((l: {ind: number}) => l.ind === ancestor.parent);
        }
      }
    }
    const eyelid = data.layers.find((l: {nm: string}) => l.nm === "Left upper eyelid");
    assert.ok(eyelid?.shapes.some((g: {it: {ty: string; ks?: {a: number}}[]}) => g.it.some(s => s.ty === "sh" && s.ks?.a === 1)), "Blink moves the lid contour instead of flattening the eye");
  });
}
