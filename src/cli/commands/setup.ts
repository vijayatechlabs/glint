/**
 * `glint setup indexing` — guided one-time setup for Google Web Search Indexing API.
 *
 * Prints step-by-step instructions, validates the service account key file,
 * optionally writes the key path into site.config.ts and adds the key to .gitignore.
 *
 * Usage:
 *   glint setup indexing [--dir .]
 */
import { join } from "node:path";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import {
  readGoogleIndexingConfig,
  loadServiceAccountKey,
  validateAuth,
} from "../../lib/google-indexing.js";

const SETUP_GUIDE = `
╔══════════════════════════════════════════════════════════════╗
║  Google Indexing API — Limited scope (read first)           ║
╚══════════════════════════════════════════════════════════════╝

WARNING: Google documents the Web Search Indexing API for pages with
JobPosting or BroadcastEvent structured data ONLY — not general
BlogPosting / article URLs. Glint blogs should NOT use this for posts.

For Google discovery on blogs use instead:
  • Submit sitemap-index.xml in Google Search Console
  • Sitemap <lastmod> (glintSitemapLastmod)
  • URL Inspection on important pages
  • IndexNow for Bing / Yandex / Naver: glint indexnow

\`glint index\` refuses to run without --force for this reason.

Only continue if you have JobPosting/BroadcastEvent content (not typical
Glint blogs). Then:

── PREREQUISITES (supported content types only) ───────────────

  1. Create a GCP project:
     → https://console.cloud.google.com/projectcreate

  2. Enable the "Web Search Indexing API":
     → https://console.cloud.google.com/apis/library/indexing.googleapis.com

  3. Create a Service Account + JSON key:
     → https://console.cloud.google.com/iam-admin/serviceaccounts

  4. In Google Search Console → Users and permissions:
     → Add the service account email as an OWNER of your property
     (client_email in the JSON key). GSC property ownership is what
     matters for this API — not GCP project Owner alone.

  5. Save the JSON key under e.g. ./secrets/ (gitignored).

── READY? ─────────────────────────────────────────────────────

  • Path to the service account JSON key
  • Confirmed JobPosting/BroadcastEvent (not BlogPosting-only)

`;

