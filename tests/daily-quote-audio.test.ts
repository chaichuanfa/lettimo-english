import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import type { SpeechAPI } from "../src/types/app.ts";

function setup(fail = false) {
  const clips: Audio[] = [],
    spoken: string[] = [];
  class Audio {
    src: string;
    playbackRate = 1;
    paused = false;
    constructor(src: string) {
      this.src = src;
      clips.push(this);
    }
    play() {
      return fail ? Promise.reject(Error("offline")) : Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  class Utterance {
    text: string;
    onend?: () => void;
    constructor(text: string) {
      this.text = text;
    }
  }
  const speechSynthesis = {
    cancel() {},
    getVoices: () => [],
    speak(u: Utterance) {
      spoken.push(u.text);
      assert.ok(u.onend);
      u.onend();
    },
  };
  const window: {
    App: { settings: { rate: number } };
    speechSynthesis: typeof speechSynthesis;
    Speech?: SpeechAPI;
  } = {
    App: { settings: { rate: 0.75 } },
    speechSynthesis,
  };
  const context = {
    Audio,
    window,
    setTimeout,
    speechSynthesis,
    SpeechSynthesisUtterance: Utterance,
  };
  vm.runInNewContext(
    readFileSync(new URL("../js/audio.js", import.meta.url), "utf8"),
    context,
  );
  assert.ok(context.window.Speech);
  return { speech: context.window.Speech, clips, spoken };
}

test("每日一句只在调用后播放来源音频，沿用速度，并可被停止", async () => {
  const { speech, clips, spoken } = setup();
  assert.equal(clips.length, 0);
  const done = speech.clip("https://example.com/quote.mp3", "Hello");
  assert.equal(clips[0].playbackRate, 0.75);
  speech.stop();
  assert.equal(await done, false);
  assert.equal(clips[0].paused, true);
  assert.deepEqual(spoken, []);
});

test("来源音频不可用时退回浏览器朗读；中途停止不触发后备朗读", async () => {
  const { speech, spoken } = setup(true);
  assert.equal(
    await speech.clip("https://example.com/quote.mp3", "Hello"),
    true,
  );
  assert.deepEqual(spoken, ["Hello"]);
  const interrupted = setup(true);
  const done = interrupted.speech.clip("https://example.com/quote.mp3", "Stop");
  interrupted.speech.stop();
  await done;
  assert.deepEqual(interrupted.spoken, []);
});
