import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup(fail = false) {
  const clips = [], spoken = [];
  class Audio {
    constructor(src) { this.src = src; clips.push(this); }
    play() { return fail ? Promise.reject(Error('offline')) : Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const context = { Audio, window: { App: { settings: { rate: 0.75 } } }, setTimeout,
    speechSynthesis: { cancel() {}, getVoices: () => [], speak(u) { spoken.push(u.text); u.onend(); } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } } };
  context.window.speechSynthesis = context.speechSynthesis;
  vm.runInNewContext(readFileSync(new URL('../js/audio.js', import.meta.url), 'utf8'), context);
  return { speech: context.window.Speech, clips, spoken };
}

test('每日一句只在调用后播放来源音频，沿用速度，并可被停止', async () => {
  const { speech, clips, spoken } = setup(); assert.equal(clips.length, 0);
  const done = speech.clip('https://example.com/quote.mp3', 'Hello');
  assert.equal(clips[0].playbackRate, 0.75); speech.stop();
  assert.equal(await done, false); assert.equal(clips[0].paused, true); assert.deepEqual(spoken, []);
});

test('来源音频不可用时退回浏览器朗读；中途停止不触发后备朗读', async () => {
  const { speech, spoken } = setup(true);
  assert.equal(await speech.clip('https://example.com/quote.mp3', 'Hello'), true);
  assert.deepEqual(spoken, ['Hello']);
  const interrupted = setup(true); const done = interrupted.speech.clip('https://example.com/quote.mp3', 'Stop');
  interrupted.speech.stop(); await done; assert.deepEqual(interrupted.spoken, []);
});
