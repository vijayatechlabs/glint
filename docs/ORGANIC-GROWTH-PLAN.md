# Glint — Organic Growth & Measurement Plan

From "no visible results" to measurable organic + AEO growth across the Glint brand sites.

**Canonical path:** `docs/ORGANIC-GROWTH-PLAN.md`  
**Related design plan (IndexNow only):** `.ai/docs/plans/indexnow.md`  
**OpenStart AEO standard:** sibling repo `OpenStart` → AEO-FRAMEWORK §8.4–§8.5  

Updated: **2026-07-17** (aligned with shipped IndexNow + analytics scaffolding).

---

## 0. Relationship to IndexNow (overlap vs contradiction)

| | **This plan (organic growth)** | **IndexNow plan** (`.ai/docs/plans/indexnow.md`) |
|--|--------------------------------|--------------------------------------------------|
| **Scope** | Full growth system: analytics, GSC/Bing, content strategy, AI traction, metrics loop | **One protocol**: notify engines of URL add/update/delete |
| **Owns** | Sequencing, brand rollout, measurement runbook, content plays | CLI, Astro integration, migrate, keyLocation, durable cursor |
| **Overlap** | Workstream **1c** *is* IndexNow rollout + Bing registration | Implementation detail for 1c |
| **Contradiction?** | **No** — if this doc defers protocol rules to the IndexNow plan | Older drafts of *this* doc contradicted (build-time ping, `indexNow?: string`, sync-only rollout). **Those are fixed below.** |

**Rule:** Protocol behavior (when to ping, SHA cursor, 200/202, mounts, twins) lives in  
`.ai/docs/plans/indexnow.md` + code. This plan only says **when brands turn it on** and how it fits GSC/Bing/GA.

**Honest non-claim (shared):** IndexNow 200/202 = **receipt only**. It does not guarantee crawl, ranking, or ChatGPT/Perplexity citations.

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

### Engine vs brand status (2026-07-17)

| Capability | Engine tree | Brands live |
|------------|-------------|-------------|
| `analytics` / `verification` in site.config | ✅ scaffold (`glint new`) | ⬜ fill + deploy |
| GA4/verification in `Base.astro` | ✅ template | ⬜ existing sites need layout update |
| IndexNow key file + twin sitemap inject | ✅ `glintIndexNow()` | ⬜ migrate + key |
| Post-deploy `glint indexnow` | ✅ CLI | ⬜ cursor + host hook |
| Doctor WARNs (GA / GSC / IndexNow) | ✅ | ⬜ after update |

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

**3c.** FAQ/HowTo JSON-LD on post template (BLOG-SPEC roadmap).

**3d.** After ~2–4 weeks GSC data: refresh pos 5–20 pages; bump `updatedAt`; internal links;
`glint indexnow` for changed URLs.

**3e.** Directories, original data, communities, light PR, Organization/Person + sameAs.

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
- Don't treat `llms.txt` or IndexNow as citation guarantees.  
- Don't default IndexNow to full historic sitemap or `HEAD~1` cursor.  
- Don't claim `glint sync` alone rolls out Base.astro / IndexNow integration.

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

- `src/scaffold/theme/src/layouts/Base.astro.tmpl` — GA + verification  
- Post template — FAQ/HowTo (3c, TODO)  
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

1. **Now / Week 1:** **1h** (CF bots) + **1g** (naam GA) + engine release if needed + **1f brand rollout** (analytics + IndexNow migrate) + **2a–2c**  
2. **Week 1–2:** 2d–2e dashboard + citation tracker  
3. **Week 2+:** WS3 in priority order (3a → 3c → 3d → 3b → 3e) + community/entity plays  
4. **Week 4+:** metrics Phase A  
5. **Parallel optional:** CF AI Search, api-catalog Worker  

---

## 11. Brand rollout status board

| Brand | Package update | migrate indexnow | Config filled | GSC | Bing + IndexNow key | GA live | CF bots audited |
|-------|----------------|------------------|---------------|-----|---------------------|---------|-----------------|
| naam-blog | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| vijayatech-blog | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| zira-landing/blog | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
