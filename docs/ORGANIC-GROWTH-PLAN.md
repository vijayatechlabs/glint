# Glint — Organic Growth & Measurement Plan

From "no visible results" to measurable organic + AEO growth across the Glint brand sites.

**Canonical path:** `docs/ORGANIC-GROWTH-PLAN.md`  
**Related design plan (IndexNow only):** `.ai/docs/plans/indexnow.md`  
**Related engine uplift (SEO/AEO emitters):** `.ai/docs/plans/seo-aeo-uplift.md`  
**OpenStart AEO standard:** sibling repo `OpenStart` → AEO-FRAMEWORK §8.4–§8.5  

Updated: **2026-07-22** (review of SEO/AEO uplift work + plan corrections; IndexNow + analytics scaffolding still baseline).

---

## 0. Relationship to IndexNow & SEO/AEO uplift

| | **This plan (organic growth)** | **IndexNow plan** | **SEO/AEO uplift plan** |
|--|--------------------------------|-------------------|-------------------------|
| **Scope** | Full growth system: analytics, GSC/Bing, content strategy, AI traction, metrics loop | **One protocol**: notify Bing/Yandex/Naver of URL add/update/delete | Engine-side emitters: llms-full, article meta, JSON-LD, lastmod, robots AI policy, FAQ/HowTo, etc. |
| **Owns** | Sequencing, brand rollout, measurement runbook, content plays | CLI, Astro integration, migrate, keyLocation, durable cursor | Scaffold/templates/integrations + doctor WARNs for new surfaces |
| **Overlap** | Workstream **1c** *is* IndexNow rollout + Bing registration; WS3 shares FAQ/entity work with uplift | Implementation detail for 1c | Implements parts of WS3 (3c, entity signals) + §5 AI surfaces in the **engine tree only** |
| **Contradiction?** | **No** — if this doc defers protocol rules to the IndexNow plan | Older drafts of *this* doc contradicted (build-time ping, bare `indexNow` string). **Fixed.** | **Do not treat Google Indexing API as a blog growth lever** — Google documents it for JobPosting / BroadcastEvent only (see §7 + review). |

**Rule:** Protocol behavior (when to ping, SHA cursor, 200/202, mounts, twins) lives in  
`.ai/docs/plans/indexnow.md` + code. This plan only says **when brands turn it on** and how it fits GSC/Bing/GA. Emitter implementation detail lives in `.ai/docs/plans/seo-aeo-uplift.md`.

**Honest non-claim (shared):** IndexNow 200/202 = **receipt only**. It does not guarantee crawl, ranking, or ChatGPT/Perplexity citations. Same honesty applies to `llms.txt` / `llms-full.txt` / JSON-LD — **eligibility, not guarantees**.

---

## 1. Context & diagnosis

We run a real content operation — **~49 published posts across 3 live Glint sites** — yet can't
"produce results" in Google Search or AI-agent citations. The engine is not the main problem: Glint
already compiles strong SEO/AEO output (JSON-LD, `llms.txt`, `/raw` markdown twins, twin discovery
surfaces, `sitemap-index.xml`, robots.txt, canonical, OG, internal links). **IndexNow runtime is
implemented in the engine tree** (see IndexNow plan); **brands are not fully rolled out**.

| Site | Repo | Published posts | Analytics today | GSC / Bing | IndexNow (brand) |
|---|---|---|---|---|---|
| vijayatechlabs.com | `../vijayatech-blog` | 28 | **none** (until rollout) | **not verified** | **not live** |
| naam.one | `../naam-blog` | 11 | GA4 `G-GV1LLK02SC` (may be one-off snippet) | **not verified** | **not live** |
| heyzira.com | `../zira-landing/blog` | 10 | **none** | **not verified** | **not live** |

### What actually blocks results

1. **Flying blind (ops).** Measurement was late. Sites lack GSC/Bing verification and consistent
   GA4; AI-bot crawl logging is unset. Impressions, clicks, position, coverage, and bot hits are
   invisible. *(Engine now scaffolds analytics + IndexNow; brands must fill IDs and deploy.)*
2. **Young domains (2–3 months)** and content that is **product-brief-driven, not search-demand-driven**
   — weak match to real queries and long-tail entry points.
3. **Possible CF AI-crawler blocks (1h)** — Cloudflare defaults may 403 retrieval bots.
4. **Verified GA4 bug in the naam *app*** (1g) — pageviews dropped unless user hits Generate.

