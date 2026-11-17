import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const Q = require('../js/daily-quote.js');
const quote = (date = '2026-11-17') => ({ date, english: 'A little practice goes a long way.', chinese: '一点点练习，也能带来很大的进步。', audio: 'https://staticedu-wps-cache.iciba.com/audio/example.mp3' });
const storageOf = (initial) => {
  let value = initial === undefined ? null : JSON.stringify(initial);
  return { getItem: () => value, setItem: (_, next) => { value = next; }, value: () => JSON.parse(value) };
};
const response = (data) => ({ ok: true, json: async () => data });

test('每日一句按北京时间换日，与设备所在时区无关', () => {
  assert.equal(Q.day(new Date('2026-11-16T15:59:59Z')), '2026-11-16');
  assert.equal(Q.day(new Date('2026-11-16T16:00:00Z')), '2026-11-17');
});

test('必须同时有英文、中文和有效日期；不接受脚本音频地址', () => {
  assert.equal(Q.normalize({ ...quote(), chinese: '' }), null);
  assert.equal(Q.normalize({ ...quote(), date: '2026-02-30' }), null);
  assert.equal(Q.normalize({ ...quote(), audio: 'javascript:alert(1)' }).audio, '');
  assert.equal(Q.normalize({ ...quote(), english: '  Hello!  ' }).english, 'Hello!');
});

test('从站内读取新句子并缓存，当天再访问保持同一句且不重复请求', async () => {
  const storage = storageOf(); let calls = 0;
  const fetcher = async (url, options) => { calls++; assert.equal(url, 'data/daily-quote.json'); assert.equal(options.priority, 'low'); return response(quote()); };
  assert.equal((await Q.load({ storage, fetcher, today: '2026-11-17' })).date, '2026-11-17');
  assert.equal(storage.value().chinese, quote().chinese);
  await Q.load({ storage, fetcher, today: '2026-11-17' });
  assert.equal(calls, 1);
});

test('跨日获取失败或数据损坏时保留最近一次成功内容', async () => {
  for (const fetcher of [async () => { throw Error('offline'); }, async () => ({ ok: false }), async () => response({ english: 'incomplete' })]) {
    const storage = storageOf(quote('2026-11-16'));
    assert.equal((await Q.load({ storage, fetcher, today: '2026-11-17' })).date, '2026-11-16');
    assert.equal(storage.value().date, '2026-11-16');
  }
});

test('站点快照较旧时不覆盖更新的缓存，也不采用未来日期', async () => {
  const storage = storageOf(quote('2026-11-16'));
  for (const date of ['2026-11-15', '2026-11-18']) {
    const result = await Q.load({ storage, fetcher: async () => response(quote(date)), today: '2026-11-17' });
    assert.equal(result.date, '2026-11-16');
  }
});

test('存储被禁用或内容损坏仍能显示请求结果；首次离线返回空状态', async () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal((await Q.load({ storage: blocked, fetcher: async () => response(quote()), today: '2026-11-17' })).english, quote().english);
  assert.equal(await Q.load({ storage: { getItem: () => '{broken' }, fetcher: async () => { throw Error('offline'); }, today: '2026-11-17' }), null);
});

test('定时更新保存金山双语及音频，重复运行不改变当天内容；接口失败不覆盖文件', async () => {
  const { updateQuote } = await import('../scripts/update-daily-quote.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'daily-quote-')); const path = join(dir, 'quote.json');
  try {
    await writeFile(path, JSON.stringify(quote('2026-11-16')));
    let calls = 0;
    const fetcher = async (url) => { calls++; assert.match(url, /open\.iciba\.com\/dsapi\/\?date=2026-11-17/); return response({ dateline: '2026-11-17', content: quote().english, note: quote().chinese, tts: quote().audio }); };
    assert.equal((await updateQuote({ path, fetcher, today: '2026-11-17' })).updated, true);
    const saved = await readFile(path, 'utf8');
    assert.equal(JSON.parse(saved).chinese, quote().chinese);
    await updateQuote({ path, fetcher, today: '2026-11-17' }); assert.equal(calls, 1);
    const failed = await updateQuote({ path, fetcher: async () => { throw Error('offline'); }, today: '2026-11-18' });
    assert.equal(failed.updated, false); assert.equal(await readFile(path, 'utf8'), saved);
    const stale = await updateQuote({ path, fetcher: async () => response({ dateline: '2026-11-16', content: 'old', note: '旧' }), today: '2026-11-18' });
    assert.equal(stale.updated, false); assert.equal(await readFile(path, 'utf8'), saved);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
