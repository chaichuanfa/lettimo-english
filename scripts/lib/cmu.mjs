// CMU 发音词典工具：下载缓存、ARPAbet → IPA（音素以空格分隔）
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CACHE = path.join(ROOT, 'scripts/cache/cmudict.dict');
if (!fs.existsSync(CACHE)) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const r = await fetch('https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict');
  fs.writeFileSync(CACHE, await r.text());
}

// 词典里第一个读音不是本课词义时，在这里指定（ARPAbet）
export const PICK = {
  wind: 'W IH1 N D',      // 风
  use: 'Y UW1 Z',         // 使用（动词）
  tear: 'T IH1 R',        // 眼泪（Samantha 单独朗读 tear 时读这个音）
  a: 'AH0',
  preschool: 'P R IY1 S K UW2 L',
  vase: 'V EY1 S',
  chocolate: 'CH AA1 K AH0 L AH0 T',  // 与课程中三个音节 choc·o·late 对应
  unhappy: 'AH2 N HH AE1 P IY0', unlock: 'AH2 N L AA1 K', untie: 'AH2 N T AY1',  // 前缀 un- 不弱读
  redo: 'R IY2 D UW1', refill: 'R IY2 F IH1 L', replay: 'R IY1 P L EY2',          // re- 读 /riː/
  // 短元音 o：美式读 /ɑ/（Cambridge 美式音标），与课程"o 读 /ɑ/"一致
  dog: 'D AA1 G', log: 'L AA1 G', cross: 'K R AA1 S', strong: 'S T R AA1 NG', moth: 'M AA1 TH', cloth: 'K L AA1 TH',
  long: 'L AA1 NG', song: 'S AA1 NG', off: 'AA1 F', moss: 'M AA1 S', toss: 'T AA1 S', wrong: 'R AA1 NG',
  coupon: 'K UW1 P AA2 N', wanted: 'W AA1 N T IH0 D', exit: 'EH1 K S IH0 T',
  // au / aw / al / ough / augh 课：读 /ɔ/（词典收录的另一种美式读法），与本课一致
  caught: 'K AO1 T', bought: 'B AO1 T', cough: 'K AO1 F', chalk: 'CH AO1 K', august: 'AO1 G AH0 S T',
  // 非重读音节词典也收 /ɪ/ 的读法（与 Cambridge 美式一致），和课程拼读一致
  orange: 'AO1 R IH0 N JH', engine: 'EH1 N JH IH0 N', honest: 'AA1 N IH0 S T', biscuit: 'B IH1 S K IH0 T',
  dolphin: 'D AA1 L F IH0 N', receive: 'R IH0 S IY1 V',
  needed: 'N IY1 D IH0 D', landed: 'L AE1 N D IH0 D', added: 'AE1 D IH0 D', melted: 'M EH1 L T IH0 D',
  rabbit: 'R AE1 B IH0 T', market: 'M AA1 R K IH0 T', dentist: 'D EH1 N T IH0 S T', puppet: 'P AH1 P IH0 T',
  tennis: 'T EH1 N IH0 S', robin: 'R AA1 B IH0 N',
  village: 'V IH1 L IH0 JH', cabbage: 'K AE1 B IH0 JH', message: 'M EH1 S IH0 JH', package: 'P AE1 K IH0 JH',
  usual: 'Y UW1 ZH UW0 AH0 L', casual: 'K AE1 ZH UW0 AH0 L', visual: 'V IH1 ZH UW0 AH0 L',
  and: 'AE1 N D',          // 单独朗读用强读式 /ænd/
  // with：Samantha 读 /wɪθ/（强制对齐明显偏向 θ，且没有能稳定读出 /wɪð/ 的写法），两种都是标准读法，按录音标 θ
  with: 'W IH1 TH',
  giraffe: 'JH AH0 R AE1 F', garage: 'G AH0 R AA1 ZH',   // 词典首选把 r 并进 /ɚ/，与拼写 gi·raffe、ga·rage 对不上；用 Cambridge 美式 /dʒəˈræf/ /gəˈrɑʒ/
  gorilla: 'G AH0 R IH1 L AH0',  // 词典首选 /gɚˈɪlə/ 把 r 并进了元音，按 go·ril·la 分音节时选 /gəˈrɪlə/
};
// 词典里没有的词，直接给出 IPA
// 以空格分隔音素
// zero：第 10-3 课讲开音节元音读长音（ze·ro），Samantha 也读 /ˈziːroʊ/（与 "zeero" 的合成完全相同）；
// r 属于下一个音节，不能按 r 化元音写成 /ɪr/
export const MANUAL = { sprig: 's p r ɪ g', shush: 'ʃ ʌ ʃ', toucan: 'ˈt uː k æ n', zero: 'ˈz iː r oʊ' };

