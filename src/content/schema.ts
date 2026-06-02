/**
 * Glint content contract.
 *
 * WHY this file is the centre of the engine: it is the single source of truth
 * for what a piece of content *is*. The AI agent fills these fields, the build
 * validates against them (fail-fast on bad frontmatter), and every consumer
 * (web pages, JSON API, markdown twins) reads the same shape. Change the
 * contract here once and every brand inherits it on the next engine bump.
 *
 * Pure Zod, no Astro import — keeps the contract portable and unit-testable.
 * Astro wiring lives in the integration; it adapts these schemas into
 * `defineCollection` calls.
 */
import { z } from "zod";

/** Visibility tiers drive the access-control model (see ARCHITECTURE §5). */
export const Visibility = z.enum(["public", "gated", "members"]);
export type Visibility = z.infer<typeof Visibility>;

/** An image reference. `src` may be a repo path or an s3://bucket/key URL
 *  (resolved to the configured object store, e.g. MinIO, at build time). */
const imageRef = z.object({
  src: z.string().min(1),
  alt: z.string().min(1, "alt text is required — it is an AEO + a11y signal"),
  caption: z.string().optional(),
});

/** Per-post SEO/AEO overrides; everything falls back to site.config defaults. */
const seo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonical: z.string().url().optional(),
    noindex: z.boolean().default(false),
  })
  .optional();

/** Fields shared by every long-form collection. */
const base = z.object({
  title: z.string().min(1),
  // slug is optional in frontmatter; the build derives it from the filename
  // when omitted, so authors/agents rarely need to set it.
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case slug").optional(),
  summary: z.string().min(1, "summary doubles as the meta description"),
  tags: z.array(z.string()).default([]),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  visibility: Visibility.default("public"),
  draft: z.boolean().default(false),
  author: z.string().optional(), // personId → resolved against data/team.json
  cover: imageRef.optional(),
  images: z.array(imageRef).default([]),
  seo,
});

export const blog = base;

export const caseStudy = base.extend({
  client: z.string().optional(),
  industry: z.string().optional(),
  services: z.array(z.string()).default([]),
  results: z.array(z.string()).default([]),
});

export const news = base;

export const event = base.extend({
  location: z.string().optional(),
  eventDate: z.coerce.date(),
  attendees: z
    .array(z.object({ personId: z.string(), role: z.string().optional() }))
    .default([]),
});

/** Profiles are the people registry rendered as pages (team, speakers, etc.). */
export const profile = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  role: z.string().optional(),
  bio: z.string().optional(),
  avatar: imageRef.optional(),
  links: z.record(z.string(), z.string().url()).default({}),
  visibility: Visibility.default("public"),
});

/** The canonical collection set. A brand enables a subset in its site.config. */
export const glintSchemas = {
  blog,
  "case-studies": caseStudy,
  news,
  events: event,
  profiles: profile,
} as const;

export type GlintCollection = keyof typeof glintSchemas;
export type BlogEntry = z.infer<typeof blog>;
export type CaseStudyEntry = z.infer<typeof caseStudy>;
export type EventEntry = z.infer<typeof event>;
export type ProfileEntry = z.infer<typeof profile>;
