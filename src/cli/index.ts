#!/usr/bin/env node
/**
 * Glint CLI — command router. Static imports so the published build bundles
 * cleanly; the real work lives in ./commands/*.
 */
import { runOnboard } from "./commands/onboard.js";
import { runInit } from "./commands/init.js";
import { runNew } from "./commands/new.js";
import { runStatus } from "./commands/status.js";
import { runFeedback } from "./commands/feedback.js";
import { runTheme } from "./commands/theme.js";
import { runImport } from "./commands/import-wordpress.js";
import { runDoctor } from "./commands/doctor.js";
import { runBuild, runPreview } from "./commands/build.js";
import { runSync } from "./commands/sync.js";

const COMMANDS: Record<string, string> = {
  onboard: "Detect brand/tokens/host from an app + draft the site — `--app <repo> --apply`",
  init: "Analyse a repo, detect its state (fresh/migration/adopt), print a plan",
  new: "Scaffold/complete a brand site's structure + agent files (idempotent)",
  status: "Content board — list every post by status (draft/scheduled/published)",
  feedback: "Record structured feedback for the engine (projects never edit Glint)",
  theme: "Pull brand tokens into theme.css — `glint theme pull --tailwind <path>`",
  build: "Build the static site + AEO surface (astro build + pagefind)",
  preview: "Preview locally with drafts visible",
  doctor: "Validate schema, taxonomy, scaffolding leaks, internal links (the gate)",
  import: "Import content into Glint — e.g. `glint import wordpress --wxr <f>`",
  sync: "Pull latest engine templates into this site — safe, never touches brand data",
};

const handlers: Record<string, (args: string[]) => Promise<void>> = {
  onboard: runOnboard,
  init: runInit,
  new: runNew,
  status: runStatus,
  feedback: runFeedback,
  theme: runTheme,
  import: runImport,
  doctor: runDoctor,
  build: runBuild,
  preview: runPreview,
  sync: runSync,
};

function help(): void {
  console.log("\nGlint — the lightning publishing engine\n");
  console.log("Usage: glint <command> [options]\n\nCommands:");
  for (const [name, desc] of Object.entries(COMMANDS)) console.log(`  ${name.padEnd(10)} ${desc}`);
  console.log("");
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || cmd === "-h" || cmd === "--help") return help();
  const handler = handlers[cmd];
  if (!handler) {
    console.error(`Unknown command: ${cmd}\n`);
    help();
    process.exitCode = 1;
    return;
  }
  await handler(args);
}

void main();
