/**
 * `glint theme pull --tailwind <path> [--dir .]`   (repo mode)
 * `glint theme pull --css <path> [--dir .]`         (CSS vars mode)
 *
 * Detector for the blend: best-effort extraction of brand tokens (font + colors)
 * from an app's Tailwind config or a CSS file, written to public/theme.css. This
 * is a DRAFT to confirm — onboarding's "detect → confirm" philosophy. Structural
 * CSS is untouched (it lives in the theme's base.css).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

interface Tokens {
  bg?: string;
  fg?: string;
  muted?: string;
  border?: string;
  brand?: string;
  brandHover?: string;
  fontSans?: string;
  found: string[];
}

const isDark = (hex: string): boolean => {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r! + 0.587 * g! + 0.114 * b! < 70; // perceived luminance
};

/** Pull tokens out of a Tailwind config's text (no eval — heuristic + safe). */
function fromTailwind(src: string): Tokens {
  const t: Tokens = { found: [] };

  const font = src.match(/\bsans\s*:\s*\[\s*([^\],]+)/);
  if (font) {
    t.fontSans = font[1]!.trim().replace(/^['"]|['"]$/g, "");
    t.found.push("font-sans");
  }

  // collect "key": "#hex" pairs
  const colors = new Map<string, string>();
  for (const m of src.matchAll(/['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*['"](#[0-9a-fA-F]{3,8})['"]/g)) {
    colors.set(m[1]!.toLowerCase(), m[2]!);
  }

  // brand: prefer semantic keys, then a "500" shade, then first vivid color
  const brandKey = ["primary", "brand", "accent", "info", "500"].find((k) =>
    [...colors.keys()].some((c) => c === k || c.endsWith(`-${k}`) || c.includes(k)),
  );
  if (brandKey) {
    const key = [...colors.keys()].find((c) => c === brandKey || c.endsWith(`-${brandKey}`) || c.includes(brandKey))!;
    t.brand = colors.get(key);
    t.found.push(`brand(${key})`);
  }
  if (!t.brand && colors.size) {
    t.brand = [...colors.values()].find((v) => !isDark(v) && !/^#(f{3,6}|0{3,6})$/i.test(v)) ?? [...colors.values()][0];
    if (t.brand) t.found.push("brand(first)");
  }

  // dark background hint
  const bgKey = [...colors.keys()].find((k) => /near-black|background|^bg$|^dark$|^base$/.test(k));
  const bg = bgKey ? colors.get(bgKey) : undefined;
  if (bg && isDark(bg)) {
    t.bg = bg;
    t.fg = "#e2e8f0";
    t.muted = "#94a3b8";
    t.border = "#1e293b";
    t.found.push(`dark-theme(${bgKey})`);
  }
  return t;
}

function fromCss(src: string): Tokens {
  const t: Tokens = { found: [] };
  const grab = (re: RegExp) => src.match(re)?.[1]?.trim();
  t.brand = grab(/--(?:brand|primary|accent)[^:]*:\s*([^;]+);/i);
  t.bg = grab(/--(?:bg|background)[^:]*:\s*([^;]+);/i);
  t.fg = grab(/--(?:fg|foreground|text)[^:]*:\s*([^;]+);/i);
  t.fontSans = grab(/font-family:\s*([^;]+);/i);
  for (const k of ["brand", "bg", "fg", "fontSans"] as const) if (t[k]) t.found.push(k);
  return t;
}

export async function runTheme(args: string[]): Promise<void> {
  const [sub, ...rest] = args;
  if (sub !== "pull") {
    console.error("Usage: glint theme pull --tailwind <path> | --css <path> [--dir .]");
    process.exitCode = 1;
    return;
  }
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a?.startsWith("--")) flags.set(a.slice(2), rest[++i] ?? "");
  }
  const dir = flags.get("dir") ?? process.cwd();
  const tw = flags.get("tailwind");
  const css = flags.get("css");
  const source = tw ?? css;
  if (!source || !existsSync(source)) {
    console.error(`Source not found. Pass --tailwind <tailwind.config.js> or --css <file>.`);
    process.exitCode = 1;
    return;
  }

  const src = readFileSync(source, "utf8");
  const t = tw ? fromTailwind(src) : fromCss(src);

  const v = {
    bg: t.bg ?? "#ffffff",
    fg: t.fg ?? "#1a1a1a",
    muted: t.muted ?? "#6b7280",
    border: t.border ?? "#e5e7eb",
    brand: t.brand ?? "#2563eb",
    brandHover: t.brandHover ?? t.brand ?? "#1d4ed8",
    fontSans: t.fontSans ? `${t.fontSans}, system-ui, sans-serif` : "system-ui, -apple-system, sans-serif",
  };

  const out = join(dir, "public", "theme.css");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `/* Brand tokens — pulled from ${tw ? "tailwind.config" : "css"} (${source}).
   DRAFT: confirm the values, then commit. Re-run \`glint theme pull\` to refresh. */
:root {
  --bg: ${v.bg};
  --fg: ${v.fg};
  --muted: ${v.muted};
  --border: ${v.border};
  --brand: ${v.brand};
  --brand-hover: ${v.brandHover};
  --font-sans: ${v.fontSans};
  --maxw: 720px;
  --radius: 8px;
}
`,
  );

  console.log(`\n✓ wrote ${out}`);
  console.log(`  detected: ${t.found.length ? t.found.join(", ") : "nothing — using defaults"}`);
  console.log(`  brand=${v.brand}  bg=${v.bg}  font=${v.fontSans.split(",")[0]}`);
  console.log(`  → review the draft; tweak in public/theme.css if needed.\n`);
}
