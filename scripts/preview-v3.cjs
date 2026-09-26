#!/usr/bin/env node
/*
 * Durable v3 preview launcher.
 *
 * Serves the PRODUCTION build of the current checkout on a dedicated, fixed
 * port so the v3 worktree preview can never be confused with the main
 * checkout's dev server (which owns :3000). Uses `next start` (stable prod
 * server) instead of a dev process, and auto-respawns it if it ever exits, so
 * the preview does not silently die.
 *
 * Usage:
 *   npm run preview                 -> port 3055 (default), auto-build if none
 *   npm run preview -- 3100         -> override port
 *   PREVIEW_PORT=3100 npm run preview
 *
 * Stop: Ctrl+C in the terminal (or close it). To keep it running after you
 * log off on Windows, launch it in its own window: `start cmd /c npm run preview`
 */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PORT = String(process.argv[2] || process.env.PREVIEW_PORT || 3055);
const LOG = path.join(ROOT, "preview-v3.log");
const MAX_RESTARTS = 10;

const run = (cmd, args) =>
  spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
const sh = (cmd) =>
  spawnSync(cmd, { cwd: ROOT, encoding: "utf8", shell: true }).stdout?.trim() || "?";

const gitBranch = sh("git rev-parse --abbrev-ref HEAD");
const gitHead = sh("git rev-parse --short HEAD");
const buildId = fs.existsSync(path.join(ROOT, ".next/BUILD_ID"))
  ? fs.readFileSync(path.join(ROOT, ".next/BUILD_ID"), "utf8").trim()
  : null;

console.log(`\n=== Raseed v3 PREVIEW ===
  cwd        : ${ROOT}
  branch     : ${gitBranch}
  commit     : ${gitHead}
  build      : ${buildId ?? "(none yet — will build)"}
  port       : ${PORT}   URL: http://localhost:${PORT}
  log        : ${LOG}
  NOTE       : :3000 is the MAIN checkout dev server. This preview is :${PORT} only.
`);

// Cold build only if there is no production output yet.
if (!buildId) {
  console.log("[preview] no .next build found — running `npm run build`…");
  const b = run("npm", ["run", "build"]);
  if (b.status !== 0) {
    console.error("[preview] build failed; not starting server.");
    process.exit(b.status ?? 1);
  }
}

const nextBin = path.join(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

let restarts = 0;
let shuttingDown = false;
let child = null;

function start() {
  child = spawn(nextBin, ["start", "-p", PORT], { cwd: ROOT, shell: process.platform === "win32" });
  const tlog = (msg) => {
    const line = `[preview ${new Date().toISOString()}] ${msg}\n`;
    process.stdout.write(line);
    try { fs.appendFileSync(LOG, line); } catch {}
  };
  child.stdout?.on("data", (d) => process.stdout.write(d));
  child.stderr?.on("data", (d) => process.stderr.write(d));
  tlog(`next start -p ${PORT} launched (pid ${child.pid})`);

  child.on("exit", (code, signal) => {
    tlog(`server exited code=${code} signal=${signal}`);
    if (shuttingDown) return;
    if (restarts >= MAX_RESTARTS) {
      tlog(`reached MAX_RESTARTS=${MAX_RESTARTS}; giving up. Check ${LOG}.`);
      process.exit(1);
    }
    restarts += 1;
    const wait = Math.min(1000 * restarts, 10000);
    tlog(`respawning in ${wait}ms (restart ${restarts}/${MAX_RESTARTS})…`);
    setTimeout(start, wait);
  });
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    shuttingDown = true;
    console.log(`\n[preview] ${sig} received — shutting down preview server.`);
    if (child && !child.killed) child.kill(sig);
    setTimeout(() => process.exit(0), 500);
  });
}

start();
