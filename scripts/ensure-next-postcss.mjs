import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/** Next 14 resolves postcss from node_modules/next/node_modules/postcss. A
 *  root override hoists 8.5.28 and Next 500s. Copy the patched tree back. */
const root = process.cwd();
const src = join(root, "node_modules", "postcss");
const destDir = join(root, "node_modules", "next", "node_modules");
const dest = join(destDir, "postcss");
if (!existsSync(src) || !existsSync(join(root, "node_modules", "next"))) {
  process.exit(0);
}
mkdirSync(destDir, { recursive: true });
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
