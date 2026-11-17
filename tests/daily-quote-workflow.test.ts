import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("快照不变时也能重试 Pages 构建，恢复前次推送成功但发布失败的情况", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/daily-quote.yml", import.meta.url),
    "utf8",
  );
  const match = workflow.match(/        run: \|\n([\s\S]+)$/);
  assert.ok(match, "daily quote workflow must contain its deploy run block");
  const body = match[1].replace(/^          /gm, "");
  const dir = await mkdtemp(join(tmpdir(), "daily-workflow-"));
  try {
    const log = join(dir, "calls");
    // Git 报告快照无变化；模拟第一次 Pages 请求失败、手动重跑成功。
    await writeFile(
      join(dir, "git"),
      '#!/bin/sh\nprintf "git %s\\n" "$*" >> "$CALL_LOG"\nexit 0\n',
      { mode: 0o755 },
    );
    await writeFile(
      join(dir, "gh"),
      '#!/bin/sh\nprintf "gh %s\\n" "$*" >> "$CALL_LOG"\nexit "$BUILD_EXIT"\n',
      { mode: 0o755 },
    );
    const env = {
      ...process.env,
      PATH: dir + ":" + process.env.PATH,
      CALL_LOG: log,
      GITHUB_REPOSITORY: "example/phonics",
    };
    assert.equal(
      spawnSync("/bin/bash", ["-e", "-c", body], {
        cwd: dir,
        env: { ...env, BUILD_EXIT: "1" },
      }).status,
      1,
    );
    assert.equal(
      spawnSync("/bin/bash", ["-e", "-c", body], {
        cwd: dir,
        env: { ...env, BUILD_EXIT: "0" },
      }).status,
      0,
    );
    const calls = await readFile(log, "utf8");
    assert.equal(
      calls
        .split("\n")
        .filter((line) =>
          line.startsWith(
            "gh api --method POST repos/example/phonics/actions/workflows/deploy.yml/dispatches",
          ),
        ).length,
      2,
    );
    assert.equal(calls.includes("git push"), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