### Engine vs brand status (2026-07-22)

| Capability | Engine tree | Brands live |
|------------|-------------|-------------|
| `analytics` / `verification` in site.config | ✅ scaffold (`glint new`) | ⬜ fill + deploy |
| GA4/verification in `Base.astro` | ✅ template | ⬜ existing sites need layout update |
| IndexNow key file + twin sitemap inject | ✅ `glintIndexNow()` | ⬜ migrate + key |
| Post-deploy `glint indexnow` | ✅ CLI | ⬜ cursor + host hook |
| Doctor WARNs (GA / GSC / IndexNow) | ✅ | ⬜ after update |
| `article:*` meta, Org/WebSite JSON-LD, FAQ/HowTo schema | 🟡 in progress (see uplift plan + §12 review) | ⬜ after package + layout PR |
| `llms-full.txt`, robots `aiCrawlers`, RSS enrichment, JSON API | 🟡 templates in tree; not brand-rolled | ⬜ |
| Sitemap `<lastmod>` | 🟡 `glintSitemapLastmod()` — mount path bugs remain | ⬜ register in brand `astro.config` |
| Auto OG images / TOC anchors | 🔴 incomplete (generated but unwired / no heading ids) | ⬜ |
| Google Indexing API (`glint index`) | 🔴 **wrong tool for blogs** — do not roll out (see §7, §12) | ❌ n/a |

### Expectation up front

Instrumentation (WS1–2) makes results *visible* within days. Rankings/traffic (WS3) compound over
**months**. Honest 2–4 week win: GSC impressions, indexed URLs, bot crawls visible — not a traffic spike.

**Decisions locked:** GA4 + GSC + Bing; three workstreams; all three sites in parallel.

---

## 2. Workstream 1 — Instrumentation & indexing

### How engine changes reach brands (important)

| Mechanism | What it updates | What it does **not** |
|-----------|-----------------|----------------------|
| `pnpm update @vijayatech/glint` | Package / CLI | Brand `src/` layouts, astro.config |
| `glint sync` | Engine-reference docs, generated agent files | **Not** Base.astro, raw twins, astro integrations |
| `glint new` | Greenfield scaffold (full) | Existing customized sites |
| `glint migrate indexnow` | Astro `glintIndexNow()`, GH workflow scaffold, twin header hints | GA IDs, GSC tokens, durable cursor |
| **Manual / PR** | Copy template Base snippets, fill `site.config.ts` | — |

**Do not write “sync alone ships analytics + IndexNow.”** Rollout = update package → migrate IndexNow →
patch/sync layouts as needed → fill config → rebuild → deploy → post-deploy IndexNow + GSC/Bing.

### 1a. Config fields — **[Engine: Done]**

Generated in `data/site.config.ts` (`src/cli/commands/new.ts`):

```ts
analytics: {
  ga4: "",            // "G-XXXXXXXXXX"
  cloudflare: "",     // optional CF Web Analytics token
},
verification: {
  google: "",         // GSC meta token (or DNS instead)
  bing: "",           // Bing Webmaster meta token
},
// Object form (not a bare string). See IndexNow plan for keyPath / keyLocation.
indexNow: {
  key: "",            // 8–128 chars [A-Za-z0-9-]
  keyPath: "root",    // "root" = https://domain/{key}.txt | "base" = under mount
},
```

### 1b. Head injection — **[Engine template: Done]**

`src/scaffold/theme/src/layouts/Base.astro.tmpl`:

- GA4: `PROD && !noindex && site.analytics?.ga4`
- Cloudflare beacon: `PROD && site.analytics?.cloudflare`
- Verification metas: always safe when set
- Markdown twin: `markdownAlternate` → `<link rel="alternate" type="text/markdown">`

Existing brands: ensure their `Base.astro` matches template (sync does not overwrite brand layouts).

### 1c. IndexNow — **[Engine: Done · Brands: not rolled out]**

**Defer protocol detail to** `.ai/docs/plans/indexnow.md`. Summary:

