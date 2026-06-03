/**
 * `glint onboard --app <app-repo> [--dir <blog-dir>] [--domain x.com] [--apply]`
 *
 * The capture orchestrator (see docs/INIT.md). DETECT brand/tokens/host/framework
 * from an existing app, print a draft manifest + the exact commands, and — with
 * `--apply` — run them (theme pull → new). Confirmation is the human's one pass;
 * everything else is deterministic detectors. Low input, low tokens, low error.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { runTheme } from "./theme.js";
import { runNew } from "./new.js";

interface AppInfo {
  brand: string;
  framework: string;
  host: string; // deployTarget guess
  tokens?: string;
  tokensKind?: "tailwind";
}

function detectApp(appDir: string): AppInfo {
  let brand = basename(appDir.replace(/\/+$/, "")) || "site";
  let framework = "unknown";

  const pkgP = join(appDir, "package.json");
  if (existsSync(pkgP)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgP, "utf8"));
      if (pkg.name) brand = String(pkg.name).replace(/^@[^/]+\//, "");
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      framework = deps.next ? "next" : deps.astro ? "astro" : deps.vite ? "vite" : Object.keys(deps).length ? "node" : "unknown";
    } catch { /* ignore */ }
  }

  let tokens: string | undefined;
  let tokensKind: "tailwind" | undefined;
  for (const f of ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs"]) {
    if (existsSync(join(appDir, f))) { tokens = join(appDir, f); tokensKind = "tailwind"; break; }
  }

  const host = existsSync(join(appDir, "netlify.toml"))
    ? "netlify"
    : existsSync(join(appDir, "vercel.json"))
      ? "vercel"
      : "cf-pages";

  return { brand, framework, host, tokens, tokensKind };
}

export async function runOnboard(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--apply") flags.set("apply", "1");
    else if (a?.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
  }

  const app = flags.get("app");
  if (!app || !existsSync(app)) {
    console.error("Usage: glint onboard --app <app-repo> [--dir <blog-dir>] [--domain x.com] [--mount /blog] [--apply]");
    process.exitCode = 1;
    return;
  }

  const d = detectApp(app);
  const slug = d.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site";
  const brand = flags.get("brand") ?? d.brand;
  const domainGiven = flags.get("domain");
  const domain = domainGiven ?? `${slug}.com`;
  const collections = flags.get("collections") ?? "blog";
  const mount = flags.get("mount") ?? "/blog";
  const target = flags.get("target") ?? d.host;
  const dir = flags.get("dir");

  console.log(`\nGlint onboard — detected from ${app}\n`);
  console.log(`  brand:      ${brand}`);
  console.log(`  domain:     ${domain}${domainGiven ? "" : "   ⚠ guessed — confirm with --domain"}`);
  console.log(`  framework:  ${d.framework}`);
  console.log(`  host:       ${target}`);
  console.log(`  tokens:     ${d.tokens ? `${d.tokensKind} (${d.tokens})` : "none found — defaults"}`);
  console.log(`  mount:      ${mount}    collections: ${collections}`);

  console.log(`\nPlanned commands:`);
  if (d.tokens) console.log(`  glint theme pull --tailwind ${d.tokens} --dir ${dir ?? "<blog-dir>"}`);
  console.log(
    `  glint new --dir ${dir ?? "<blog-dir>"} --brand ${JSON.stringify(brand)} --domain ${domain} --collections ${collections} --mount ${mount} --target ${target}`,
  );

  if (!flags.get("apply")) {
    console.log(`\nReview above, then re-run with --dir <blog-dir> --apply (add --domain to confirm).\n`);
    return;
  }
  if (!dir) {
    console.error("\n--apply needs --dir <blog-dir>.");
    process.exitCode = 1;
    return;
  }

  console.log(`\nApplying →`);
  if (d.tokens) await runTheme(["pull", "--tailwind", d.tokens, "--dir", dir]);
  await runNew(["--dir", dir, "--brand", brand, "--domain", domain, "--collections", collections, "--mount", mount, "--target", target]);
  console.log(`✓ onboarded ${dir}. Next: edit docs/brand-voice.md, then \`glint doctor --dir ${dir}\` + \`glint build --dir ${dir}\`.\n`);
}
