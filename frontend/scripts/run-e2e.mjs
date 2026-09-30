import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const directory = mkdtempSync(join(tmpdir(), "intake-e2e-"));
try {
  const result = spawnSync(
    process.execPath,
    [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: { ...process.env, E2E_WORKSPACE: directory },
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