| Step | Command / artifact |
|------|---------------------|
| Build | `glintIndexNow()` writes key file + injects twin URLs into sitemap (priority 0.5) |
| One-time | `glint migrate indexnow` |
| Post-deploy | `glint indexnow --since-sha <durable-cursor> --sha <deploy-sha>` |
| Cursor | Repo var `INDEXNOW_PREV_SHA` (or remote) — **never** silent `HEAD~1` |
| Twins | HTML + `/raw/...md` on add/update; both on delete; headers `text/plain` + `inline` + Link canonical |

**Brand checklist (1c rollout):**

1. `pnpm update @vijayatech/glint`  
2. `glint migrate indexnow`  
3. Set `indexNow.key` (+ `keyPath` if mounted and parent cannot host root key)  
4. Deploy; confirm `https://<origin>/{key}.txt` returns 200  
5. Set durable `INDEXNOW_PREV_SHA`; wire Coolify post-deploy or GH `repository_dispatch`  
6. Bing Webmaster: register key; submit `sitemap-index.xml`  

### 1d. AI-bot crawl visibility

No page change. Runbook: keep `robots.txt` open to public content; use **Cloudflare bot analytics /
Logpush** (not a proxy worker — §7). Count: `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`,
`Google-Extended`, `CCBot`, plus user-action agents (`ChatGPT-User`, `Perplexity-User`, …).

### 1e. Doctor guardrail — **[Engine: Done]**

`glint doctor` WARNs when published content exists and GA4 / GSC verification / IndexNow key empty or
invalid; WARN on mount + `keyPath: "root"`; WARN if `glintIndexNow` / workflow missing.

### 1f. Brand rollout + reconcile

For each of `../naam-blog`, `../vijayatech-blog`, `../zira-landing/blog`:

1. `pnpm update @vijayatech/glint`  
2. `glint migrate indexnow` (and patch Base/analytics if layout is brand-owned and stale)  
3. `glint sync` for docs/agent files only  
4. Fill `analytics` / `verification` / `indexNow`  
5. **naam:** move `G-GV1LLK02SC` into `analytics.ga4`; remove one-off snippets  
6. Rebuild + redeploy  
7. Complete 1c brand checklist + 2a–2c  

### 1g. GA4 page-view bug in brand *apps* (highest ROI, separate from blogs)

In the naam app: `ga4Service.init()` must run **on mount**, not only inside Generate. Search for
`ga4Service.init` / `isInitialized` gating. Then audit siblings (`zira-landing`, BuyMyCar, atharvaai).

### 1h. AI-crawler access audit — **URGENT (do first)**

Since ~2025-07 Cloudflare may block known AI crawlers by default. For each domain: CF Security /
Bots + `robots.txt`. **Allow** retrieval/user-action bots that can send referrals; deliberate
allow/block on training bots (`GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`). Verify 200 not 403
in logs. Pairs with 1d.

---

## 3. Workstream 2 — Off-page setup + KPI dashboard

Deliver `docs/MEASUREMENT.md` + per-site checklist; account steps are owner-only.

**2a. Google Search Console** — domain property preferred (blog + app). Submit **`sitemap-index.xml`**
(not `sitemap.xml`). URL Inspection on top ~10 posts/site.

**2b. Bing Webmaster** — verify (import from GSC), submit `sitemap-index.xml`, **register IndexNow key**
from 1c.

**2c. GA4** — properties + IDs via 1a/1f. AI referral channel (Source regex for chatgpt/openai/
perplexity/claude/anthropic/gemini/copilot/…). CTA / outbound events for blog → product.

**2d. Looker Studio** — GSC + GA4: impressions, clicks, position, CTR, coverage; sessions; AI-referral;
striking-distance queries (pos 5–20) as WS3 queue; bot counts from CF (periodic).

**2e. AI citations proxy** — (1) AI-referral GA4 (2) bot crawl volume (3) monthly manual prompt-test log
(ChatGPT/Perplexity/Gemini). No native “citations” dashboard.

---

## 4. Workstream 3 — Content strategy (earn rankings & citations)

Instrumentation makes results visible; this creates them.

**Priority inside WS3 (do in order):**

1. **3a** Demand-driven `/plan` (keywords/questions, not only product briefs)  
2. **3c** FAQ/HowTo JSON-LD from playbook sections  
3. **3d** Freshness/refresh loop from GSC striking distance + IndexNow re-notify  
4. **3b** Topical hubs / clusters  
5. **3e** Off-page authority (owner effort)  

**3a.** Update planning plays so ideation starts from search demand; encode clusters in
`data/content-strategy.md`.

