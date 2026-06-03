/**
 * `glint build [--dir .]` and `glint preview [--dir .]`.
 *
 * Glint sites are Astro projects, so build/preview drive Astro in the target
 * dir. `build` produces the static site + full AEO surface (HTML, JSON-LD,
 * sitemap, RSS, llms.txt, /raw twins, JSON API) honoring the draft rules.
 * `preview` runs the dev server with drafts visible (BLOG-SPEC §1).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function targetDir(args: string[]): string {
  const i = args.indexOf("--dir");
  return i >= 0 && args[i + 1] ? args[i + 1]! : process.cwd();
}

function ensureAstroSite(dir: string): boolean {
  const ok =
    existsSync(join(dir, "astro.config.mjs")) ||
    existsSync(join(dir, "astro.config.ts")) ||
    existsSync(join(dir, "astro.config.js"));
  if (!ok) {
    console.error(
      `No Astro config found in ${dir}.\n` +
        `Glint renders via Astro — scaffold the site first (\`glint new\`) or run in a Glint site dir.`,
    );
  }
  return ok;
}

function runScript(dir: string, script: "build" | "dev"): void {
  // Run the site's package script so the full pipeline runs (astro build +
  // pagefind for `build`). `npm run` puts node_modules/.bin on PATH.
  const r = spawnSync("npm", ["run", script], { cwd: dir, stdio: "inherit" });
  process.exitCode = r.status ?? 1;
}

export async function runBuild(args: string[]): Promise<void> {
  const dir = targetDir(args);
  if (!ensureAstroSite(dir)) {
    process.exitCode = 1;
    return;
  }
  console.log(`glint build → astro build + pagefind in ${dir}\n`);
  runScript(dir, "build");
}

export async function runPreview(args: string[]): Promise<void> {
  const dir = targetDir(args);
  if (!ensureAstroSite(dir)) {
    process.exitCode = 1;
    return;
  }
  console.log(`glint preview → astro dev (drafts visible) in ${dir}\n`);
  runScript(dir, "dev");
}
