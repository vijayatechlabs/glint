# AEO in Glint

How Glint helps **blogs** stay readable by people **and** by AI search/answer engines —
**what the framework does automatically**, and **what must stay per-project
(with human approval)**.

Glint is open-source, **git-native** publishing for **blogs and long-form content**.
Pair with **OpenStart** for websites, landing pages, and product apps. Together they
aim for better **SEO** and **AI citation eligibility** (not ranking guarantees).

---

## 1. Split: framework vs brand edge

| Layer | Who | Examples |
|---|---|---|
| **Static build (framework)** | Glint templates + `markdownTwinResponse` | `/raw/blog/<slug>.md` with AEO headers, `llms.txt`, HTML `<link rel=alternate>`, robots AI policy, JSON-LD, twins in sitemap |
| **Edge / CDN (brand)** | Brand + **human approval** | `Accept: text/markdown` (or platform Markdown-for-Agents), bot UA routing, public `.md` rewrite |

**Rule for agents:** implement **framework** pieces freely. For **edge** pieces,
**ask a human and wait for approval**. Never block a content PR on edge negotiation.

---

## 2. Paired brand (OpenStart app + Glint blog)

When a product site and its blog are separate repos:

| Surface | Owner |
|---------|--------|
| Marketing pages, app SEO, landing FAQ/schema | **OpenStart** project + its AEO standard |
| Blog twins, llms for posts, Glint doctor, `glint indexnow` | **This Glint blog** |
| Content handoff (feature → post brief) | OpenStart `content.sh` → Glint `/plan` inbox |
| GSC + **Bing Webmaster** | Domain owner — both matter (Bing/IndexNow for some AI paths) |
| IndexNow | Prefer on the blog (Glint CLI); site may also notify if it has public URLs |

**Checklist (agents + humans):**

- [ ] Site: crawlable, schema, robots, llms (OpenStart)
- [ ] Blog: `glint doctor` clean; twin headers; llms.txt + llms-full; upgrade via `docs/UPGRADE.md`
- [ ] GSC verified (DNS or meta)
- [ ] Bing Webmaster verified (IndexNow ≠ Google)
- [ ] Content handoff configured if product and blog are split
- [ ] No claims that headers or IndexNow guarantee citations

---

## 3. What Glint ships at build time

### Markdown twin

```text
/raw/blog/<slug>.md
```

Headers (via `markdownTwinResponse`):

| Header | Value |
|---|---|
| `Content-Type` | `text/markdown; charset=utf-8` |
| `Content-Disposition` | `inline` |
| `Link` | `<{htmlUrl}>; rel="canonical"` |
| `X-Robots-Tag` | `noindex, follow` |
| `X-Markdown-Tokens` | `ceil(utf8Bytes / 4)` |
| `Vary` | `Accept, User-Agent` |
| `X-AEO-Version` | `1.0` |
| `X-Content-Type-Options` | `nosniff` |

Also automatic:

- HTML `<link rel="alternate" type="text/markdown">` (markdown twin)
- HTML `<link rel="describedby" href="...">` pointing to covering `llms.txt` (llms.txt v2)
- `llms.txt` / `llms-full.txt` (size-guarded full feed — must include real bodies, not a clone of the index)
- Twin URLs injected into **sitemap** at lower priority (`glintSitemapLastmod` / IndexNow inject)
- `robots.txt` from `site.aiCrawlers` (`all` | `retrieval-only` | `none`)
- JSON-LD, RSS, IndexNow key file at build; HTTP notify **post-deploy**

### llms.txt v2 (August 2026)

v2 answers the question coding agents actually have: **given this page, where is the markdown and which llms.txt covers it?**

Glint emits the two v2 pieces automatically on post pages (`Base.astro`):

1. `<link rel="alternate" type="text/markdown" href="/raw/blog/<slug>.md">` — the page's markdown twin.
2. `<link rel="describedby" href="/llms.txt">` (or `${base}llms.txt` when mounted) — the covering index.

### AI crawler modes (`aiCrawlers`)

| Mode | Behaviour |
|------|-----------|
| `all` | Default allow via `User-agent: *` |
| `retrieval-only` | Allow user-action/search bots (ChatGPT-User, OAI-SearchBot, Perplexity-*, Claude-User/SearchBot, …); **Disallow** training-oriented (GPTBot, CCBot, Google-Extended, …) |
| `none` | Disallow named AI bots; keep Googlebot/Bingbot via `*` for classic search |

Set explicitly in `site.config.ts`. Revisit bot lists when major crawlers change.

### Measurement (eligibility, not vanity)