**3b.** Pillar → spoke + hub pages; related-posts graph.

**3c.** FAQ/HowTo JSON-LD on post template — **[Engine: partial]** schema + template emission when
frontmatter has `faq` / `howTo`. Brands need package update + post template parity. Content authors
must actually fill frontmatter (agent `/draft` can suggest later).

**3d.** After ~2–4 weeks GSC data: refresh pos 5–20 pages; bump `updatedAt`; internal links;
`glint indexnow` for changed URLs. Sitemap `<lastmod>` (uplift) helps re-crawl once wired correctly.

**3e.** Directories, original data, communities, light PR, Organization/Person + sameAs.
Organization JSON-LD is scaffolded in Base (prefer `site.logo` + `social` sameAs); Person author
resolution from `team.json` still incomplete.

---

## 5. AI-engine traction (evidence-labelled, 2026)

Figures below are **directional / reported in industry writeups** — revisit quarterly; do not treat
as guaranteed ROI.

| Engine | Tends to retrieve from | Primary lever for us |
|---|---|---|
| ChatGPT / Copilot | Bing index + strong entity sources (e.g. Wikipedia) | Bing + IndexNow (1c); entity/sameAs |
| Perplexity | Own index + heavy community sources (e.g. Reddit) | Community seeding; freshness; extractable structure |
| Google AI Overviews / Gemini | Google index | Page-1 eligibility + structured data + freshness |
| Grok | Web + X firehose | X presence + entity |
| Groq | Inference host, not an index | n/a product-specific |

Cross-cutting:

1. Community seeding (owner) — strong for some assistants.  
2. Recency bias — refresh loop (3d) matters.  
3. Answer-first opening (~first 200 words) — hard guideline; optional doctor later.  
4. Original data / E-E-A-T.  
5. Entity signals.  
6. Static fast HTML — Glint strength.

**llms.txt:** keep emitting (cheap); **do not rely on it** as primary growth lever. Real path =
excellent HTML + discoverable `/raw` twins (sitemap + alternate + canonical policy).

**Optional bets (parallel, not blockers for WS1):**

- Cloudflare AI Search → MCP (dashboard; 31-day idle pause caveat).  
- `/.well-known/api-catalog` (RFC 9727) Worker per domain if content API is real.

---

## 6. Self-improving content loop (phased)

- **Phase A:** `glint metrics` → `data/metrics/latest.md` (GSC ± GA4), read-only, after ~3–4 weeks data.  
- **Phase B:** `/refresh` + feed digest into `/plan`; agent proposes PRs only.  
- **Phase C:** scheduled PRs via Actions / pipeline.  

Autonomy must stay draft-first / PR-gated.

---

## 7. Deliberately NOT doing

- No robots.txt `llms:` field.  
- No proxy Worker for bot logging.  
- No unguarded GA on draft/noindex.  
- No inventing baseline traffic numbers until 1g + 2a.  
- Submit **`sitemap-index.xml`**, never bare `sitemap.xml`.  
- Don't treat `llms.txt`, `llms-full.txt`, or IndexNow as citation guarantees.  
- Don't default IndexNow to full historic sitemap or `HEAD~1` cursor.  
- Don't claim `glint sync` alone rolls out Base.astro / IndexNow integration.  
- **Don't use Google Web Search Indexing API for BlogPosting / general blog URLs.**  
  Google documents the API for **JobPosting** and **BroadcastEvent** (in VideoObject) only.  
  Engine WIP (`glint index` / `glint setup indexing`) must be gated, removed, or limited to those
  content types — not marketed as “Google is 90% of search → push every post.” Use GSC sitemap +
  URL Inspection + `<lastmod>` + quality content for Google.

---

## 8. Critical files

**Engine (IndexNow — see also `.ai/docs/plans/indexnow.md`):**

- `src/lib/indexnow.ts`, `src/lib/indexnow.test.ts`  
- `src/integration/indexnow.ts` — key file + twin sitemap inject  
- `src/cli/commands/indexnow.ts` — post-deploy submit  
- `src/cli/commands/migrate.ts` — one-time setup  
- `src/cli/commands/build.ts` — no HTTP ping  
- `src/cli/commands/doctor.ts` — GA/GSC/IndexNow WARNs  
- `src/cli/commands/new.ts` — config scaffold  
- Twin templates: `…/raw/blog/[slug].md.ts.tmpl`  
- Post + Base: alternate markdown link  

