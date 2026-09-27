#!/usr/bin/env node
/*
 * Durable, isolated v3 preview launcher.
 *
 * Why this exists: `npm run dev` and a running production preview must NEVER
 * share one build directory. Next dev rewrites .next on every change, which
 * used to destroy the files `next start` was serving -> HTML referenced a CSS
 * hash that no longer existed on disk -> HTTP 500 -> unstyled page.
 *
 * Fix: this preview builds and serves into an isolated distDir
 * (.next-preview) via the RASEED_DIST_DIR env that next.config.js honors.
 * `npm run dev` keeps using .next. They cannot clobber each other.
 *
 * It also self-heals: ensures a build exists, waits for readiness, verifies
 * the served stylesheet returns 200, and rebuilds once if assets are stale.
 * Uses `next start` (stable prod server) and auto-respawns it on exit.
 *
 * Freshness contract: a successful build stamps the git HEAD commit into
 * ${DIST}/BUILD_COMMIT. On startup the current HEAD is compared against that
 * stamp and a mismatch (or a pre-stamp build with no stamp file) forces a
 * rebuild BEFORE the server starts. Without this, a committed fix could sit
 * unserved while the preview answers 200 with old chunks — "verified live"
 * evidence from the wrong build. (Class of failure: :3000 clobber scare.)
 *
 * Usage:
 *   npm run preview                 -> port 3055, dist .next-preview, auto-build
 *   npm run preview -- 3100         -> override port
 *   PREVIEW_PORT=3100 PREVIEW_DIST=.next-preview npm run preview
 * Keep alive after shell close (Windows):  start cmd /c npm run preview
 */
const { spawn, spawnSync } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PORT = String(process.argv[2] || process.env.PREVIEW_PORT || 3055);
const DIST = process.env.PREVIEW_DIST || ".next-preview";
const LOG = path.join(ROOT, "preview-v3.log");
const MAX_RESTARTS = 10;
const ENV = { ...process.env, RASEED_DIST_DIR: DIST };

const sh = (cmd) =>
  spawnSync(cmd, { cwd: ROOT, encoding: "utf8", shell: true }).stdout?.trim() || "?";
const headCommit = () =>
  spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout?.trim() || "";
const log = (msg) => {
  const line = `[preview ${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG, line); } catch {}
};

const httpOnce = (url, method) =>
  new Promise((resolve) => {
    const req = http.request(url, { method }, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, body: "" }); });
    req.end();
  });

const buildIdPath = path.join(ROOT, DIST, "BUILD_ID");
const stampPath = path.join(ROOT, DIST, "BUILD_COMMIT");

function build() {
  const stamp = headCommit();
  log(`building isolated preview into ${DIST} … (git HEAD ${stamp.slice(0, 8) || "?"})`);
  const r = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit", shell: true, env: ENV });
  if (r.status !== 0) return false;
  try { fs.writeFileSync(stampPath, stamp + "\n"); }
  catch (e) { log(`WARN: could not stamp BUILD_COMMIT: ${e.message}`); }
  return true;
}

// Fresh = a build exists AND its captured commit equals current git HEAD.
// A leftover build from before stamping existed (no BUILD_COMMIT) is stale by
// definition: rebuild once to re-stamp it. Outside a git repo, don't block.
function buildIsFresh() {
  if (!fs.existsSync(buildIdPath)) return false;
  const head = headCommit();
  if (!head) return true;
  if (!fs.existsSync(stampPath)) {
    log(`${DIST} has no BUILD_COMMIT stamp (pre-stamp build) -> forcing rebuild`);
    return false;
  }
  const built = fs.readFileSync(stampPath, "utf8").trim();
  if (built === head) return true;
  log(`STALE BUILD: stamped ${built.slice(0, 8) || "(empty)"} but HEAD is ${head.slice(0, 8)} -> forcing rebuild`);
  return false;
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    const r = await httpOnce(`http://localhost:${PORT}/login`, "GET");
    if (r.status === 200) return r.body;
    await new Promise((s) => setTimeout(s, 500));
  }
  return null;
}

