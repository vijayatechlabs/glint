import { getCollection, type CollectionEntry } from "astro:content";

const byNewest = (a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) =>
  b.data.publishedAt.getTime() - a.data.publishedAt.getTime();

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
