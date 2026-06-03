/**
 * `glint feedback "<message>" [--dir .] [--type bug|enhancement|aeo|dx] [--area <cmd-or-feature>]`
 *
 * The capture end of the feedback pipeline (see docs/FEEDBACK.md). Brand projects
 * never edit the engine — they run this to record a structured note. It:
 *   1. appends an entry to <project>/glint-feedback.md (always works, offline), and
 *   2. prints a ready-to-file GitHub issue (+ a `gh` one-liner) for the engine repo.
 * The maintainer triages the issues and implements on the engine.
 */
import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO = "vijayatechlabs/glint";
const TYPES = ["bug", "enhancement", "aeo", "dx", "docs"];

function engineVersion(): string {
  try {
    const pkgUrl = new URL("../../../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), "utf8"));
    const root = fileURLToPath(new URL("../../../", import.meta.url));
    const sha = spawnSync("git", ["-C", root, "rev-parse", "--short", "HEAD"], { encoding: "utf8" });
    const commit = sha.status === 0 ? ` (${sha.stdout.trim()})` : "";
    return `v${pkg.version}${commit}`;
  } catch {
    return "unknown";
  }
}

function projectName(dir: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    if (pkg.name) return pkg.name;
  } catch { /* fall through */ }
  return basename(dir.replace(/\/+$/, "")) || "unknown";
}

export async function runFeedback(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
    else positional.push(a);
  }
  const message = positional.join(" ").trim();
  if (!message) {
    console.error('Usage: glint feedback "<what is missing or broken>" [--type enhancement] [--area build]');
    console.error(`  --type: ${TYPES.join(" | ")}`);
    process.exitCode = 1;
    return;
  }

  const dir = flags.get("dir") ?? process.cwd();
  const type = TYPES.includes(flags.get("type") ?? "") ? flags.get("type")! : "enhancement";
  const area = flags.get("area") ?? "general";
  const project = projectName(dir);
  const version = engineVersion();
  const date = new Date().toISOString().slice(0, 10);
  const short = message.length > 70 ? message.slice(0, 67) + "…" : message;

  // 1) append to the project's local feedback log
  const log = join(dir, "glint-feedback.md");
  if (!existsSync(log)) {
    writeFileSync(log, `# Glint feedback (from ${project})\n\nEntries to file as issues on ${REPO}.\n`);
  }
  appendFileSync(
    log,
    `\n## [${date}] ${type}: ${short}\n` +
      `- **Project:** ${project}\n- **Glint:** ${version}\n- **Area:** ${area}\n` +
      `- **Feedback:** ${message}\n- **Status:** open\n`,
  );

  // 2) print the issue to file on the engine repo
  const title = `[feedback] ${type}: ${short}`;
  const body =
    `**Project:** ${project}\n**Glint version:** ${version}\n**Area:** ${area}\n\n` +
    `**What's missing or broken**\n${message}\n\n` +
    `**Proposed change**\n_(maintainer to fill)_\n`;

  console.log(`\n✓ logged to ${log}\n`);
  console.log(`File it on the engine queue → https://github.com/${REPO}/issues/new\n`);
  console.log(`Title: ${title}\n\n${body}`);
  console.log(`Or with gh:\n  gh issue create -R ${REPO} -t ${JSON.stringify(title)} -l feedback,${type} -b ${JSON.stringify(body)}\n`);
}