export async function runSetup(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--")) {
      flags.set(a.slice(2), args[++i] ?? "");
    }
  }

  // Only handle "indexing" sub-command for now.
  const subcommand = args[0] && !args[0].startsWith("--") ? args[0] : flags.get("type") ?? "indexing";
  if (subcommand !== "indexing") {
    console.log(`Unknown setup type: ${subcommand}. Available: indexing`);
    return;
  }

  const dir = flags.get("dir") ?? process.cwd();

  // Print the guide.
  console.log(SETUP_GUIDE);

  // Check current config state.
  const giConfig = readGoogleIndexingConfig_safe(dir);
  if (giConfig?.serviceAccountKey) {
    console.log(`Current config: googleIndexing.serviceAccountKey = "${giConfig.serviceAccountKey}"`);
  } else {
    console.log("Current config: googleIndexing.serviceAccountKey is not set.\n");
  }

  // Ask for key path.
  const keyPathArg = flags.get("key");
  let keyPath = keyPathArg ?? "";

  if (!keyPath) {
    // Try common locations.
    const candidates = [
      "./secrets/gsc-indexing.json",
      "./secrets/google-indexing.json",
      "./gsc-indexing.json",
    ];
    for (const c of candidates) {
      const resolved = c.startsWith("/") ? c : join(dir, c);
      if (existsSync(resolved)) {
        console.log(`Found key file at: ${c}`);
        keyPath = c;
        break;
      }
    }
  }

  if (!keyPath) {
    console.log(
      "No service account key file found in common locations.\n" +
        "Download the JSON key from GCP and place it in your project.\n" +
        "Then run: glint setup indexing --key ./secrets/gsc-indexing.json\n",
    );
    return;
  }

  // Validate the key file.
  console.log(`\nValidating key file: ${keyPath}`);
  const sa = loadServiceAccountKey(keyPath, dir);
  if (!sa) {
    console.error(
      `ERROR: Key file is invalid or missing required fields (private_key, client_email).\n` +
        `       Path: ${keyPath}`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`  Project: ${sa.project_id}`);
  console.log(`  Email:   ${sa.client_email}`);

  // Test auth.
  console.log("\nTesting authentication…");
  try {
    const email = await validateAuth(sa);
    console.log(`  ✓ Auth OK — authenticated as ${email}`);
  } catch (err) {
    console.error(`  ✗ Auth failed: ${(err as Error).message}`);
    console.error(
      "\n  Possible causes:\n" +
        "  • Web Search Indexing API not enabled in GCP\n" +
        "  • Service account doesn't have Owner role on the GSC property\n" +
        "  • Private key is corrupted\n",
    );
    process.exitCode = 1;
    return;
  }

  // Write key path to site.config.ts if not already set.
  const configPath = join(dir, "data/site.config.ts");
  if (existsSync(configPath)) {
    const configText = readFileSync(configPath, "utf8");
    const currentKeyMatch = configText.match(
      /googleIndexing\s*:\s*\{[\s\S]*?serviceAccountKey\s*:\s*["'`]([^"'`]*)["'`]/,
    );
    const currentKey = currentKeyMatch?.[1] ?? "";

    if (!currentKey || currentKey !== keyPath) {
      console.log(`\nUpdating data/site.config.ts → googleIndexing.serviceAccountKey = "${keyPath}"`);
      let updated: string;
      if (currentKey) {
        // Replace existing value.
        updated = configText.replace(
          /(googleIndexing\s*:\s*\{[\s\S]*?serviceAccountKey\s*:\s*["'`])([^"'`]*)(["'`])/,
          `$1${keyPath}$3`,
        );
      } else if (configText.includes("googleIndexing")) {
        // Block exists but key is empty.
        updated = configText.replace(
          /(googleIndexing\s*:\s*\{[\s\S]*?serviceAccountKey\s*:\s*["'`])(["'`])/,
          `$1${keyPath}$2`,
        );
      } else {
        console.log("  (googleIndexing block not found in config — add it manually)");
        updated = configText;
      }

      if (updated !== configText) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(configPath, updated, "utf8");
        console.log("  ✓ Config updated.");
      }
    } else {
      console.log(`\nConfig already points to "${keyPath}" — no change needed.`);
    }
  }

  // Add key file to .gitignore.
  const gitignorePath = join(dir, ".gitignore");
  const keyRelative = keyPath.replace(/^\.\//, "");
  if (existsSync(gitignorePath)) {
    const gitignoreText = readFileSync(gitignorePath, "utf8");
    if (!gitignoreText.includes(keyRelative)) {
      console.log(`\nAdding "${keyRelative}" to .gitignore`);
      appendFileSync(gitignorePath, `\n# Google Indexing API service account key\n${keyRelative}\n`, "utf8");
      console.log("  ✓ .gitignore updated.");
    } else {
      console.log(`\n.gitignore already contains "${keyRelative}" — no change needed.`);
    }
  }

  // Summary.
  console.log("\n" + "─".repeat(60));
  console.log("  ✓ Google Indexing API setup complete!\n");
  console.log("  Next steps:");
  console.log("    1. Ensure the SA email is added as Owner in Google Search Console");
  console.log("    2. Test: glint index --dry-run --bootstrap");
  console.log("    3. Add to your post-deploy pipeline alongside glint indexnow:");
  console.log("       glint index --since-sha $PREV_SHA --sha $CUR_SHA");
  console.log("");
}

function readGoogleIndexingConfig_safe(
  dir: string,
): { serviceAccountKey: string } | null {
  const configPath = join(dir, "data/site.config.ts");
  if (!existsSync(configPath)) return null;
  const text = readFileSync(configPath, "utf8");
  const blockMatch = text.match(/googleIndexing\s*:\s*\{([\s\S]*?)\}/);
  if (!blockMatch) return null;
  const keyMatch = blockMatch[1]!.match(/serviceAccountKey\s*:\s*["'`]([^"'`]*)["'`]/);
  return { serviceAccountKey: keyMatch ? keyMatch[1]! : "" };
}
