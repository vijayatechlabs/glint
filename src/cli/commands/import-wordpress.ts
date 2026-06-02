/**
 * glint import wordpress — the reusable WordPress → Glint migrator.
 *
 * First consumer: naam.one (blog.naam.one). Every future WP client migration
 * reuses this command, so it is built generic from the start.
 *
 * Pipeline (see ARCHITECTURE §11 "Phase 0 — naam.one WordPress migration"):
 *   1. Source    — read content via WXR export file OR the WP REST API
 *   2. Transform — map WP posts/pages → content/<collection>/<slug>.md with
 *                  the Glint frontmatter contract
 *   3. Media     — download wp-content/uploads → object store → rewrite refs
 *   4. URLs      — preserve old slugs; emit redirects.json for any changes
 *   5. Verify    — handed to `glint doctor` (schema + links + alt text)
 *
 * This file currently parses args and prints the resolved plan. The pull +
 * transform implementation is the immediate next step once naam-blog exists.
 */

type ImportSource =
  | { kind: "wxr"; file: string }
  | { kind: "rest"; baseUrl: string };

interface ImportOptions {
  source: ImportSource;
  outDir: string;
  collection: string; // target Glint collection, e.g. "case-studies" | "blog"
}

function parseArgs(args: string[]): ImportOptions {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
  }

  const file = flags.get("wxr");
  const baseUrl = flags.get("rest");
  if (!file && !baseUrl) {
    throw new Error(
      "Provide a source: --wxr <export.xml> OR --rest <https://blog.example.com>",
    );
  }

  return {
    source: file ? { kind: "wxr", file } : { kind: "rest", baseUrl: baseUrl! },
    outDir: flags.get("out") ?? "content",
    collection: flags.get("collection") ?? "blog",
  };
}

export async function runImport(args: string[]): Promise<void> {
  const [platform, ...rest] = args;
  if (platform !== "wordpress") {
    console.error(`Unknown import source "${platform}". Supported: wordpress`);
    process.exitCode = 1;
    return;
  }

  const opts = parseArgs(rest);
  console.log("glint import wordpress — resolved plan:");
  console.log(JSON.stringify(opts, null, 2));
  console.log(
    "\n[next] implement steps 1–4: pull → transform → media → redirects.\n" +
      "Source for naam.one: blog.naam.one (WXR export or /wp-json/wp/v2).",
  );
  // TODO(Phase 0): implement the pull/transform/media/redirect pipeline.
}
