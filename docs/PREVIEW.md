# v3 Preview — canonical URL & how to run (read before reviewing)

**This is the single source of truth for where the v3 design preview lives.**
Follow it so the preview and the main/dev server are never confused or
mutually destructive.

## The one rule that matters: dev and preview use SEPARATE build dirs

The earlier "unstyled page" bug happened because `npm run dev` and a running
production preview both rewrote the same `.next` folder: the dev server
regenerated `.next` and deleted the exact CSS file the preview was serving
(its HTML still pointed at `f15e1fc8….css`, which no longer existed on disk ->
HTTP 500 -> no styles).

Fixed by giving the preview its own isolated output directory:

| Command | Port | Build dir | Safe to run while the other runs? |
|---------|------|-----------|-----------------------------------|
| `npm run dev` (main checkout / this worktree) | **3000** | `.next` | Yes |
| `npm run preview` (durable v3 preview) | **3055** | **`.next-preview`** | Yes |

They can no longer clobber each other. `.next-preview` is git-ignored.

## Canonical preview URL

```
http://localhost:3055     login: owner@raseed.local / owner123
```

`http://localhost:3000` is the dev/main checkout — **do not** judge the v3
preview there.

## Run the preview (durable + self-healing)

From the `raseed-wt-v3` worktree root:

```bash
npm run preview            # serves .next-preview on :3055; builds if missing or stale vs HEAD
npm run preview -- 3100    # optional: override the port
```

`scripts/preview-v3.cjs` will:
- build into the isolated `.next-preview` **if no build exists OR the build is
  stale**: every successful build stamps its git HEAD into
  `.next-preview/BUILD_COMMIT`; at startup (and before each respawn) the
  launcher compares that stamp with current HEAD and forces a rebuild on
  mismatch. This closes the "fix committed but preview serves old chunks"
  blind spot — a 200 from :3055 now implies HEAD-faithful code;
- serve via `next start` (stable production server, not a dev process);
- **wait for readiness and verify the referenced stylesheet returns HTTP 200**;
  if the CSS is missing/stale it rebuilds once and respawns;
- auto-respawn `next start` if it exits unexpectedly (up to 10x, backoff),
  logging to `preview-v3.log`;
- if another healthy preview already owns the port, retire gracefully instead
  of crash-looping (so two copies never fight).

Keep it alive after you close the shell (Windows):

```bat
start cmd /c npm run preview
```

Override build dir/port via env: `PREVIEW_DIST=.next-preview PREVIEW_PORT=3055 npm run preview`.

## Before the owner retests

1. Banner must show `branch v3-alive-20260926`, `dist .next-preview`, `port 3055`.
2. Confirm log line `READY — styled preview live` (means the CSS self-check passed).
3. Open http://localhost:3055, hard refresh (Ctrl+Shift+R), log in.
4. If the owner's OS has **reduce motion** ON, the v3 motion layer is suppressed
   by design — check OS accessibility settings before judging the visual delta.
5. If it ever looks unstyled again, screenshot it and treat that as a defect
   (but note dev/preview are now isolated, so the prior cause is gone).