**Engine (measurement / content):**

- `src/scaffold/theme/src/layouts/Base.astro.tmpl` — GA + verification + Org JSON-LD + article meta  
- Post template — FAQ/HowTo (3c, partial); TOC (broken anchors until rehype-slug); Person (not team-resolved)  
- `src/integration/sitemap.ts` — `glintSitemapLastmod()` (mount bugs open)  
- `src/integration/og-image.ts` — OG SVG gen (unwired to meta; resvg path broken)  
- `src/lib/remark-links.ts` — `{{cta:}}` / `{{ref:}}` shortcodes  
- `src/cli/commands/index.ts`, `setup.ts`, `src/lib/google-indexing.ts` — **do not brand-roll** (API scope)  
- `.ai/docs/plans/seo-aeo-uplift.md` — engine emitter plan (status: in progress, not “done”)  
- `docs/pipeline/plan.md`, CONTENT-PIPELINE — demand-driven (3a, TODO)  
- `docs/MEASUREMENT.md` — TODO runbook  
- `src/cli/commands/metrics.ts` — TODO Phase A  

**Brands:** `../naam-blog`, `../vijayatech-blog`, `../zira-landing/blog`  
**Apps (1g):** naam `ga4Service` init path; audit siblings  

---

## 9. Verification

**Engine**

- [ ] `glint new` scaffolds analytics / verification / indexNow object  
- [ ] Playground build: GA only when ID set; absent on noindex; key at `dist/{key}.txt` when configured  
- [ ] `glint indexnow --since-sha …` submits delta only; refuses missing cursor  
- [ ] `pnpm test` (indexnow unit tests) green  

**Per brand after rollout**

- [ ] Live post: GA + verification in view-source  
- [ ] GA4 Realtime on visit  
- [ ] GSC: property + `sitemap-index.xml`  
- [ ] Bing: IndexNow key + sitemap  
- [ ] `/{key}.txt` 200; post-deploy IndexNow 200/202 logged  
- [ ] Cursor advanced only after success  

**1g:** naam without Generate still records pageview  

---

## 10. Sequencing

1. **Now / Week 1 (ops — still highest ROI):** **1h** (CF bots) + **1g** (naam GA) + **1f brand rollout** (analytics + IndexNow migrate) + **2a–2c** (GSC / Bing / GA). Do **not** block this on more engine emitters.  
2. **Engine gate before next package release:** fix uplift blockers (TOC heading ids, OG `og:image` wiring or drop, lastmod mount paths + playground registration, gate/remove Google Indexing for blogs). See §12.  
3. **Week 1–2:** 2d–2e dashboard + citation tracker  
4. **Week 2+:** WS3 in priority order (3a → finish 3c content fill → 3d → 3b → 3e) + community/entity plays  
5. **Week 4+:** metrics Phase A  
6. **Parallel optional:** CF AI Search, api-catalog Worker — not Google Indexing for BlogPosting  

---

## 11. Brand rollout status board

| Brand | Package update | migrate indexnow | Config filled | GSC | Bing + IndexNow key | GA live | CF bots audited |
|-------|----------------|------------------|---------------|-----|---------------------|---------|-----------------|
| naam-blog | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| vijayatech-blog | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| zira-landing/blog | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Still the critical path.** Engine SEO/AEO surface without this board filled = still flying blind (§1 diagnosis unchanged).

---

## 12. Review — plan + code (2026-07-22)

Review of `docs/ORGANIC-GROWTH-PLAN.md`, `.ai/docs/plans/seo-aeo-uplift.md`, and the uncommitted engine
diff implementing the uplift. Full notes also live in the session review artifact; this section is
the durable plan record.

### 12.1 Verdict

| Area | Verdict |
|------|---------|
| Organic plan (this doc) | **Sound** as strategy: measurement first, honest non-claims, brand vs engine split, IndexNow deferral. |
| SEO/AEO uplift code | **Useful but incomplete** engine pass; must not ship as “organic growth done” or “implemented.” |
| Sequencing | **Risk:** engine emitters expanded while brand board (§11) is still empty — opposite of Week-1 priority. |
| Google Indexing path | **Block / rework** — wrong API for blogs (Google docs: JobPosting / BroadcastEvent only). |

