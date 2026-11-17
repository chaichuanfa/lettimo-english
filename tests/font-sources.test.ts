import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("font subset discovery includes Chinese characters from React TSX and TS modules", () => {
  const script = `import ast, pathlib, tempfile, glob, os, re, collections
source = pathlib.Path('scripts/build-cn-font.py').read_text()
tree = ast.parse(source)
fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'char_sets')
with tempfile.TemporaryDirectory() as root:
 p = pathlib.Path(root)
 (p/'src/pages').mkdir(parents=True)
 (p/'js/dict').mkdir(parents=True)
 (p/'index.html').write_text('<html>中</html>')
 (p/'src/pages/Home.tsx').write_text('export default () => <h1>龘</h1>')
 (p/'src/state.ts').write_text('const label = "麟"')
 (p/'js/dict/ab.js').write_text('龟龟')
 env = dict(ROOT=root,glob=glob,os=os,collections=collections,CJK=re.compile(r'[　-〿㐀-鿿豈-﫿＀-￯]'),B_CHUNKS=4,read=lambda path:pathlib.Path(path).read_text())
 exec(compile(ast.Module(body=[fn],type_ignores=[]),'<test>','exec'),env)
 chunks=dict(env['char_sets']())
 assert '龘' in chunks['a'], 'React TSX text excluded from UI font subset'
 assert '麟' in chunks['a'], 'React TS text excluded from UI font subset'
 assert '龟' not in chunks['a'], 'dictionary-only glyph should remain lazy loaded'
 print('React and legacy sources classified correctly')
`;
  const result = spawnSync("python3", ["-c", script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