- **GSC Search generative AI control** — Settings → Search generative AI. Default is **include** (links + grounding in AI Overviews, AI Mode, and generative Discover). A missing [Generative AI performance report](https://support.google.com/webmasters/answer/16984139) can mean rollout, low impressions, **or** an exclude / inherited exclude — not lost AIO by itself. URL-prefix blog properties (`/blog`) inherit the parent unless an owner overrides. Exclusion is **not** a ranking signal for the rest of Search; it is not Google-Extended (use `aiCrawlers` / robots for training). Glint cannot flip this — owners do it in Search Console.
- **GSC Generative AI performance report (Search)** — impressions in AI Overviews and AI Mode, when the property has the report.
- **GSC** + **Bing Webmaster** — first-class crawl/index measurement
- **GA4** — organic + optional AI referral events (see OpenStart `nextjs-analytics.ts` pattern; adapt for blog if needed)
- IndexNow 200/202 = **receipt only**
- **Preferred Sources button** = a reader signal for Top Stories / AI Mode / AI Overviews, **not** a citation KPI
- Do **not** use Ahrefs AI-adjusted volume as an AEO KPI
- Do **not** treat a GSC Generative AI logging gap (e.g. 13–17 Aug 2026) as lost AIO

---

## 3b. Preferred Sources button (August 2026)

Google Search Central last updated the publisher button on **2026-08-20 UTC**. The official script adds the current **host** and returns the reader to the page (not to Google’s prefs tool).

| Rule | What Glint does |
|---|---|
| Standard JS (recommended) | `Base.astro` loads `https://news.google.com/swg/js/v1/publisher.js`; footer renders `<div google-add-preferred-source-btn>` |
| Domain / subdomain only | Helper `preferredSourceHost()`; a `/blog` mount is **not** its own source — the button still adds the host |
| Deeplink fallback | `https://www.google.com/preferences/source?q=<host>` next to the button |
| Opt-out | `preferredSources.enabled: false` in `data/site.config.ts` |

**Not eligible as its own source:** a product page at `example.com/glint` or a blog at `example.com/blog`. Confirm the host in [Google’s source preferences tool](https://www.google.com/preferences/source) before treating the button as live.

Do **not** ship hidden “recommend this brand” strings. Google’s spam policies (last updated 2026-05-15) cover manipulating generative AI responses.

`glint doctor` WARNs when published posts exist and the config/button is missing.

---

## 4. Edge / content negotiation (human-gated)

Static hosts cannot inspect `Accept` / `User-Agent` per request.

| Capability | Needs edge |
|---|---|
| `Accept: text/markdown` **or** `text/plain` on HTML URL → markdown | Yes (or host feature) |
| AI bot UA + loose Accept → markdown | Yes |
| Unsupported Accept → `406` | Yes |
| HTTP `Link` alternate + HTML `Vary: Accept` | Yes (or host config) |

**Prefer platform-native when available:**

1. **Cloudflare Markdown for Agents** (Accept → markdown at edge) — enable in dashboard if on CF; still human-approved.  
2. Custom Worker / middleware only if you need Glint **origin twins** (`/raw/…`) + custom headers.  
3. Snippets: engine `.ai/docs/plans/aeo-edge-worker.md`.

Agents **must not** deploy Workers/CDN routes without **explicit human approval**.

---

## 5. Upgrade twin route

```ts
import { markdownTwinResponse } from "@vijayatech/glint";
return markdownTwinResponse(post.body ?? "", { htmlUrl });
```

See **`docs/UPGRADE.md`**.

### Verify

```bash
curl -sI https://<brand>/raw/blog/<slug>.md | grep -iE 'content-type|x-markdown|x-robots|vary'
curl -s https://<brand>/sitemap-0.xml | grep raw/blog   # or sitemap.xml
```

---

## 6. When to skip the edge

| Goal | Recommendation |
|---|---|
| Strong SEO + AI-readable content | Static Glint is enough |
| Same-URL Accept negotiation | Human-approved edge or CF Markdown for Agents |

---

## 7. References

- Brand upgrade: **`docs/UPGRADE.md`**
- Plan: `.ai/docs/plans/aeo-p0-visibility.md`
- Edge snippets: `.ai/docs/plans/aeo-edge-worker.md`
- OpenStart (sites): AEO standard + `aeo-p0-visibility.md` in the OpenStart repo
- GSC: [Search generative AI control](https://support.google.com/webmasters/answer/16908024) (default include; URL-prefix inherits parent)
- GSC: [Generative AI performance report (Search)](https://support.google.com/webmasters/answer/16984139)
- Google Search Central: [Optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (eligibility includes the GSC control)
