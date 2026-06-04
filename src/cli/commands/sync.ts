/**
 * `glint sync [--dir .] [--dry-run]`
 *
 * Pulls the latest engine templates into the brand site without touching brand
 * data. Three-bucket model:
 *
 *   1. Engine-reference  — pure engine docs (content-playbook.md).
 *                          Always overwritten; no user data lives here.
 *   2. Engine-generated  — files built from brand config (AGENTS.md, checklist…).
 *                          Regenerated using current data/site.config.ts values.
 *   3. Brand-owned       — voice, categories, strategy, theme, content.
 *                          Never touched; listed so you know they were skipped.
 *
 * Run after `pnpm update @vijayatech/glint` to pull engine doc improvements
 * into your brand site in one step.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agentsMd, pointer, reviewChecklistTemplate, scaffoldDir, workspaceRule } from "./new.js";

interface SiteConfig {
  brand: string;
  domain: string;
  collections: string[];
  mount: string;
}

/** Regex-parse the generated data/site.config.ts — robust for the shape we emit. */
function parseSiteConfig(dir: string): SiteConfig {
  const cfgPath = join(dir, "data/site.config.ts");
  if (!existsSync(cfgPath)) {
    return { brand: "site", domain: "site.com", collections: ["blog"], mount: "" };
  }
  const src = readFileSync(cfgPath, "utf8");
  const brand = src.match(/brand:\s*"([^"]+)"/)?.[1] ?? "site";
  const domain = src.match(/domain:\s*"([^"]+)"/)?.[1] ?? `${brand}.com`;
  const mount = src.match(/mount:\s*"([^"]*)"/)?.[1] ?? "";
  let collections: string[] = ["blog"];
  const colMatch = src.match(/collections:\s*(\[[^\]]*\])/);
  if (colMatch?.[1]) {
    try { collections = JSON.parse(colMatch[1]); } catch { /* keep default */ }
  }
  return { brand, domain, collections, mount };
}

function lineDelta(before: string, after: string): string {
  const bLines = before.split("\n").length;
  const aLines = after.split("\n").length;
  const delta = aLines - bLines;
  if (delta === 0) return "no change";
  return delta > 0 ? `+${delta} lines` : `${delta} lines`;
}

type SyncResult = { path: string; status: "updated" | "created" | "unchanged" | "skipped" };

function syncFile(
  absPath: string,
  relPath: string,
  content: string,
  dryRun: boolean,
  results: SyncResult[],
): void {
  if (!existsSync(absPath)) {
    if (!dryRun) writeFileSync(absPath, content);
    results.push({ path: relPath, status: "created" });
    return;
  }
  const current = readFileSync(absPath, "utf8");
  if (current === content) {
    results.push({ path: relPath, status: "unchanged" });
    return;
  }
  if (!dryRun) writeFileSync(absPath, content);
  results.push({ path: relPath, status: "updated" });
}

export async function runSync(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") flags.set("dry-run", "1");
    else if (a?.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
  }
  const dir = flags.get("dir") ?? process.cwd();
  const dryRun = flags.has("dry-run");

  const cfg = parseSiteConfig(dir);
  const { brand, domain, collections, mount } = cfg;

  console.log(`\nglint sync — ${brand}${dryRun ? " (dry run)" : ""}\n`);

  const refResults: (SyncResult & { delta?: string })[] = [];
  const genResults: (SyncResult & { delta?: string })[] = [];

  // ── Bucket 1: Engine-reference docs (static, no brand interpolation) ──────
  // These live in src/scaffold/docs/ and are shipped verbatim.
  let docsRoot: string | undefined;
  try { docsRoot = scaffoldDir("docs"); } catch { /* scaffold not found — skip */ }

  if (docsRoot) {
    const refFiles = ["content-playbook.md"];
    for (const f of refFiles) {
      const absPath = join(dir, "docs", f);
      const srcPath = join(docsRoot, f);
      if (!existsSync(srcPath)) continue;
      const engineContent = readFileSync(srcPath, "utf8");
      const before = existsSync(absPath) ? readFileSync(absPath, "utf8") : "";
      syncFile(absPath, `docs/${f}`, engineContent, dryRun, refResults);
      const last = refResults[refResults.length - 1]!;
      if (last.status === "updated") last.delta = lineDelta(before, engineContent);
    }
  }

  // ── Bucket 2: Engine-generated files (brand config interpolated) ──────────
  const generated: Array<[string, () => string]> = [
    ["docs/blog-review-checklist.md", () => reviewChecklistTemplate(brand)],
    ["AGENTS.md", () => agentsMd(brand, domain, collections, mount)],
    ["CLAUDE.md", () => `# CLAUDE.md\n\n${pointer(brand)}`],
    ["GEMINI.md", () => `# GEMINI.md\n\n${pointer(brand)}`],
    [".agents/rules/glint.md", () => workspaceRule(brand)],
  ];

  for (const [relPath, generate] of generated) {
    const absPath = join(dir, relPath);
    const newContent = generate();
    const before = existsSync(absPath) ? readFileSync(absPath, "utf8") : "";
    syncFile(absPath, relPath, newContent, dryRun, genResults);
    const last = genResults[genResults.length - 1]!;
    if (last.status === "updated") last.delta = lineDelta(before, newContent);
  }

  // ── Bucket 3: Brand-owned — list but never touch ──────────────────────────
  const brandOwned = [
    "docs/brand-voice.md",
    "data/content-strategy.md",
    "data/categories.md",
    "data/tags.md",
    "data/content-plan.md",
    "data/team.json",
    "data/links.json",
    "data/site.config.ts",
    "public/theme.css",
    "public/custom.css",
    "redirects.json",
  ];

  // ── Report ────────────────────────────────────────────────────────────────
  const statusIcon = (r: SyncResult): string =>
    r.status === "updated" ? "↺ " :
    r.status === "created" ? "+ " :
    r.status === "unchanged" ? "· " : "  ";

  const allResults = [...refResults, ...genResults];
  const changed = allResults.filter((r) => r.status === "updated" || r.status === "created");

  if (refResults.length) {
    console.log("  Engine-reference docs (overwritten from engine):");
    for (const r of refResults) {
      const extra = (r as typeof refResults[0]).delta ? `  (${(r as typeof refResults[0]).delta})` : "";
      console.log(`    ${statusIcon(r)} ${r.path}${extra}`);
    }
    console.log("");
  }

  console.log("  Engine-generated files (regenerated from brand config):");
  for (const r of genResults) {
    const extra = (r as typeof genResults[0]).delta ? `  (${(r as typeof genResults[0]).delta})` : "";
    console.log(`    ${statusIcon(r)} ${r.path}${extra}`);
  }
  console.log("");

  const presentOwned = brandOwned.filter((f) => existsSync(join(dir, f)));
  if (presentOwned.length) {
    console.log(`  Brand-owned (not touched — ${presentOwned.length} files):`);
    for (const f of presentOwned) console.log(`    · ${f}`);
    console.log("");
  }

  if (changed.length === 0) {
    console.log("  Everything up to date.\n");
  } else if (dryRun) {
    console.log(`  ${changed.length} file(s) would change. Run without --dry-run to apply.\n`);
  } else {
    console.log(`  ${changed.length} file(s) updated. Run \`glint doctor\` to verify.\n`);
  }
}
