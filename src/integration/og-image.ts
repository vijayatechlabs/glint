/**
 * `glintOgImage()` — build-time OG image generator.
 *
 * On `astro:build:done`, creates an SVG image per post at `/og/{slug}.svg`.
 * Each SVG contains the post title, brand, and date — styled for social cards.
 *
 * SVG is universally renderable and zero-dep. For PNG (required by Twitter/X),
 * add `@resvg/resvg-js` and the integration auto-converts.
 *
 * Falls back to `/og/default.svg` for non-post pages.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { splitFrontmatter } from "../lib/content.js";

export function glintOgImage(opts?: {
  brand?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}): {
  name: string;
  hooks: { "astro:build:done": (args: { dir: URL }) => Promise<void> };
} {
  const brand = opts?.brand ?? "";
  const bgColor = opts?.bgColor ?? "#1a1a2e";
  const textColor = opts?.textColor ?? "#ffffff";
  const accentColor = opts?.accentColor ?? "#e94560";

  return {
    name: "glint-og-image",
    hooks: {
      "astro:build:done": async ({ dir }: { dir: URL }) => {
        const outDir = dir.pathname;
        const ogDir = join(outDir, "og");
        mkdirSync(ogDir, { recursive: true });

        // Generate default OG image.
        writeFileSync(
          join(ogDir, "default.svg"),
          renderSvg(brand, "Latest posts", "", bgColor, textColor, accentColor),
          "utf8",
        );

        // Find content files and generate per-post OG images.
        const contentDir = findContentDir(outDir);
        if (!contentDir) return;

        const posts = findMarkdownFiles(contentDir);
        let count = 0;

        for (const { relPath, body } of posts) {
          const { data } = splitFrontmatter(body);
          if (data.draft === true) continue;

          const slug = extractSlug(relPath);
          if (!slug) continue;

          const title = String(data.title ?? slug);
          const date = data.publishedAt
            ? new Date(data.publishedAt as string | Date).toISOString().slice(0, 10)
            : "";

          writeFileSync(join(ogDir, `${slug}.svg`), renderSvg(brand, title, date, bgColor, textColor, accentColor), "utf8");
          count++;

          // Try PNG conversion if @resvg/resvg-js is available.
          await tryPngConversion(join(ogDir, `${slug}.svg`), join(ogDir, `${slug}.png`));
        }

        // Also convert default.
        await tryPngConversion(join(ogDir, "default.svg"), join(ogDir, "default.png"));

        if (count > 0) {
          console.log(`[glint-og-image] Generated ${count} OG image(s) in og/`);
        }
      },
    },
  };
}

function renderSvg(brandName: string, title: string, date: string, bg: string, text: string, accent: string): string {
  // Word-wrap the title to fit within 1200×630 viewport.
  const lines = wrapText(title, 45);
  const titleY = 280;
  const lineHeight = 58;

  const titleText = lines
    .map((line, i) => `<text x="80" y="${titleY + i * lineHeight}" font-size="48" font-weight="700" fill="${text}">${escapeXml(line)}</text>`)
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${bg}"/>
  <rect x="0" y="0" width="1200" height="8" fill="${accent}"/>
  <text x="80" y="120" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="${accent}" font-weight="600">${escapeXml(brandName)}</text>
  <g font-family="system-ui, -apple-system, sans-serif" fill="${text}">
    ${titleText}
  </g>
  ${date ? `<text x="80" y="560" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#8888aa">${escapeXml(date)}</text>` : ""}
</svg>`;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine && current) {
      lines.push(current.trim());
      current = word;
      if (lines.length >= 3) break; // Max 3 lines.
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current && lines.length < 3) lines.push(current.trim());

  // Truncate last line with ellipsis if we hit the limit.
  if (lines.length === 3 && words.length > lines.join(" ").split(/\s+/).length) {
    let last = lines[2]!;
    if (last.length > maxCharsPerLine - 3) last = last.slice(0, maxCharsPerLine - 3);
    lines[2] = last + "…";
  }

  return lines;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function findContentDir(outDir: string): string | null {
  // Walk up from dist to find content/ sibling.
  let dir = outDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, "content");
    if (existsSync(candidate)) return candidate;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function findMarkdownFiles(contentDir: string): Array<{ relPath: string; body: string }> {
  const results: Array<{ relPath: string; body: string }> = [];
  try {
    const entries = readdirSync(contentDir, { recursive: true }) as string[];
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const fullPath = join(contentDir, entry);
      results.push({ relPath: entry, body: readFileSync(fullPath, "utf8") });
    }
  } catch {
    /* ignore */
  }
  return results;
}

function extractSlug(relPath: string): string {
  const parts = relPath.split(/[\\/]/);
  const file = parts[parts.length - 1] ?? "";
  return file.replace(/\.md$/, "");
}

async function tryPngConversion(svgPath: string, pngPath: string): Promise<void> {
  try {
    // Optional dependency — only convert if available.
    // @ts-expect-error — optional peer dep, not in engine's package.json
    const resvgModule = await import("@resvg/resvg-js").catch(() => null);
    if (!resvgModule) return;
    const resvg = resvgModule as { render: (svg: string, opts: Record<string, unknown>) => { asPng: () => Buffer } };
    const svg = readFileSync(svgPath, "utf8");
    const pngData = resvg.render(svg, { fitTo: { mode: "width", value: 1200 } });
    writeFileSync(pngPath, pngData.asPng());
  } catch {
    /* PNG conversion failed or not available — SVG is fine */
  }
}
