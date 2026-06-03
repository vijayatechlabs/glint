#!/usr/bin/env -S npx tsx
/**
 * Glint CLI.
 *
 * Thin command router. Commands are intentionally small wrappers — the real
 * work lives in ./commands/* so each is independently testable and reusable
 * from the agent toolkit (Phase 1) as well as the terminal.
 */
const COMMANDS = {
  init: "Analyse a repo, detect its state (fresh/migration/adopt), print a plan",
  new: "Scaffold/complete a brand site's structure + agent files (idempotent)",
  status: "Content board — list every post by status (draft/scheduled/published)",
  feedback: "Record structured feedback for the engine (projects never edit Glint)",
  build: "Build static HTML + JSON/MD content API + AEO surface",
  preview: "Preview the built site locally",
  doctor: "Validate schema, alt text, and internal links (the pre-merge gate)",
  import: "Import content into Glint — e.g. `glint import wordpress <url>`",
} as const;

function help(): void {
  console.log("\nGlint — the lightning publishing engine\n");
  console.log("Usage: glint <command> [options]\n\nCommands:");
  for (const [name, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(10)} ${desc}`);
  }
  console.log("");
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case "init": {
      const { runInit } = await import("./commands/init.js");
      await runInit(args);
      break;
    }
    case "new": {
      const { runNew } = await import("./commands/new.js");
      await runNew(args);
      break;
    }
    case "status": {
      const { runStatus } = await import("./commands/status.js");
      await runStatus(args);
      break;
    }
    case "feedback": {
      const { runFeedback } = await import("./commands/feedback.js");
      await runFeedback(args);
      break;
    }
    case "import": {
      const { runImport } = await import("./commands/import-wordpress.js");
      await runImport(args);
      break;
    }
    case "doctor": {
      const { runDoctor } = await import("./commands/doctor.js");
      await runDoctor(args);
      break;
    }
    case "build": {
      const { runBuild } = await import("./commands/build.js");
      await runBuild(args);
      break;
    }
    case "preview": {
      const { runPreview } = await import("./commands/build.js");
      await runPreview(args);
      break;
    }
    case "-h":
    case "--help":
    case undefined:
      help();
      break;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      help();
      process.exitCode = 1;
  }
}

void main();
