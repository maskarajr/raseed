# v3 Preview — canonical URL & how to run (read before reviewing)

**This is the single source of truth for where the v3 design preview lives.**
Follow it so the preview and the main checkout are never confused again.

## Ports (fixed, do not improvise)

| Surface | Port | URL | What it serves |
|---------|------|-----|----------------|
| **v3 preview (this worktree)** | **3055** | http://localhost:3055 | Production build of branch `v3-alive-20260926` |
| Main checkout `dev` | 3000 | http://localhost:3000 | The `raseed` main folder (NOT the v3 preview) |

> Root cause of the earlier "looks like v2" scare: `:3000` was serving the main
> folder's stale prod build while the v3 worktree dev server had died and held
> no port. **Review the v3 work only on `:3055`.**

## Run the preview (durable)

From this worktree root (`raseed-wt-v3`):

```bash
npm run preview            # ensures a build exists, then serves on :3055
npm run preview -- 3100    # optional: override the port
```

The script (`scripts/preview-v3.cjs`):
- serves `next start` (stable **production** server, not a dev process);
- **auto-respawns** the server if it exits (up to 10x with backoff), so it does
  not silently die;
- prints branch / commit / build id / port at startup and logs to `preview-v3.log`.

To keep it alive after you close your shell (Windows):

```bat
start cmd /c npm run preview
```

## Before the owner retests

1. `git -C raseed-wt-v3 rev-parse --abbrev-ref HEAD` must show `v3-alive-20260926`.
2. Confirm the startup banner build id matches `.next/BUILD_ID`.
3. Open http://localhost:3055 and log in (`owner@raseed.local` / `owner123`).
4. If the owner's OS has **reduce motion** enabled, the v3 motion layer is
   suppressed by design — check OS accessibility settings before judging the
   visual delta.
