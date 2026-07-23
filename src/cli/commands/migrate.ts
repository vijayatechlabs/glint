import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/**
 * One-time migrations for existing brand sites.
 * `glint migrate indexnow` — register integration, scaffold GH workflow, patch twin headers.
 * Every-deploy submit: `glint indexnow --since-sha <cursor> --sha <deploy>`
 */
export async function runMigrate(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  const dryRun = args.includes("--dry-run");

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--") && a !== "--dry-run") {
      flags.set(a.slice(2), args[++i] ?? "");
    }
  }

  const dir = flags.get("dir") ?? process.cwd();
  const positional = args.filter((a) => !a.startsWith("--") && a !== flags.get(dir));
  // args like: indexnow --dir x  OR  --dir x indexnow
  const subCommand =
    positional.find((a) => a === "indexnow") ??
    (args[0] && !args[0].startsWith("--") ? args[0] : "");

  if (subCommand !== "indexnow") {
    console.error("Usage: glint migrate indexnow [--dir .] [--dry-run]");
    process.exitCode = 1;
    return;
  }

  console.log(`\nglint migrate indexnow → ${dir}${dryRun ? " (dry-run)" : ""}\n`);

  ensureSiteConfigMeasurement(dir, dryRun);
  patchAstroConfig(dir, dryRun);
  writeWorkflow(dir, dryRun);
  patchTwinRoutes(dir, dryRun);
  patchPostAlternates(dir, dryRun);

  console.log(`
Done.
Manual once:
  1. Fill analytics.ga4, verification.*, indexNow.key (+ keyPath) in data/site.config.ts
  2. Repo variable INDEXNOW_PREV_SHA = last successfully notified deploy SHA
  3. After each prod deploy: glint indexnow --since-sha $INDEXNOW_PREV_SHA --sha $CUR
     (GH workflow from migrate, or Coolify post-deploy)
  4. On IndexNow 200/202 only: advance INDEXNOW_PREV_SHA → $CUR
  migrate ≠ every deploy; submit command is: glint indexnow
`);
}

/** Insert analytics / verification / indexNow blocks if missing from site.config.ts. */
function ensureSiteConfigMeasurement(dir: string, dryRun: boolean): void {
  const configPath = join(dir, "data/site.config.ts");
  if (!existsSync(configPath)) {
    console.warn("No data/site.config.ts — skip measurement field scaffold.");
    return;
  }
  let src = readFileSync(configPath, "utf8");
  const original = src;

  const measurementBlock = `
  // ── Measurement & indexing (glint migrate indexnow) ───────────────────────
  analytics: {
    ga4: "",
    cloudflare: "",
  },
  verification: {
    google: "",
    bing: "",
  },
  indexNow: {
    key: "",
    keyPath: "root",
  },
`;

  const hasAnalytics = /analytics\s*:\s*\{/.test(src);
  const hasVerification = /verification\s*:\s*\{/.test(src);
  const hasIndexNow = /indexNow\s*:/.test(src);

  if (hasAnalytics && hasVerification && hasIndexNow) {
    console.log("site.config.ts already has analytics / verification / indexNow.");
    return;
  }

  // Prefer insert before final `} as const` of site export
  if (!hasAnalytics || !hasVerification || !hasIndexNow) {
    const insertParts: string[] = [];
    if (!hasAnalytics) {
      insertParts.push(`  analytics: {
    ga4: "",
    cloudflare: "",
  },`);
    }
    if (!hasVerification) {
      insertParts.push(`  verification: {
    google: "",
    bing: "",
  },`);
    }
    if (!hasIndexNow) {
      insertParts.push(`  indexNow: {
    key: "",
    keyPath: "root",
  },`);
    }
    const snippet = `\n  // Measurement & indexing (added by glint migrate indexnow)\n${insertParts.join("\n")}\n`;

    if (/\}\s*as\s*const\s*;/.test(src)) {
      src = src.replace(/\}\s*as\s*const\s*;/, `${snippet}} as const;`);
    } else if (/export const site = \{[\s\S]*\n\};\s*$/.test(src)) {
      src = src.replace(/\n\};\s*$/, `${snippet}};\n`);
    } else {
      console.warn(
        "Could not auto-insert measurement fields into site.config.ts — add analytics/verification/indexNow manually.",
      );
      console.warn(measurementBlock);
      return;
    }
  }

  if (src !== original) {
    if (dryRun) console.log(`[dry-run] would patch ${configPath} measurement fields`);
    else {
      writeFileSync(configPath, src, "utf8");
      console.log(`Patched ${configPath} with missing measurement fields (fill empty strings).`);
    }
  }
}

