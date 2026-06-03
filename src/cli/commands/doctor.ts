/**
 * `glint doctor [--dir .]` — the pre-merge quality gate (see BLOG-SPEC §9).
 *
 * Validates every post against the framework's promises and exits non-zero on any
 * ERROR (so CI / the PR gate fails). Checks: schema validity, leaked scaffolding,
 * taxonomy-registry compliance, duplicate slugs, and broken internal links.
 * WARNINGs (e.g. unknown tag, missing cover) don't fail the build.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { glintSchemas, type GlintCollection } from "../../content/schema.js";
import { listPosts, parseCategories, parseTags } from "../../lib/content.js";
import { lineIsScaffolding } from "../../lib/scaffolding.js";

// Template files that should be filled at onboarding, with markers that mean
// "still a placeholder". A site with these unfilled isn't ready to publish.
const TEMPLATE_FILES: Array<{ file: string; markers: RegExp[] }> = [
  { file: "data/content-strategy.md", markers: [/<[^>\n]*\s[^>\n]*>/, /Replace with real pillars/i] },
  { file: "docs/brand-voice.md", markers: [/<[^>\n]*\s[^>\n]*>/, /^>\s*TEMPLATE\b/im] },
  { file: "data/categories.md", markers: [/Example Category/i, /\bexample-category\b/] },
  { file: "data/tags.md", markers: [/\bexample-tag\b/] },
];

type Severity = "ERROR" | "WARN";
interface Finding {
  file: string;
  severity: Severity;
  msg: string;
}

const KNOWN_COLLECTIONS = ["blog", "case-studies", "news", "events", "profiles"];

export async function runDoctor(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
  }
  const dir = flags.get("dir") ?? process.cwd();

  const posts = listPosts(dir);
  const categories = parseCategories(dir);
  const tags = parseTags(dir);
  const findings: Finding[] = [];
  const add = (file: string, severity: Severity, msg: string) => findings.push({ file, severity, msg });

  // valid published paths for internal-link resolution: /<collection>/<slug>
  // Drafts are intentionally excluded — a published post must not link to a draft
  // (the draft is invisible in production, creating a real 404).
  const validPaths = new Set(
    posts.filter((p) => p.data.draft !== true).map((p) => `/${p.collection}/${p.slug}`),
  );
  const slugSeen = new Map<string, string>(); // collection/slug -> file

  for (const p of posts) {
    // 1. schema validity
    const schema = (glintSchemas as Record<string, { safeParse: (d: unknown) => { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } } }>)[p.collection];
    if (!schema) {
      add(p.file, "WARN", `unknown collection "${p.collection}" (no schema)`);
    } else {
      const res = schema.safeParse(p.data);
      if (!res.success) {
        for (const issue of res.error!.issues) {
          add(p.file, "ERROR", `schema: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
        }
      }
    }

    // 2. duplicate slug within a collection
    const key = `${p.collection}/${p.slug}`;
    if (slugSeen.has(key)) add(p.file, "ERROR", `duplicate slug "${p.slug}" (also ${slugSeen.get(key)})`);
    else slugSeen.set(key, p.file);

    // 3. leaked scaffolding in the body
    if (p.body.split("\n").some(lineIsScaffolding)) {
      add(p.file, "ERROR", "leaked AI scaffolding in body (Meta Description:/SEO Slug:/Alt Text:/…)");
    }

    // 4. taxonomy registry compliance
    const cat = p.data.category as string | undefined;
    if (cat && categories.size && !categories.has(cat)) {
      add(p.file, "WARN", `category "${cat}" not in data/categories.md`);
    }
    const postTags = Array.isArray(p.data.tags) ? (p.data.tags as string[]) : [];
    for (const t of postTags) {
      if (tags.size && !tags.has(t)) add(p.file, "WARN", `tag "${t}" not in data/tags.md`);
    }
    if (!p.data.cover && KNOWN_COLLECTIONS.includes(p.collection) && p.collection !== "profiles") {
      add(p.file, "WARN", "no cover image");
    }

    // 5. broken internal links (best-effort: links to /<collection>/<slug>)
    for (const m of p.body.matchAll(/\]\((\/[a-z0-9/_-]+)\)/gi)) {
      const target = m[1]!.replace(/\/$/, "");
      const looksLikePost = new RegExp(`^/(${KNOWN_COLLECTIONS.join("|")})/`).test(target);
      if (looksLikePost && !validPaths.has(target)) {
        // ERROR: broken links create real 404s in production. Drafts are excluded
        // from validPaths intentionally — linking to a draft is a broken link.
        add(p.file, "ERROR", `broken internal link to "${m[1]}" — not found among published posts (is the target a draft or does the slug not exist?)`);
      }
    }
  }

  // 6. onboarding completeness: template files still carrying placeholders
  // If ANY non-draft post exists the site is intended to publish, so unfilled
  // brand strategy/voice files block the gate (ERROR). While everything is still
  // in draft it stays a WARN — fine to be setting up.
  const hasPublishedPosts = posts.some((p) => p.data.draft !== true);
  for (const { file, markers } of TEMPLATE_FILES) {
    const p = join(dir, file);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    if (markers.some((re) => re.test(text))) {
      const sev: Severity = hasPublishedPosts ? "ERROR" : "WARN";
      add(
        file,
        sev,
        hasPublishedPosts
          ? "brand placeholder not filled — blocks publishing (run `glint onboard` or edit it)"
          : "still has template placeholders — fill it before publishing (run `glint onboard` or edit it)",
      );
    }
  }

  // report
  const errors = findings.filter((f) => f.severity === "ERROR");
  const warns = findings.filter((f) => f.severity === "WARN");
  console.log(`\nglint doctor — ${dir}\n  ${posts.length} posts checked\n`);
  if (findings.length === 0) {
    console.log("  ✓ no issues\n");
  } else {
    const byFile = new Map<string, Finding[]>();
    for (const f of findings) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
    for (const [file, fs] of byFile) {
      console.log(`  ${file}`);
      for (const f of fs) console.log(`    ${f.severity === "ERROR" ? "✗" : "•"} ${f.severity}: ${f.msg}`);
    }
    console.log("");
  }
  console.log(`  ${errors.length} error(s), ${warns.length} warning(s).\n`);
  if (errors.length) process.exitCode = 1;
}
