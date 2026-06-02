/**
 * `glint status [--dir .]`
 *
 * The content board — the "see and manage" view from BLOG-SPEC.md. Reads every
 * post's frontmatter and classifies it the git-native way:
 *   draft:true → DRAFT · future publishedAt → SCHEDULED · else → PUBLISHED.
 * ("Pending review" is an open PR — not a file state — so it's noted, not listed.)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

type Status = "DRAFT" | "SCHEDULED" | "PUBLISHED";

interface Row {
  status: Status;
  title: string;
  category: string;
  date: string;
  file: string;
}

function frontmatter(md: string): Record<string, unknown> {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  try {
    return (parse(m[1]!) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

export async function runStatus(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
  }
  const dir = flags.get("dir") ?? process.cwd();
  const contentDir = join(dir, "content");
  if (!existsSync(contentDir)) {
    console.error(`No content/ directory in ${dir}. Run \`glint new\` first.`);
    process.exitCode = 1;
    return;
  }

  const now = Date.now();
  const rows: Row[] = [];
  for (const entry of readdirSync(contentDir, { recursive: true }) as string[]) {
    if (!entry.endsWith(".md")) continue;
    const fm = frontmatter(readFileSync(join(contentDir, entry), "utf8"));
    const draft = fm.draft === true;
    const published = fm.publishedAt ? new Date(String(fm.publishedAt)).getTime() : 0;
    const status: Status = draft ? "DRAFT" : published > now ? "SCHEDULED" : "PUBLISHED";
    rows.push({
      status,
      title: String(fm.title ?? entry),
      category: String(fm.category ?? "—"),
      date: fm.publishedAt ? String(fm.publishedAt).slice(0, 10) : "—",
      file: entry,
    });
  }

  const order: Status[] = ["PUBLISHED", "SCHEDULED", "DRAFT"];
  rows.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.date.localeCompare(a.date));

  const counts = rows.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
  console.log(`\nGlint content status — ${dir}\n`);
  for (const r of rows) {
    console.log(`  ${r.status.padEnd(9)} ${r.date.padEnd(10)} ${r.category.padEnd(16)} ${r.title}`);
  }
  console.log(
    `\n  ${rows.length} posts — ` +
      order.map((s) => `${counts[s] ?? 0} ${s.toLowerCase()}`).join(", ") +
      `. (Pending review = open PRs.)\n`,
  );
}
