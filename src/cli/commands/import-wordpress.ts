/**
 * `glint import wordpress --wxr <export.xml> --out <repo-root> [--collection blog] [--base /blog]`
 *
 * Thin CLI wrapper around the reusable importer in ../../import/wordpress.ts.
 */
import { importWordpress } from "../../import/wordpress.js";

function parseFlags(args: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
  }
  return flags;
}

export async function runImport(args: string[]): Promise<void> {
  const [platform, ...rest] = args;
  if (platform !== "wordpress") {
    console.error(`Unknown import source "${platform}". Supported: wordpress`);
    process.exitCode = 1;
    return;
  }

  const flags = parseFlags(rest);
  const wxr = flags.get("wxr");
  const out = flags.get("out");
  if (!wxr || !out) {
    console.error("Usage: glint import wordpress --wxr <export.xml> --out <repo-root>");
    process.exitCode = 1;
    return;
  }

  const result = await importWordpress({
    wxr,
    outRoot: out,
    collection: flags.get("collection") ?? "blog",
    base: flags.get("base") ?? "/blog",
  });

  console.log(`\n✓ Imported ${result.posts} posts as drafts.`);
  console.log(`  redirects: ${result.redirects} → redirects.json`);
  console.log(`  media: ${result.mediaDownloaded} downloaded${result.mediaFailed.length ? `, ${result.mediaFailed.length} failed` : ""}`);
  if (result.mediaFailed.length) {
    for (const f of result.mediaFailed) console.log(`    ✗ ${f}`);
  }
  console.log(`  audit report → docs/CONTENT-AUDIT.md\n`);
}
