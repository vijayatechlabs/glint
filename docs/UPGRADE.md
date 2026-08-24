# Brand upgrade checklist (Glint engine)

Instructions for **humans** and **agents** when pulling a new `@vijayatech/glint` version into an existing brand site.

**Does not auto-apply:** `glint doctor` only validates. `glint sync` updates engine docs + generated agent files — **not** customized `src/pages/**` or layouts.

---

## 1. Always (every engine bump)

```bash
# From the brand repo
pnpm update @vijayatech/glint    # or: rebuild sibling engine + reinstall
pnpm glint sync                 # docs/AEO.md, AGENTS.md, pipeline plays, …
pnpm glint doctor               # WARN/ERROR gate — fix ERRORs before ship
pnpm build                      # must succeed
```

Then open a PR. Agents: **never push to `main`**; human reviews.

---

## 2. Port templates if this brand forked theme pages

Compare brand files to engine templates under `node_modules/@vijayatech/glint` (or the engine clone) `src/scaffold/theme/` (standalone) or `theme-mounted-pages/` (mounted blog).

| Brand file | What to align |
|---|---|
| `src/pages/raw/blog/[slug].md.ts` | `import { markdownTwinResponse } from "@vijayatech/glint"` and return that Response |
| `src/pages/blog/[slug].astro` or `src/pages/[slug].astro` | `extractHeadings` for TOC; Person via `resolveAuthor`; `articleMeta` with resolved name; OG fallback `/og/{slug}.svg` |
| `src/layouts/Base.astro` | Organization JSON-LD (`logo || favicon`); article meta props; optional `llms-full` alternate link; Preferred Sources `publisher.js` when enabled |
| `src/components/Footer.astro` / `PreferredSources.astro` | Official Preferred Sources button + host deeplink |
| `src/pages/rss.xml.js` | `markdownToHtmlBasic` for `content`; author from `resolveAuthor` |
| `src/pages/llms-full.txt.ts` | Add if missing; keep size guard |
| `src/pages/llms.txt.ts` | Link to `llms-full.txt` |
| `src/pages/api/blog/[slug].json.ts` | Add if missing (per-post JSON API) |
| `astro.config.*` | `glintSitemapLastmod()`, `glintOgImage()`, `remarkResolveLinks(…)`, `rehypeHeadingIds()` |
| `src/posts.ts` | `resolveAuthor` + case-insensitive `team.json` ids |
| `data/site.config.ts` | Explicit `aiCrawlers`, optional `social` / `logo`, `preferredSources` |
| `data/team.json` | Real authors (`id`, `name`, `url?`) for E-E-A-T |

If the brand never customized a file, copying the latest `.tmpl` (strip `.tmpl`) is fine. If customized, **merge by hand** — do not blindly overwrite brand chrome/CSS.

---

## 3. Config / policy (human decisions)

| Field | Action |
|---|---|
| `aiCrawlers` | Set explicitly: `"all"` \| `"retrieval-only"` \| `"none"` (retrieval-only allows answer bots, blocks training scrapers) |
| `preferredSources` | Keep `enabled: true` unless you opt out. Port `PreferredSources.astro` + `publisher.js` in `Base.astro`. Domain/subdomain only. |
| `social` / `logo` | Fill for Organization JSON-LD |
| `verification.google` | GSC meta or DNS |
| `verification.bing` | Bing Webmaster — matters for AI-adjacent / IndexNow paths |
| `analytics.ga4` | Organic + optional AI referral measurement |
| Google Indexing API | **Do not** enable for normal blogs — not for BlogPosting. Use sitemap + GSC. |

### Paired OpenStart app + this blog

See **`docs/AEO.md` §2**. Site AEO lives in the OpenStart repo; blog AEO here; content handoff keeps product and posts aligned.

---

## 4. Edge / CDN (optional — human approval required)

Same-URL Accept / bot negotiation is **not** in the engine. See `docs/AEO.md`.

- Agents: **stop and ask the human** before Workers, middleware, or CDN routes.
- Only after explicit yes: follow engine plan `.ai/docs/plans/aeo-edge-worker.md` (engine repo).

---

## 5. Verify after upgrade

```bash
pnpm glint doctor
pnpm build

# Twin headers (after deploy or preview host)
curl -sI https://<brand>/raw/blog/<slug>.md | grep -iE 'content-type|x-markdown|x-robots|vary'

# Full-content index
curl -sI https://<brand>/llms-full.txt | head -5
```

IndexNow (if used): still **post-deploy** only — `glint indexnow --since-sha …` after the site is live.

---

## 6. Agent rules (summary)

1. Update package → `sync` → `doctor` → fix issues → PR.  
2. Port templates carefully; never wipe brand-owned design/content.  
3. Do not deploy edge AEO without human approval.  
4. Do not recommend Google Indexing API for BlogPosting.  
5. Do not claim rankings or AI citations — only crawl/structure eligibility.

---

## Related

- `docs/AEO.md` — static AEO vs edge  
- `docs/BLOG-SPEC.md` — definition of done  
- `docs/GETTING-STARTED.md` § pulling Glint updates  
