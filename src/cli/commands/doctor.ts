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
  let strict = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--strict") {
      strict = true;
    } else if (a?.startsWith("--")) {
      flags.set(a.slice(2), args[++i] ?? "");
    }
  }
  const dir = flags.get("dir") ?? process.cwd();
  const warnSeverity: Severity = strict ? "ERROR" : "WARN";

  const posts = listPosts(dir);
  const hasPublishedPosts = posts.some((p) => p.data.draft !== true);
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
      add(p.file, warnSeverity, `category "${cat}" not in data/categories.md`);
    }
    const postTags = Array.isArray(p.data.tags) ? (p.data.tags as string[]) : [];
    for (const t of postTags) {
      if (tags.size && !tags.has(t)) add(p.file, warnSeverity, `tag "${t}" not in data/tags.md`);
    }
    if (!p.data.cover && KNOWN_COLLECTIONS.includes(p.collection) && p.collection !== "profiles") {
      add(p.file, warnSeverity, "no cover image");
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

    // 6. referenced local images exist; inline images have alt text. Root-absolute
    // paths (/media/…) map to the site's public/ dir; external (http/s3/data) skipped.
    const missingImage = (src: unknown): boolean =>
      typeof src === "string" && src.startsWith("/") && !existsSync(join(dir, "public", src));
    const cover = p.data.cover as { src?: string } | undefined;
    if (cover?.src && missingImage(cover.src)) add(p.file, warnSeverity, `cover image not found: public${cover.src}`);
    if (Array.isArray(p.data.images)) {
      for (const im of p.data.images as Array<{ src?: string }>) {
        if (im?.src && missingImage(im.src)) add(p.file, warnSeverity, `image not found: public${im.src}`);
      }
    }
    for (const m of p.body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)) {
      const alt = m[1]!.trim();
      const src = m[2]!;
      if (!alt) add(p.file, warnSeverity, `inline image missing alt text: ${src}`);
      if (missingImage(src)) add(p.file, warnSeverity, `inline image not found: public${src}`);
    }
  }

  // 7. analytics + verification + IndexNow: warn when published sites are flying blind.
  // Reads site.config.ts as text (avoids importing TS at runtime).
  if (hasPublishedPosts) {
    const configPath = join(dir, "data/site.config.ts");
    if (existsSync(configPath)) {
      const configText = readFileSync(configPath, "utf8");

      const analyticsBlock = configText.match(/analytics\s*:\s*\{([\s\S]*?)\}/);
      const ga4Match = analyticsBlock?.[1]?.match(/ga4\s*:\s*["'`]([^"'`]*)["'`]/);
      if (!ga4Match || ga4Match[1] === "") {
        add(
          "data/site.config.ts",
          "WARN",
          "analytics.ga4 not configured — organic + AI traffic is invisible. Set GA4 Measurement ID (G-XXXXXXXX). Run `glint migrate indexnow` to scaffold missing measurement fields.",
        );
      }

      const verificationBlock = configText.match(/verification\s*:\s*\{([\s\S]*?)\}/);
      const googleMatch = verificationBlock?.[1]?.match(/google\s*:\s*["'`]([^"'`]*)["'`]/);
      if (!googleMatch || googleMatch[1] === "") {
        add(
          "data/site.config.ts",
          "WARN",
          "verification.google is empty — OK if Search Console is verified via DNS only; otherwise set the GSC meta-tag token (or document DNS verification in brand ops).",
        );
      }

      const indexNowMatch = configText.match(/indexNow\s*:\s*(\{[\s\S]*?\}|["'`]([^"'`]*)["'`])/);
      let indexNowKey = "";
      let indexNowKeyPath = "root";
      if (indexNowMatch) {
        const block = indexNowMatch[1]!;
        if (block.startsWith("{")) {
          const keyM = block.match(/key\s*:\s*["'`]([^"'`]+)["'`]/);
          if (keyM) indexNowKey = keyM[1]!;
          const pathM = block.match(/keyPath\s*:\s*["'`](root|base)["'`]/);
          if (pathM) indexNowKeyPath = pathM[1]!;
        } else {
          indexNowKey = indexNowMatch[2] ?? "";
        }
      }

      const mountMatch = configText.match(/mount\s*:\s*["'`]([^"'`]*)["'`]/);
      const mount = mountMatch ? mountMatch[1]! : "";
      const deployTargetMatch = configText.match(/deployTarget\s*:\s*["'`]([^"'`]+)["'`]/);
      const deployTarget = (deployTargetMatch?.[1] ?? "").toLowerCase();

      if (!indexNowKey) {
        add(
          "data/site.config.ts",
          "WARN",
          "IndexNow key is empty — engines won't get post-deploy URL notifies. Set indexNow.key (8–128 [A-Za-z0-9-]).",
        );
      } else if (!/^[A-Za-z0-9-]{8,128}$/.test(indexNowKey)) {
        add(
          "data/site.config.ts",
          "ERROR",
          `IndexNow key "${indexNowKey}" is invalid. Must be 8–128 alphanumeric characters/hyphens.`,
        );
      }

      if (mount && mount !== "/" && indexNowKeyPath === "root") {
        add(
          "data/site.config.ts",
          "WARN",
          `IndexNow keyPath is "root" but mount is "${mount}". Root key must be served at https://<domain>/{key}.txt by the parent host; otherwise set keyPath: "base".`,
        );
      }

      let configExists = false;
      let configHasIntegration = false;
      for (const cfg of ["astro.config.mjs", "astro.config.ts", "astro.config.js"]) {
        const cfgPath = join(dir, cfg);
        if (existsSync(cfgPath)) {
          configExists = true;
          if (readFileSync(cfgPath, "utf8").includes("glintIndexNow")) configHasIntegration = true;
          break;
        }
      }
      if (configExists && !configHasIntegration) {
        add(
          "astro.config",
          "WARN",
          "glintIndexNow integration is not registered. Run `glint migrate indexnow`.",
        );
      }

      // Post-deploy path: GH workflow OR Coolify (or other) post-deploy is fine.
      const workflowPath = join(dir, ".github/workflows/indexnow.yml");
      const hasWorkflow = existsSync(workflowPath);
      const coolifyStyle = deployTarget === "coolify" || deployTarget.includes("coolify");
      if (!hasWorkflow && !coolifyStyle) {
        add(
          ".github/workflows/indexnow.yml",
          "WARN",
          "No IndexNow post-deploy hook found. Run `glint migrate indexnow` for a GH workflow, or wire Coolify/host post-deploy: glint indexnow --since-sha $PREV --sha $CUR.",
        );
      } else if (!hasWorkflow && coolifyStyle) {
        add(
          "data/site.config.ts",
          "WARN",
          "deployTarget is coolify — ensure Coolify post-deploy runs `glint indexnow --since-sha <cursor> --sha <deploy>` (GH workflow optional).",
        );
      }
    }
  }

  // 6. onboarding completeness: template files still carrying placeholders
  // If ANY non-draft post exists the site is intended to publish, so unfilled
  // brand strategy/voice files block the gate (ERROR). While everything is still
  // in draft it stays a WARN — fine to be setting up.
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
