import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("mascot clips remain vector-only, seamless and safe to morph", async () => {
  for (const pose of ["wave", "reading", "listening", "teaching", "cheer"]) {
    const data = JSON.parse(await readFile(`assets/mascots/parrot/${pose}.json`, "utf8"));
    assert.equal(data.fr, 60);
    assert.equal((data.op - data.ip) / data.fr, 4.8, "Each loop retains the approved timing");
    assert.deepEqual(data.assets, [], "No embedded raster images or missing external assets");
    const ids = new Set(data.layers.map((layer: { ind: number }) => layer.ind));
    assert.equal(ids.size, data.layers.length);
    for (const layer of data.layers) {
      if (layer.parent !== undefined) assert.ok(ids.has(layer.parent), `${pose}: missing joint`);
    }
    function inspect(value: unknown, hiddenAtEnds = false): void {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) { value.forEach((child) => inspect(child, hiddenAtEnds)); return; }
      const item = value as Record<string, any>;
      const opacity = item.ks?.o;
      // A turning page can finish on its reverse side while fully hidden.
      if (opacity?.a === 1 && opacity.k[0].s[0] === 0 && opacity.k.at(-1).s[0] === 0) hiddenAtEnds = true;
      if (item.a === 1 && Array.isArray(item.k)) {
        const keys = item.k;
        if (!hiddenAtEnds) assert.deepEqual(keys[0].s, keys.at(-1).s, `${pose}: replay would jump`);
        for (let i = 1; i < keys.length; i++) {
          assert.ok(keys[i].t > keys[i - 1].t, `${pose}: unordered keyframes`);
          assert.deepEqual(keys[i - 1].e, keys[i].s, `${pose}: discontinuous motion`);
          const before = keys[i - 1].s?.[0], after = keys[i].s?.[0];
          if (before?.v) {
            assert.equal(after.v.length, before.v.length, `${pose}: incompatible morph vertices`);
            assert.equal(after.i.length, after.v.length);
            assert.equal(after.o.length, after.v.length);
          }
        }
      }
      Object.values(item).forEach((child) => inspect(child, hiddenAtEnds));
    }
    inspect(data);
    const poster = await readFile(`assets/mascots/parrot/${pose}.webp`);
    assert.equal(poster.toString("ascii", 8, 12), "WEBP", `${pose}: missing fallback image`);
  }
});
