/**
 * `glint init [--dir <path>] [--json]`
 *
 * The DISCOVER step of the init system (see docs/INIT.md). Deterministically
 * inspects a directory, classifies its state (FRESH | MIGRATION | ADOPT |
 * ESTABLISHED), auto-detects brand/voice/framework, and prints a status-aware
 * plan. No questions, no file changes — pure analysis the agent acts on next.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

type Mode = "FRESH" | "MIGRATION" | "ADOPT" | "ESTABLISHED";

interface State {
  dir: string;
  mode: Mode;
  brandGuess: string;
  domainGuess: string | null;
  collections: string[];
  contentCount: number;
  hasVoice: boolean;
  migrationSource: string[];
  framework: string;
  isGlintSite: boolean;
}

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function countMarkdown(contentDir: string): { count: number; collections: string[] } {
  if (!existsSync(contentDir)) return { count: 0, collections: [] };
  let count = 0;
  const collections = new Set<string>();
  for (const entry of readdirSync(contentDir, { recursive: true }) as string[]) {
    if (entry.endsWith(".md")) {
      count++;
      const top = entry.split(/[\\/]/)[0]!;
      if (top.endsWith(".md") === false) collections.add(top);
    }
  }
  return { count, collections: [...collections] };
}

function gitRemoteName(dir: string): { brand: string; url: string | null } {
  const cfg = read(join(dir, ".git", "config"));
  const m = cfg.match(/url\s*=\s*(.+)/);
  const url = m ? m[1]!.trim() : null;
  let brand = dir.split(/[\\/]/).filter(Boolean).pop() ?? "site";
  if (url) {
    const repo = url.replace(/\.git$/, "").split("/").pop();
    if (repo) brand = repo;
  }
  return { brand: brand.replace(/[-_]?(blog|site|web|www)$/i, "") || brand, url };
}

function detect(dir: string): State {
  const isGlintSite = existsSync(join(dir, "AGENTS.md")) && existsSync(join(dir, "content"));
  const { count, collections } = countMarkdown(join(dir, "content"));
  const hasVoice = existsSync(join(dir, "docs", "brand-voice.md"));

  // migration source: top-level WXR exports
  const migrationSource = existsSync(dir)
    ? readdirSync(dir).filter((f) => /\.(xml)$/i.test(f) && /wordpress|wxr|\.xml$/i.test(f))
    : [];

  // framework / site files
  const pkgRaw = read(join(dir, "package.json"));
  let framework = "none";
  let pkgName = "";
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw);
      pkgName = pkg.name ?? "";
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      framework = deps.astro
        ? "astro"
        : deps.next
          ? "next"
          : deps.vite
            ? "vite"
            : Object.keys(deps).length
              ? "node"
              : "none";
    } catch { /* ignore */ }
  }
  const hasSiteFiles = !!pkgRaw || existsSync(join(dir, "index.html"));

  const { brand, url } = gitRemoteName(dir);
  const brandGuess = pkgName || brand;
  const domainGuess = brandGuess.includes(".") ? brandGuess : null;

  let mode: Mode;
  if (isGlintSite && count > 0) mode = "ESTABLISHED";
  else if (migrationSource.length) mode = "MIGRATION";
  else if (hasSiteFiles) mode = "ADOPT";
  else mode = "FRESH";

  return {
    dir,
    mode,
    brandGuess,
    domainGuess,
    collections,
    contentCount: count,
    hasVoice,
    migrationSource,
    framework,
    isGlintSite,
  };
}

function plan(s: State): string[] {
  const voiceStep = s.hasVoice
    ? "Load docs/brand-voice.md and confirm it's current."
    : "Derive a brand voice (analyse the live site if a domain exists, else interview) → docs/brand-voice.md, get approval.";
  const common = [
    "UNDERSTAND: confirm only the gaps — brand, domain, collections, mount, deploy target.",
    `VOICE: ${voiceStep}`,
    "UNFOLD: run `glint new` to scaffold any missing structure + agent files.",
  ];
  switch (s.mode) {
    case "FRESH":
      return [...common, "SEED: propose a topic plan from the voice; seed 1 sample post as a draft.", "REVIEW: open a PR; human approves."];
    case "MIGRATION":
      return [
        `IMPORT: \`glint import wordpress --wxr ${s.migrationSource[0] ?? "<export.xml>"} --out .\``,
        "AUDIT: read docs/CONTENT-AUDIT.md; triage keep/refresh/rewrite/drop.",
        ...common,
        "REGENERATE: rewrite off-topic/duplicate posts fresh on-voice (don't salvage filler).",
        "REVIEW: drafts on a branch → PR; human approves & flips draft:false.",
      ];
    case "ADOPT":
      return [...common, "MAP: fold existing pages/content into Glint collections; plan body migration.", "REVIEW: open a PR."];
    case "ESTABLISHED":
      return ["This is already a Glint site. Options: add content, re-run the audit, or bump @vijayatech/glint.", `VOICE: ${voiceStep}`];
  }
}

export async function runInit(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") flags.set("json", "1");
    else if (a?.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
  }
  const dir = flags.get("dir") ?? process.cwd();
  const s = detect(dir);

  if (flags.get("json")) {
    console.log(JSON.stringify({ ...s, plan: plan(s) }, null, 2));
    return;
  }

  console.log(`\nGlint init — discovery for ${dir}\n`);
  console.log(`  Mode:        ${s.mode}`);
  console.log(`  Brand guess: ${s.brandGuess}${s.domainGuess ? ` (${s.domainGuess})` : ""}`);
  console.log(`  Glint site:  ${s.isGlintSite ? "yes" : "no"}`);
  console.log(`  Content:     ${s.contentCount} posts${s.collections.length ? ` in [${s.collections.join(", ")}]` : ""}`);
  console.log(`  Brand voice: ${s.hasVoice ? "docs/brand-voice.md present" : "MISSING — needs drafting"}`);
  console.log(`  Migration:   ${s.migrationSource.length ? s.migrationSource.join(", ") : "none"}`);
  console.log(`  Framework:   ${s.framework}`);
  console.log(`\nNext steps (see docs/INIT.md):`);
  plan(s).forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log("");
}
