// Pack Microsoft's original APNG frames without changing artwork or timing.
// Usage: node scripts/build-mascot-frames.mjs [source.png]
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const source = process.argv[2] || "scripts/mascot-source/fluent/parrot-original.png";
const target = "assets/mascots/fluent";
const png = await readFile(source);
const durations = [];
for (let offset = 8; offset < png.length;) {
  const size = png.readUInt32BE(offset);
  if (png.toString("ascii", offset + 4, offset + 8) === "fcTL") {
    const data = offset + 8;
    durations.push(1000 * png.readUInt16BE(data + 20) / (png.readUInt16BE(data + 22) || 100));
  }
  offset += size + 12;
}
if (durations.length !== 72 || durations.some(ms => ms !== 42)) {
  throw new Error("Unexpected source timing: update the player's frame metadata before changing artwork.");
}
const temp = await mkdtemp(join(tmpdir(), "phonics-mascot-"));
const run = (command, args) => execFileSync(command, args, {stdio:"inherit"});
await mkdir(target, {recursive:true});
try {
  run("ffmpeg", ["-loglevel","error","-y","-i",source,"-fps_mode","passthrough",join(temp,"%03d.png")]);
  run("ffmpeg", ["-loglevel","error","-y","-framerate","24","-i",join(temp,"%03d.png"),"-vf","tile=8x9","-frames:v","1",join(temp,"atlas.png")]);
  run("cwebp", ["-quiet","-q","88","-m","6",join(temp,"atlas.png"),"-o",join(target,"parrot-atlas.webp")]);
  run("cwebp", ["-quiet","-lossless",join(temp,"001.png"),"-o",join(target,"parrot-poster.webp")]);
  await writeFile(join(target,"parrot-atlas.json"),JSON.stringify({width:256,height:256,columns:8,frameCount:durations.length,durations}));
} finally {
  await rm(temp,{recursive:true,force:true});
}