async function verifyStyled(html) {
  const m = (html || "").match(/\/_next\/static\/css\/[^"]+\.css/);
  if (!m) { log("WARN: no stylesheet link found in /login HTML"); return false; }
  const css = await httpOnce(`http://localhost:${PORT}${m[0]}`, "GET");
  log(`stylesheet ${m[0]} -> HTTP ${css.status}`);
  return css.status === 200;
}

const nextBin = path.join(ROOT, "node_modules", ".bin",
  process.platform === "win32" ? "next.cmd" : "next");

let child = null;
let shuttingDown = false;
let restarts = 0;
let healedOnce = false;

function start() {
  child = spawn(nextBin, ["start", "-p", PORT], { cwd: ROOT, shell: true, env: ENV });
  child.stdout?.on("data", (d) => process.stdout.write(d));
  child.stderr?.on("data", (d) => process.stderr.write(d));
  log(`next start -p ${PORT} (dist ${DIST}) launched, pid ${child.pid}`);

  (async () => {
    const html = await waitReady();
    if (!html) { log("server not ready within 30s"); return; }
    const styled = await verifyStyled(html);
    if (!styled && !healedOnce) {
      healedOnce = true;
      log("stylesheet missing/stale -> rebuilding once and respawning");
      if (child && !child.killed) child.kill();
      if (build()) setTimeout(start, 1000);
      return;
    }
    log(styled ? "READY — styled preview live" : "READY (could not confirm stylesheet; see note above)");
  })();

  child.on("exit", (code, signal) => {
    log(`server exited code=${code} signal=${signal}`);
    if (shuttingDown) return;
    (async () => {
      // If the port is already answered by another healthy preview, a second
      // copy of this script (or a leftover from a previous run) won it. Do NOT
      // crash-loop — defer to the live server and retire this supervisor.
      const r = await httpOnce(`http://localhost:${PORT}/login`, "GET");
      if (r.status === 200) {
        log(`port ${PORT} already served by another healthy preview; retiring this supervisor`);
        shuttingDown = true;
        process.exit(0);
      }
      if (restarts >= MAX_RESTARTS) { log(`MAX_RESTARTS=${MAX_RESTARTS}; giving up. Check ${LOG}`); process.exit(1); }
      restarts += 1;
      if (!buildIsFresh()) {
        log("server down and build is stale vs HEAD — rebuilding before respawn");
        if (!build()) log("WARN: rebuild failed; respawning on last known build");
      }
      const wait = Math.min(1000 * restarts, 10000);
      log(`respawning in ${wait}ms (restart ${restarts}/${MAX_RESTARTS})`);
      setTimeout(start, wait);
    })();
  });
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    shuttingDown = true;
    log(`${sig} received — shutting down`);
    if (child && !child.killed) child.kill(sig);
    setTimeout(() => process.exit(0), 500);
  });
}

console.log(`\n=== Raseed v3 PREVIEW ===
  cwd   : ${ROOT}
  branch: ${sh("git rev-parse --abbrev-ref HEAD")}  commit: ${sh("git rev-parse --short HEAD")}
  dist  : ${DIST} (isolated from dev's .next)   build: ${fs.existsSync(buildIdPath) ? fs.readFileSync(buildIdPath, "utf8").trim() : "(none — will build)"}   stamped commit: ${fs.existsSync(stampPath) ? fs.readFileSync(stampPath, "utf8").trim().slice(0, 8) : "(none — will rebuild to stamp)"}
  URL   : http://localhost:${PORT}
  log   : ${LOG}
  rule  : dev server = :3000/.next ; preview = :${PORT}/${DIST}. They never share a build dir.
`);

if (!buildIsFresh()) {
  if (!build()) { console.error("[preview] build failed; not starting."); process.exit(1); }
}
start();
