"""词典数据第一步：从 ECDICT（英汉释义）+ Tatoeba（中英例句）+ CMU（读音）挑选词条和例句
输出 scripts/cache/dict-data.json，再由 scripts/build-dict.mjs 生成网站用的 js/dict/*.js

用法（需要繁简转换库 opencc）：
  uv run --with opencc-python-reimplemented python3 scripts/build-dict-data.py

数据来源（首次运行自动下载到 scripts/cache/）：
  ECDICT   https://github.com/skywind3000/ECDICT        MIT License
  Tatoeba  https://tatoeba.org                          CC BY 2.0 FR
  CMUdict  https://github.com/cmusphinx/cmudict         BSD-2-Clause
"""
import bz2
import csv
import json
import os
import re
import subprocess
import sys
import urllib.request
from collections import defaultdict

from opencc import OpenCC

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', 'cache')
SOURCES = {
    'ecdict.csv': 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
    'eng_sentences.tsv.bz2': 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2',
    'cmn_sentences.tsv.bz2': 'https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2',
    'eng-cmn_links.tsv.bz2': 'https://downloads.tatoeba.org/exports/per_language/eng/eng-cmn_links.tsv.bz2',
}
MAX_RANK = 25000      # 词频排名（COCA / BNC 取较好者）在此之内的词全部收录
MAX_EXAMPLES = 2
# ECDICT 对少数最常用功能词的释义不理想，这里手动给出
MANUAL_ZH = {
    'a': 'art. 一（个）；每一；某一',
    'an': 'art. 一（个）（用在元音音素前）；每一',
    'the': 'art. 这；那；这些；那些（特指已知或唯一的人或事物）',
}
csv.field_size_limit(sys.maxsize)


def cache_path(name):
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        os.makedirs(CACHE, exist_ok=True)
        print('downloading', name)
        urllib.request.urlretrieve(SOURCES[name], p)
    return p


def load_cmu():
    words = set()
    with open(os.path.join(CACHE, 'cmudict.dict'), encoding='utf8') as f:
        for line in f:
            m = re.match(r"^([a-z]+)(?:\(\d+\))?\s", line)
            if m:
                words.add(m.group(1))
    return words


def load_curriculum():
    """课程里的单词和例句（例句有预生成的录音，优先用作例句）"""
    js = r"""
const vm = require('vm'), fs = require('fs');
const c = { window: {} }; vm.createContext(c);
vm.runInContext(fs.readFileSync('js/data.js', 'utf8'), c);
const words = [], sents = [];
for (const st of c.window.STAGES) for (const l of st.lessons) {
  l.words.forEach((w) => words.push(w.split('|')[0].replace(/[·'\-]/g, '').toLowerCase()));
  (l.sight || []).forEach((w) => words.push(w.toLowerCase()));
  (l.sentences || []).forEach((s) => sents.push(s.split('|')));
}
console.log(JSON.stringify({ words, sents }));
"""
    out = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


POS_FIX = {'a.': 'adj.', 's.': 'adj.'}


def clean_zh(raw):
    lines = [x.strip() for x in re.split(r'\\r\\n|\\n|\r?\n', raw) if x.strip()]
    keep = [x for x in lines if not re.match(r'^([a-z]+\.\s*)?\[', x)]
    if not keep and lines:
        keep = [re.sub(r'^\[[^\]]*\]\s*', '', lines[0])]
    out = []
    for line in keep[:6]:
        m = re.match(r'^([a-z]+\.)\s*(.*)$', line)
        pos, body = (POS_FIX.get(m.group(1), m.group(1)), m.group(2)) if m else ('', line)
        senses = [s.strip() for s in re.split(r'[,;，；]\s*', body) if s.strip()]
        senses = [s for s in senses if '人名' not in s and '姓氏' not in s][:8]
        if not senses:
            continue
        out.append((pos + ' ' if pos else '') + '；'.join(senses))
    return '\n'.join(out)


