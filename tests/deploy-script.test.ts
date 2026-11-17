import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("deployment watches a newly dispatched run, never a prior successful run of the same SHA", async () => {
  const dir = await mkdtemp(join(tmpdir(), "react-deploy-"));
  try {
    await mkdir(join(dir, "scripts"));
    await mkdir(join(dir, "bin"));
    await copyFile(
      new URL("../scripts/deploy-github.sh", import.meta.url),
      join(dir, "scripts/deploy.sh"),
    );
    await writeFile(
      join(dir, "bin/git"),
      '#!/bin/sh\ncase "$1" in remote) echo https://github.com/example/repo.git;; rev-parse) echo abcdef123456;; esac\n',
      { mode: 0o755 },
    );
    await writeFile(join(dir, "bin/sleep"), "#!/bin/sh\nexit 0\n", {
      mode: 0o755,
    });
    await writeFile(
      join(dir, "bin/gh"),
      `#!/bin/sh
printf '%s\\n' "$*" >> "$TEST_LOG"
case "$1 $2" in
 'repo view') echo example/repo;;
 'api repos/example/repo/pages') echo https://example.github.io/repo/;;
 'run list') n=0; test ! -f "$TEST_COUNT" || n=$(cat "$TEST_COUNT"); n=$((n+1)); echo "$n" > "$TEST_COUNT"; if test "$n" -lt 3; then echo 41; else echo 42; fi;;
esac
`,
      { mode: 0o755 },
    );
    const run = spawnSync("/bin/bash", [join(dir, "scripts/deploy.sh")], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: join(dir, "bin") + ":" + process.env.PATH,
        TEST_LOG: join(dir, "calls"),
        TEST_COUNT: join(dir, "count"),
      },
    });
    assert.equal(run.status, 0, run.stderr);
    const calls = await readFile(join(dir, "calls"), "utf8");
    assert.match(calls, /run watch 42 /);
    assert.doesNotMatch(calls, /run watch 41 /);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
