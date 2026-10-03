// Real Redis + Celery with temporary SQLite/files. No eager-task shortcut.
import {
  mkdtempSync,
  rmSync,
  openSync,
  closeSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
const require = createRequire(import.meta.url);
const directory = mkdtempSync(join(tmpdir(), "intake-e2e-"));
const redisName = `intake-e2e-${process.pid}-${Date.now()}`;
const children = [];
const descriptors = [];
let redisStarted = false;
function docker(...args) {
  const result = spawnSync("docker", args, { encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(result.stderr || "Docker command failed");
  return result.stdout.trim();
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function start(name, args, env) {
  const log = openSync(join(directory, `${name}.log`), "w");
  descriptors.push(log);
  const child = spawn(resolve("../backend/.venv/bin/python"), args, {
    cwd: "../backend",
    env,
    stdio: ["ignore", log, log],
    detached: true,
  });
  children.push(child);
  return child;
}
try {
  // Refuse to accidentally test against someone else's API on this port.
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(8011, "127.0.0.1", () => probe.close(resolve));
  });
  docker(
    "run",
    "--rm",
    "-d",
    "--name",
    redisName,
    "-p",
    "127.0.0.1::6379",
    "redis:7-alpine",
  );
  redisStarted = true;
  const port = docker("port", redisName, "6379/tcp").split(":").at(-1);
  const env = {
    ...process.env,
    E2E_WORKSPACE: directory,
    DATABASE_URL: `sqlite:///${directory}/e2e.db`,
    DATA_DIR: `${directory}/files`,
    OPENAI_API_KEY: "",
    CORS_ORIGINS: "http://127.0.0.1:5174",
    CELERY_BROKER_URL: `redis://127.0.0.1:${port}/0`,
    CELERY_QUEUE: "e2e-csv",
    DISPATCH_INTERVAL_SECONDS: "0.25",
  };
  const api = start(
    "api",
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8011"],
    env,
  );
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (api.exitCode !== null)
      throw new Error("Isolated API exited during startup");
    try {
      ready = (await fetch("http://127.0.0.1:8011/health")).ok;
    } catch {}
    if (ready) break;
    await pause(100);
  }
  if (!ready) throw new Error("Isolated API failed to start");
  start(
    "worker",
    [
      "-m",
      "celery",
      "-A",
      "app.core.celery_app:celery_app",
      "worker",
      "--loglevel=INFO",
      "--concurrency=1",
    ],
    env,
  );
  start("dispatcher", ["-m", "app.dispatcher"], env);
  const result = spawn(
    process.execPath,
    [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)],
    { stdio: "inherit", env },
  );
  process.exitCode = await new Promise((resolve) =>
    result.once("exit", (code) => resolve(code ?? 1)),
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const child of children) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  for (
    let attempt = 0;
    attempt < 50 &&
    children.some(
      (child) => child.exitCode === null && child.signalCode === null,
    );
    attempt++
  )
    await pause(100);
  for (const child of children) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
  if (redisStarted) {
    try {
      docker("rm", "-f", redisName);
    } catch (error) {
      console.error(error.message);
    }
  }
  for (const descriptor of descriptors) closeSync(descriptor);
  if (process.exitCode) {
    for (const name of ["api", "worker", "dispatcher"]) {
      try {
        console.error(
          readFileSync(join(directory, `${name}.log`), "utf8").slice(-12000),
        );
      } catch {}
    }
  }
  rmSync(directory, { recursive: true, force: true });
}
