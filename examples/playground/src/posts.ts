import { getCollection, type CollectionEntry } from "astro:content";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const byNewest = (a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) =>
  b.data.publishedAt.getTime() - a.data.publishedAt.getTime();

// ── Team / author resolution (E-E-A-T) ─────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  url?: string;
  role?: string;
}

let _teamCache: Map<string, TeamMember> | null = null;

function loadTeam(): Map<string, TeamMember> {
  if (_teamCache) return _teamCache;
  const map = new Map<string, TeamMember>();
  try {
    const p = join(process.cwd(), "data", "team.json");
    if (existsSync(p)) {
      const raw = JSON.parse(readFileSync(p, "utf8")) as TeamMember[];
      for (const m of raw) map.set(m.id.toLowerCase(), m);
    }
  } catch {
    /* malformed team.json — fall back to personId */
  }
  _teamCache = map;
  return map;
}

/** Resolve an author personId to { name, url }. Falls back to the id itself. */
export function resolveAuthor(personId: string): { name: string; url?: string } {
  const team = loadTeam();
  const member = team.get(personId.toLowerCase());
  if (member) return { name: member.name, ...(member.url ? { url: member.url } : {}) };
  return { name: personId };
}

/** Pages: dev/preview shows drafts; production hides drafts + future-dated posts. */
export async function pagePosts(): Promise<CollectionEntry<"blog">[]> {
  const now = Date.now();
  const isProd = import.meta.env.PROD;
  const posts = await getCollection("blog", ({ data }) =>
    isProd ? data.draft !== true && data.publishedAt.getTime() <= now : true,
  );
  return posts.sort(byNewest);
}

/** Public surface (feeds, llms.txt, twins, JSON API): always excludes drafts + future. */
export async function publicPosts(): Promise<CollectionEntry<"blog">[]> {
  const now = Date.now();
  const posts = await getCollection(
    "blog",
    ({ data }) => data.draft !== true && data.publishedAt.getTime() <= now,
  );
  return posts.sort(byNewest);
}

/** Related posts by shared category (weighted) + shared tags. */
export function relatedTo(
  post: CollectionEntry<"blog">,
  all: CollectionEntry<"blog">[],
  n = 3,
): CollectionEntry<"blog">[] {
  const tags = new Set(post.data.tags ?? []);
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => {
      let score = post.data.category && p.data.category === post.data.category ? 2 : 0;
      score += (p.data.tags ?? []).filter((t) => tags.has(t)).length;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.p, b.p))
    .slice(0, n)
    .map((x) => x.p);
}
