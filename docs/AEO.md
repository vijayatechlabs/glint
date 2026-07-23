# AEO in Glint

How Glint helps blogs stay readable by people **and** by AI search/answer engines —
**what the framework does automatically**, and **what must stay per-project
(with human approval)**.

Glint is an open-source, **git-native** publishing framework: developers,
freelancers, and agencies manage rich content next to the website, app, or
project it supports — without leaving the IDE or inventing a separate CMS.

---

## 1. Split: framework vs brand edge

| Layer | Who | Examples |
|---|---|---|
| **Static build (framework)** | Glint templates + `markdownTwinResponse` | `/raw/blog/<slug>.md` with AEO headers, `llms.txt`, HTML `<link rel=alternate>`, robots AI policy, JSON-LD |
| **Edge / CDN (brand)** | Brand + **human approval** | `Accept: text/markdown` routing, AI-bot User-Agent routing, optional public `…/post.md` rewrite, HTML `Vary` / HTTP `Link` |

**Rule for agents:** implement **framework** pieces freely (content, twin headers,
doctor). For **edge** pieces, **ask a human and wait for approval** before
deploying Workers, middleware, or CDN routes. Never block a content PR on edge
negotiation.

---

## 2. What Glint ships at build time

For each published post the build emits a **markdown twin** at:

```text
/raw/blog/<slug>.md
```

Headers (via `markdownTwinResponse` from `@vijayatech/glint`):

| Header | Value |
|---|---|
| `Content-Type` | `text/markdown; charset=utf-8` |
| `Content-Disposition` | `inline` |
| `Link` | `<{htmlUrl}>; rel="canonical"` |
| `X-Robots-Tag` | `noindex, follow` (twins stay out of the HTML index) |
| `X-Markdown-Tokens` | `ceil(utf8Bytes / 4)` (budget heuristic for AI clients) |
| `Vary` | `Accept, User-Agent` |
| `X-AEO-Version` | `1.0` |
| `X-Content-Type-Options` | `nosniff` |

Also automatic (elsewhere in the theme):

- HTML `<link rel="alternate" type="text/markdown" href="…/raw/blog/…">`
- `llms.txt` / `llms-full.txt` indexes
- `robots.txt` AI crawler policy from `site.aiCrawlers`
- JSON-LD, sitemap, RSS, IndexNow (post-deploy)

### Upgrade an existing brand twin

```ts
import { markdownTwinResponse } from "@vijayatech/glint";
// …
return markdownTwinResponse(post.body ?? "", { htmlUrl });
```

Or re-copy the engine template `raw/blog/[slug].md.ts.tmpl`.  
`glint doctor` WARNs if the twin route is missing these markers.

### Verify static twins

```bash
curl -sI https://<brand>/raw/blog/<slug>.md | grep -iE \
  'content-type|x-markdown|x-robots|x-aeo|vary|x-content-type'
```

---

## 3. What cannot live in the framework (edge)

Static hosts cannot inspect `Accept` or `User-Agent` per request. Optional
**content negotiation** needs an edge worker (or host middleware):

| Capability | Needs edge |
|---|---|
| `Accept: text/markdown` on the HTML URL → serve markdown | Yes |
| Known AI bot UA (e.g. GPTBot) + loose Accept → markdown | Yes |
| Unsupported Accept → `406` | Yes |
| HTTP `Link: <…md>; rel="alternate"` on HTML responses | Yes (or host config) |
| HTML response `Vary: Accept` | Yes (or host config) |
| Public twin at `/blog/<slug>.md` while origin is `/raw/blog/<slug>.md` | Yes (rewrite) |

**Origin vs optional public twin URLs**

| Role | URL |
|---|---|
| Origin (Glint, always) | `/raw/blog/<slug>.md` |
| Optional public alias | `/blog/<slug>.md` for HTML `/blog/<slug>/` — edge rewrite only |

Reference snippets (not engine code):  
`.ai/docs/plans/aeo-edge-worker.md` in the Glint engine repo.

---

## 4. Agent + human protocol (edge)

1. Human asks for content negotiation, bot-UA routing, or CDN AEO behaviour — or
   the brand’s deploy docs require it.
2. Agent **does not** deploy. Agent:
   - Opens `docs/AEO.md` + engine plan `aeo-edge-worker.md` if available
   - Summarizes platform (CF / Vercel / Netlify), path mapping, cache/`Vary` risks
   - Asks for **explicit human approval** (yes / no / revise)
3. Only after approval: implement worker/middleware **in the brand repo or host
   dashboard**, never as a required Glint dependency.
4. Verify with curls (see edge plan) against the live brand URL.

**Never** treat edge deploy as part of `glint new` / `glint sync` / content PR
merge without a separate human decision.

---

## 5. When to skip the edge

| Goal | Recommendation |
|---|---|
| Strong SEO + AI-readable content | Static Glint is enough (`llms.txt`, twins, schema) |
| Same-URL Accept negotiation for crawlers | Human-approved edge worker |

Most freelancers and agencies get full value from **static twins + PR workflow**
without touching the edge.

---

## 6. References

- This doc (synced to brand sites via `glint sync`)
- Brand upgrade steps: **`docs/UPGRADE.md`**
- Engine plan: `.ai/docs/plans/aeo-edge-worker.md` (optional edge reference)
- API: `markdownTwinHeaders` / `markdownTwinResponse` from `@vijayatech/glint`