function patchAstroConfig(dir: string, dryRun: boolean): void {
  let configPath = "";
  for (const c of ["astro.config.mjs", "astro.config.ts", "astro.config.js"]) {
    const p = join(dir, c);
    if (existsSync(p)) {
      configPath = p;
      break;
    }
  }
  if (!configPath) {
    console.error("No astro.config found.");
    process.exitCode = 1;
    return;
  }

  const src = readFileSync(configPath, "utf8");
  let modified = src;

  const glintImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*["']@vijayatech\/glint["']/);
  if (glintImportMatch) {
    const imports = glintImportMatch[1]!.split(",").map((i) => i.trim()).filter(Boolean);
    if (!imports.includes("glintIndexNow")) {
      imports.push("glintIndexNow");
      modified = modified.replace(
        glintImportMatch[0],
        `import { ${imports.join(", ")} } from "@vijayatech/glint"`,
      );
    }
  } else if (!src.includes("glintIndexNow")) {
    modified = `import { glintIndexNow } from "@vijayatech/glint";\n` + modified;
  }

  const idx = modified.indexOf("integrations: [");
  if (idx !== -1 && !modified.includes("glintIndexNow(")) {
    let bracketCount = 1;
    let closeIdx = -1;
    for (let i = idx + "integrations: [".length; i < modified.length; i++) {
      if (modified[i] === "[") bracketCount++;
      if (modified[i] === "]") bracketCount--;
      if (bracketCount === 0) {
        closeIdx = i;
        break;
      }
    }
    if (closeIdx !== -1) {
      const content = modified.substring(idx + "integrations: [".length, closeIdx);
      const newContent = content.trim()
        ? `${content.trim().replace(/,$/, "")}, glintIndexNow()`
        : "glintIndexNow()";
      modified =
        modified.substring(0, idx + "integrations: [".length) +
        newContent +
        modified.substring(closeIdx);
    }
  } else if (idx === -1) {
    console.warn("Could not find integrations: [ — add glintIndexNow() manually.");
  }

  if (modified !== src) {
    if (dryRun) console.log(`[dry-run] would patch ${configPath}`);
    else {
      writeFileSync(configPath, modified, "utf8");
      console.log(`Patched ${configPath} with glintIndexNow()`);
    }
  } else {
    console.log("Astro config already has glintIndexNow.");
  }
}

function writeWorkflow(dir: string, dryRun: boolean): void {
  const workflowPath = join(dir, ".github/workflows/indexnow.yml");
  const content = generateWorkflow(dir);
  if (dryRun) {
    console.log(`[dry-run] would write ${workflowPath}`);
    return;
  }
  mkdirSync(dirname(workflowPath), { recursive: true });
  writeFileSync(workflowPath, content, "utf8");
  console.log(`Wrote ${workflowPath}`);
}

function generateWorkflow(dir: string): string {
  const isPnpm = existsSync(join(dir, "pnpm-lock.yaml"));
  const install = isPnpm
    ? `      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile`
    : existsSync(join(dir, "package-lock.json"))
      ? `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci`
      : `      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install`;

  const runCmd = isPnpm
    ? "pnpm exec glint indexnow --since-sha \"$PREV\" --sha \"$CUR\""
    : "npx glint indexnow --since-sha \"$PREV\" --sha \"$CUR\"";

  return `# Generated by: glint migrate indexnow
# Every deploy: glint indexnow (not migrate)
# Durable cursor: vars.INDEXNOW_PREV_SHA — refuse HEAD~1
# Advance cursor only after IndexNow HTTP 200/202

name: IndexNow

on:
  workflow_dispatch:
  repository_dispatch:
    types: [deploy-succeeded]

concurrency:
  group: indexnow-\${{ github.repository }}
  cancel-in-progress: false

jobs:
  indexnow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
${install}
      - name: IndexNow (git delta)
        env:
          PREV: \${{ vars.INDEXNOW_PREV_SHA }}
        run: |
          if [ "\${{ github.event_name }}" = "repository_dispatch" ]; then
            CUR="\${{ github.event.client_payload.sha }}"
            if [ -z "$CUR" ]; then CUR="\${{ github.event.client_payload.current_sha }}"; fi
          else
            CUR="\${{ github.sha }}"
          fi
          if [ -z "$PREV" ]; then
            echo "Set repository variable INDEXNOW_PREV_SHA (durable cursor)."
            exit 1
          fi
          if [ -z "$CUR" ]; then
            echo "Missing current sha"
            exit 1
          fi
          ${runCmd}
      - name: Cursor reminder
        if: success()
        run: echo "On 200/202 only: set INDEXNOW_PREV_SHA to this deploy SHA"
`;
}

/**
 * Patch twin routes toward Glint AEO headers.
 * Prefer `markdownTwinResponse` from `@vijayatech/glint`. Never downgrade
 * text/markdown → text/plain.
 */
function patchTwinRoutes(dir: string, dryRun: boolean): void {
  const markers = [
    "text/markdown",
    "X-Markdown-Tokens",
    "X-Robots-Tag",
    "X-AEO-Version",
    "X-Content-Type-Options",
  ];
  const candidates = [
    "src/pages/raw/blog/[slug].md.ts",
    "src/pages/raw/blog/[slug].md.js",
  ];
  for (const rel of candidates) {
    const p = join(dir, rel);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");

    if (src.includes("markdownTwinResponse") || src.includes("markdownTwinHeaders")) {
      console.log(`Twin route uses Glint AEO helper: ${rel}`);
      continue;
    }

    const missing = markers.filter((m) => !src.includes(m));
    if (missing.length === 0 && src.includes('rel="canonical"')) {
      console.log(`Twin route already has AEO headers: ${rel}`);
      continue;
    }

    // Best-effort: upgrade text/plain → text/markdown on simple Response shapes
    let next = src;
    if (next.includes("text/plain")) {
      next = next.replace(
        /["']Content-Type["']\s*:\s*["']text\/plain[^"']*["']/,
        '"Content-Type": "text/markdown; charset=utf-8"',
      );
    }

    if (next !== src && !dryRun) {
      writeFileSync(p, next, "utf8");
      console.log(`Upgraded twin Content-Type to text/markdown: ${rel}`);
    } else if (next !== src && dryRun) {
      console.log(`Would upgrade twin Content-Type to text/markdown: ${rel}`);
    }

    const stillMissing = markers.filter((m) => !next.includes(m));
    if (stillMissing.length > 0) {
      console.warn(
        `Twin route ${rel}: missing AEO headers (${stillMissing.join(", ")}). ` +
          `Prefer: import { markdownTwinResponse } from "@vijayatech/glint" ` +
          `(see engine template raw/blog/[slug].md.ts.tmpl and docs/AEO.md).`,
      );
    }
  }
}

function patchPostAlternates(dir: string, dryRun: boolean): void {
  const candidates = [
    "src/pages/blog/[slug].astro",
    "src/pages/[slug].astro",
  ];
  for (const rel of candidates) {
    const p = join(dir, rel);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    if (src.includes("markdownAlternate") || src.includes('type="text/markdown"')) {
      console.log(`Post alternate already present: ${rel}`);
      continue;
    }
    console.warn(
      `${rel}: add markdown twin alternate link (see engine theme post templates). Not auto-rewritten if brand-customized.`,
    );
    void dryRun;
  }
}