def main():
    cmu = load_cmu()
    cur = load_curriculum()
    cur_words = set(cur['words'])
    t2s = OpenCC('t2s')

    # ---------- 1. 词条 ----------
    rows = {}
    with open(cache_path('ecdict.csv'), newline='', encoding='utf8') as f:
        for d in csv.DictReader(f):
            w = d['word']
            if re.fullmatch(r'[a-z]+', w) and (w in cmu or w in cur_words):
                rows[w] = d

    def rank_of(d):
        r = [int(x) for x in (d['frq'], d['bnc']) if x and x != '0']
        return min(r) if r else 0

    entries = {}
    for w, d in rows.items():
        rank = rank_of(d)
        core = (0 < rank <= MAX_RANK) or d['tag'] or d['oxford'] == '1' or (d['collins'] not in ('', '0')) or w in cur_words
        if not core:
            continue
        zh = MANUAL_ZH.get(w) or clean_zh(d['translation'])
        if not zh:
            continue
        exch = dict(p.split(':', 1) for p in d['exchange'].split('/') if ':' in p)
        entries[w] = {'zh': zh, 'rank': rank or 99999, 'tags': d['tag'], 'exch': exch}
    for w in cur_words:  # 课程词（如 sprig）在 ECDICT 中缺失时也要能查到
        if w not in entries and w in rows:
            entries[w] = {'zh': clean_zh(rows[w]['translation']), 'rank': 99999, 'tags': '', 'exch': {}}

    # 变形词（went、cats…）：指向原形，释义沿用原形
    forms = {}
    for w, e in list(entries.items()):
        for k in 'pdisrt3':
            for f in e['exch'].get(k, '').split(','):
                f = f.strip()
                if f and f != w and re.fullmatch(r'[a-z]+', f) and f in cmu and f not in entries and f not in forms:
                    forms[f] = {'lemma': w, 'type': k, 'rank': e['rank'] + 1}
    for w, e in entries.items():  # 本身是变形词的常用词，也记录原形
        lem = e['exch'].get('0')
        if lem and lem != w and lem in entries:
            e['lemma'] = lem
            e['type'] = e['exch'].get('1', '')[:1]
    print(f'entries {len(entries)}, inflected forms {len(forms)}')

    # ---------- 2. 例句 ----------
    links = defaultdict(list)
    with bz2.open(cache_path('eng-cmn_links.tsv.bz2'), 'rt', encoding='utf8') as f:
        for line in f:
            a, b = line.rstrip('\n').split('\t')[:2]
            links[a].append(b)
    cmn = {}
    need = {b for v in links.values() for b in v}
    with bz2.open(cache_path('cmn_sentences.tsv.bz2'), 'rt', encoding='utf8') as f:
        for line in f:
            sid, _, text = line.rstrip('\n').split('\t')[:3]
            if sid in need:
                cmn[sid] = text
    pool = []  # (en, zh, 是否课程例句)
    for en, zh in cur['sents']:
        pool.append((en, zh, True))
    with bz2.open(cache_path('eng_sentences.tsv.bz2'), 'rt', encoding='utf8') as f:
        for line in f:
            sid, _, text = line.rstrip('\n').split('\t')[:3]
            if sid not in links:
                continue
            zhs = [cmn[b] for b in links[sid] if b in cmn]
            if not zhs:
                continue
            zh = t2s.convert(min(zhs, key=len))
            pool.append((text, zh, False))
    print('sentence pairs', len(pool))

    index = defaultdict(list)
    seen = set()
    for i, (en, zh, cur_s) in enumerate(pool):
        key = en.lower()
        if key in seen:
            continue
        seen.add(key)
        toks = re.findall(r"[a-z]+(?:'[a-z]+)?", key)
        n = len(toks)
        if n < 3 or n > 18 or len(en) > 110 or re.search(r'\d', en):
            continue
        # 评分：长度接近 7 个词最好；课程例句优先；句中人名等大写词略降权
        caps = sum(1 for t in re.findall(r"\b[A-Z][a-z]+", en)[1:] if t != 'I')
        score = abs(n - 7) + caps * 1.5 - (20 if cur_s else 0)
        for t in set(toks):
            index[t].append((score, i))

    def examples(w, alts=()):
        # 先找含原词的句子，不够再用它的变形词（yacht → yachts）；中文相同的近似句只留一句
        res, zhs = [], set()
        for key in (w, *alts):
            for _, i in sorted(index.get(key, [])):
                if len(res) >= MAX_EXAMPLES:
                    return res
                en, zh, _c = pool[i]
                if zh in zhs:
                    continue
                zhs.add(zh)
                res.append([en, zh])
        return res

    out = {}
    for w, e in entries.items():
        alts = [f for k in 'sp3dirt' for f in e['exch'].get(k, '').split(',') if f]
        out[w] = {'zh': e['zh'], 'rank': e['rank'], 'tags': e['tags'], 'ex': examples(w, alts),
                  'exch': {k: v for k, v in e['exch'].items() if k in 'pdi3srt'}}
        if e.get('lemma'):
            out[w]['lemma'] = e['lemma']
            out[w]['type'] = e['type']
    for w, e in forms.items():
        out[w] = {'lemma': e['lemma'], 'type': e['type'], 'rank': e['rank'], 'ex': examples(w)}
    # 没有中英对照例句的词：再从 Tatoeba 全部英文句子里找（只有英文，没有中文翻译）
    need = {w for w, e in out.items() if 'zh' in e and len(e['ex']) < MAX_EXAMPLES}
    best = defaultdict(list)
    with bz2.open(cache_path('eng_sentences.tsv.bz2'), 'rt', encoding='utf8') as f:
        for line in f:
            text = line.rstrip('\n').split('\t')[2]
            if len(text) > 110 or re.search(r'\d', text):
                continue
            toks = re.findall(r"[a-z]+(?:'[a-z]+)?", text.lower())
            n = len(toks)
            if n < 4 or n > 16:
                continue
            hit = need.intersection(toks)
            if not hit:
                continue
            caps = sum(1 for t in re.findall(r"\b[A-Z][a-z]+", text)[1:] if t != 'I')
            score = abs(n - 8) + caps * 1.5
            for w in hit:
                lst = best[w]
                if len(lst) < 6 or score < lst[-1][0]:
                    lst.append((score, text))
                    lst.sort()
                    del lst[6:]
    for w, lst in best.items():
        have = {x[0].lower() for x in out[w]['ex']}
        for _, text in lst:
            if len(out[w]['ex']) >= MAX_EXAMPLES:
                break
            if text.lower() not in have:
                have.add(text.lower())
                out[w]['ex'].append([text, ''])
    with_ex = sum(1 for e in out.values() if e['ex'])
    print(f'total {len(out)}, with examples {with_ex}')
    with open(os.path.join(CACHE, 'dict-data.json'), 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False)


if __name__ == '__main__':
    main()