### 12.2 What the organic plan got right

- Flying-blind diagnosis still dominates; instrumentation > more meta tags for 2–4 week wins.  
- Clear “sync does not ship Base / IndexNow” rule.  
- IndexNow = receipt only; no robots `llms:` field; submit `sitemap-index.xml` only.  
- WS3 priority order (demand → FAQ → freshness → hubs → off-page) remains correct.  
- Brand status board forces honesty about live readiness.

### 12.3 What the uplift work advanced (engine tree only)

| Item | Status after review |
|------|---------------------|
| `llms-full.txt` + link from `llms.txt` | Templates present; size guard; uses `publicPosts` (newest first) |
| `article:*` meta | Wired in Base + post templates |
| Organization JSON-LD | Present; logo uses favicon not `site.logo` (fix) |
| FAQ/HowTo schema + JSON-LD | Schema + emission when frontmatter set (3c partial) |
| WebSite + SearchAction | Index templates |
| robots `aiCrawlers` | Template + doctor WARN if unset |
| RSS author/categories/`content` | Present; `content` is markdown not HTML |
| Per-post `/api/blog/<slug>.json` | Templates present |
| remark `{{cta:}}` / `{{ref:}}` | Plugin + doctor broken-ref WARN |
| Doctor: social / googleIndexing / aiCrawlers | WARNs added |
| Sitemap lastmod | Integration exists; **mount path matching broken**; playground not registered |
| TOC | Nav rendered; **heading `id`s not injected** (dead anchors) |
| OG images | SVG written at build; **not set as `og:image`**; resvg API wrong |
| `glint index` / `setup indexing` | Code present; **do not brand-roll** (API scope) |

### 12.4 Issues (actionable)

**Bugs (fix before release)**

1. **Google Indexing API for blogs** — `src/lib/google-indexing.ts`, CLI, setup, doctor WARN, uplift plan §2.6. Google documents the API for JobPosting / BroadcastEvent only. Gate, remove, or limit; update all docs so owners are not guided into a dead path.  
2. **TOC without heading ids** — post templates link `#slug` but no `rehype-slug` (or equivalent). Use `extractHeadings` from `src/lib/content.ts` consistently.  
3. **OG unwired** — `glintOgImage()` does not feed Base `og:image`; optional PNG conversion uses wrong `@resvg/resvg-js` API.  
4. **Playground missing `glintSitemapLastmod()`** — cannot verify lastmod success criterion.  
5. **lastmod mount paths** — map keys `/${collection}/${slug}/` miss Astro `base` and flat mounted slugs.

**Suggestions**

6. Setup guide: GSC property Owner for SA email, not GCP project Owner.  
7. Organization logo: prefer `site.logo \|\| site.favicon`.  
8. Resolve author Person from `team.json`, not raw frontmatter id.  
9. Normalize `links.json` keys to lowercase on load (lookup already lowercases).  
10. RSS: HTML for `content:encoded` or document markdown choice.  
11. Unit tests for lastmod, remark-links, extractHeadings, pure indexing helpers.  
12. Uplift plan status → **in progress** (not “implemented”); keep this brand board empty until true.  
13. Prefer brand 1f/2a–2c over more engine surface for next calendar week.

**Nits**

14. Soften “maximises citation potential” comments on llms-full (eligibility only).  
15. Scaffold `aiCrawlers: "all"` means doctor never nudges “conscious choice” on greenfield.

### 12.5 Plan corrections applied in this revision

- Linked SEO/AEO uplift plan; clarified overlap and Google Indexing non-goal (§0, §7).  
- Engine vs brand table expanded for uplift surfaces (2026-07-22).  
- 3c / 3e marked partial where code exists.  
- Critical files list updated; sequencing prioritizes ops + engine gate before release.  
- Explicit: brand board still critical path; uplift ≠ organic done.

### 12.6 Recommended next steps (ordered)

1. Fix uplift blockers (TOC, OG wire-or-drop, lastmod + playground, Google Index gate/remove).  
2. Release engine only after those gates; brands `pnpm update` + layout/config PRs.  
3. **1h → 1f → 2a–2c** on all three brands (still Week 1).  
4. `docs/MEASUREMENT.md` + Looker (WS2).  
5. Demand-driven 3a + author FAQ frontmatter (finish 3c in content).  
6. Only then: Phase A metrics / refresh loop.
