# Brand upgrade checklist (Glint engine)

Instructions for **humans** and **agents** when pulling a new `@vijayatech/glint` version into this brand site.

**Does not auto-apply:** `glint doctor` only validates. `glint sync` updates engine docs + generated agent files — **not** customized `src/pages/**` or layouts.

---

## 1. Always (every engine bump)

```bash
pnpm update @vijayatech/glint
pnpm glint sync
pnpm glint doctor
pnpm build
```

Open a PR. Agents: **never push to `main`**; human reviews.

---

## 2. Port templates if this site forked theme pages

Diff against the engine scaffold (standalone `theme/` vs mounted `theme-mounted-pages/`).

| Brand file | What to align |
|---|---|
| `src/pages/raw/blog/[slug].md.ts` | `markdownTwinResponse` from `@vijayatech/glint` |
| Post page (`blog/[slug].astro` or `[slug].astro`) | `extractHeadings` TOC; `resolveAuthor` / Person; article meta; OG `/og/{slug}.svg` fallback |
| `src/layouts/Base.astro` | Org JSON-LD; article meta; optional `llms-full` alternate; Preferred Sources `publisher.js` |
| `src/components/Footer.astro` / `PreferredSources.astro` | Official Preferred Sources button + host deeplink |
| `src/pages/rss.xml.js` | `markdownToHtmlBasic` + resolved author |
| `llms-full.txt.ts` / `llms.txt.ts` | Full feed + link from index |
| `api/blog/[slug].json.ts` | Per-post JSON if missing |
| `astro.config.*` | `glintSitemapLastmod`, `glintOgImage`, `remarkResolveLinks`, `rehypeHeadingIds` |
| `src/posts.ts` | `resolveAuthor` (case-insensitive team ids) |
| `data/site.config.ts` | Explicit `aiCrawlers`; optional `social` / `logo`; `preferredSources` |
| `data/team.json` | Real authors for E-E-A-T |

Merge by hand if customized — do not overwrite brand chrome blindly.

---

## 3. Config (human decisions)

- Set `aiCrawlers` explicitly (`all` | `retrieval-only` | `none`).
- Fill `preferredSources` (`enabled` / `theme` / `lang`) or set `enabled: false`.
- Fill `social` / `logo` when you care about Organization schema.
- Verify **GSC + Bing Webmaster** (IndexNow does not replace Google).
- **Do not** use Google Indexing API for normal blog posts. Prefer sitemap + GSC.
- Paired product site (OpenStart): see `docs/AEO.md` §2.

---

## 4. Edge / CDN (optional)

See `docs/AEO.md`. Agents must **get explicit human approval** before Workers or middleware.

---

## 5. Verify

```bash
pnpm glint doctor && pnpm build
curl -sI https://<this-domain>/raw/blog/<slug>.md | grep -iE 'content-type|x-markdown|x-robots|vary'
```

IndexNow remains post-deploy only when configured.

---

## 6. Agent rules

1. Package update → sync → doctor → PR.  
2. Port templates carefully; never wipe brand content/design.  
3. No edge deploy without human yes.  
4. No Google Indexing push for BlogPosting.  
5. Eligibility only — no ranking/citation guarantees.