// 返回 Map：word → [ARPAbet 读音…]（按词典顺序）
export function loadCMU() {
  const dict = new Map();
  for (const line of fs.readFileSync(CACHE, 'utf8').split('\n')) {
    const m = line.match(/^([^\s(]+)(?:\(\d+\))?\s+([^#]+)/);
    if (!m) continue;
    if (!dict.has(m[1])) dict.set(m[1], []);
    dict.get(m[1]).push(m[2].trim());
  }
  return dict;
}

const CONS = { B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'g', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ' };
function vowel(v, stress, nextR) {
  const st = stress !== '0';
  if (nextR) {
    const r = { IY: 'ɪ', IH: 'ɪ', AO: 'ɔ', AA: 'ɑ', EH: 'ɛ', EY: 'ɛ', UH: 'ʊ', UW: 'ʊ', AY: 'aɪ', AW: 'aʊ', OW: 'ɔ', AE: 'ɛ', AH: 'ə' }[v];
    if (r) return r;
  }
  switch (v) {
    case 'AA': return 'ɑ';
    case 'AE': return 'æ';
    case 'AH': return st ? 'ʌ' : 'ə';
    case 'AO': return 'ɔː';
    case 'AW': return 'aʊ';
    case 'AY': return 'aɪ';
    case 'EH': return 'ɛ';
    case 'ER': return st ? 'ɝ' : 'ɚ';
    case 'EY': return 'eɪ';
    case 'IH': return 'ɪ';
    case 'IY': return st ? 'iː' : 'i';
    case 'OW': return 'oʊ';
    case 'OY': return 'ɔɪ';
    case 'UH': return 'ʊ';
    case 'UW': return st ? 'uː' : 'u';
  }
  return '?';
}
const ONSET2 = new Set(['P L', 'B L', 'K L', 'G L', 'F L', 'S L', 'P R', 'B R', 'T R', 'D R', 'K R', 'G R', 'F R', 'TH R', 'SH R',
  'S P', 'S T', 'S K', 'S M', 'S N', 'S W', 'S L', 'T W', 'K W', 'D W', 'G W', 'P Y', 'B Y', 'K Y', 'F Y', 'M Y', 'HH Y', 'V Y']);
const ONSET3 = new Set(['S P L', 'S P R', 'S T R', 'S K R', 'S K W', 'S P Y', 'S K Y']);

export function toIPA(arpa) {
  const ph = arpa.split(/\s+/);
  const isV = (p) => /\d$/.test(p);
  const nVowels = ph.filter(isV).length;
  const out = ph.map((p, i) => {
    if (!isV(p)) return CONS[p] ?? '?';
    return vowel(p.slice(0, -1), p.slice(-1), ph[i + 1] === 'R' && p.slice(0, -1) !== 'ER');
  });
  if (nVowels > 1) {
    // 在重读音节起始处加重音符号（最大首音原则）
    const marks = [];
    let prevV = -1;
    let primarySeen = false;
    ph.forEach((p, i) => {
      if (!isV(p)) return;
      const s = p.slice(-1);
      // 只标主重音前的次重音（学习词典惯例）
      if (s === '1' || (s === '2' && !primarySeen)) {
        const cons = ph.slice(prevV + 1, i);
        let k = 0;
        if (prevV < 0) k = cons.length;
        else if (cons.length >= 3 && ONSET3.has(cons.slice(-3).join(' '))) k = 3;
        else if (cons.length >= 2 && ONSET2.has(cons.slice(-2).join(' '))) k = 2;
        else if (cons.length >= 1 && cons[cons.length - 1] !== 'NG') k = 1;
        marks.push([i - k, s === '1' ? 'ˈ' : 'ˌ']);
      }
      if (s === '1') primarySeen = true;
      prevV = i;
    });
    marks.forEach(([at, m]) => { out[at] = m + out[at]; });
  }
  return out.join(' ');  // 音素之间用空格分隔，便于拼读时逐个高亮
}

