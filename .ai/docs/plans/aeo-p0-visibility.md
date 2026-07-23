# Plan: AEO P0 visibility improvements (Glint)

**Status:** P0–P1 implemented (2026-07-23)  
**Date:** 2026-07-23  
**Owner:** Glint engine  
**Related:**  
- `docs/AEO.md`, `docs/UPGRADE.md`  
- OpenStart sibling plan: `openstart/.ai/docs/plans/aeo-p0-visibility.md` (sites)  
- Prior: `seo-aeo-uplift.md`, `aeo.md`, `aeo-edge-worker.md`  
**Goal:** Better SEO + AI citation **eligibility** for blogs—paired with OpenStart sites. No ranking guarantees.

---

## 0. Context

Technical AEO (twins, headers, IndexNow honesty, robots modes) largely shipped.  
2026 market signals push:

1. Retrieval vs training bot clarity  
2. Bing Webmaster + IndexNow as AI-adjacent path (Google still GSC/sitemap)  
3. Platform-native markdown negotiation (e.g. Cloudflare Markdown for Agents)  
4. Discoverable twins in sitemaps for all brands  
5. `llms.txt` / `llms-full` quality (avoid empty clones)  
6. Pre-draft research architecture + light measurement  

OpenStart owns **sites/landings**; Glint owns **blog runtime**. Shared eligibility bar; content handoff keeps app ↔ posts in sync.

---

## 1. Deliverables

### P0 — must ship next

| ID | Deliverable | Notes |
|----|-------------|--------|
| G1 | **Paired-brand AEO checklist** | Short section in `docs/AEO.md` + link from `docs/UPGRADE.md`: when brand has OpenStart app + Glint blog, who owns what (site vs blog), IndexNow/Bing/GSC split, handoff |
| G2 | **Doctor: `llms.txt` / `llms-full` quality** | WARN if: twin/llms routes missing; `llms-full` missing when many public posts; optional: body of full ≈ index (byte similarity); robots blocks AI bots while `aiCrawlers: all` |
| G3 | **Bing Webmaster as first-class** | Doctor/onboard soft WARN: verification.bing empty when published posts exist; docs: IndexNow complements Bing, not Google |
| G4 | **robots retrieval lists refresh** | Align `retrieval-only` allow-list with ChatGPT-User, OAI-SearchBot, Perplexity-User, Claude-User (etc.); document training vs retrieval in `docs/AEO.md` |

### P1 — next wave

| ID | Deliverable | Notes |
|----|-------------|--------|
| G5 | **Twins in sitemap for all brands** | Default path: post-build inject `/raw/blog/<slug>.md` (priority ~0.4–0.5) via existing IndexNow/sitemap helpers or `glintSitemapLastmod` extension—not playground-only hand-roll |
| G6 | **Edge docs: CF Markdown for Agents** | Update `docs/AEO.md` + `aeo-edge-worker.md`: prefer host-native Accept→markdown when on Cloudflare; custom Worker when brand needs Glint twin bodies/headers |
| G7 | **Accept `text/plain` + `text/markdown`** | Document in edge guidance (agents send both) |
| G8 | **Pipeline: question/gap map before draft** | One step in `docs/pipeline/plan.md` or draft play: map target queries, who owns AI answers today, evidence gap—no citation promise |
| G9 | **AI referral measurement pointer** | Link OpenStart GA4 AI-referral pattern; optional doctor WARN if analytics empty |

### P2 — later

| ID | Deliverable |
|----|-------------|
| G10 | Quarterly AI bot-list refresh process (doc + doctor fixture) |
| G11 | Log-based verify playbook (`curl` + sample log greps for GPTBot/`/raw`) |
| G12 | Entity/sameAs deeper team.json resolution (beyond empty social WARN) |

---

## 2. Out of scope

- Citation-guarantee tools or paid AEO scoreboards  
- Google Indexing API for BlogPosting  
- Requiring edge Workers for every brand  
- Third-party AEO product promotion  

---

## 3. Implementation notes

### G2 doctor sketch

- Find `llms.txt.ts` / `llms-full.txt.ts` (or dist after build—prefer source templates)  
- WARN missing when `collections` includes blog + published posts  
- If both files exist as source strings and full lacks body markers / size ≈ index → WARN “llms-full may be a stub”  

### G5 sitemap twins

- Prefer extending `injectTwinUrlsIntoSitemaps` / always-on post-build step even without IndexNow key  
- Keep `noindex` on twin HTTP headers so HTML remains canonical  

### G6 docs only unless brand on CF

- Code optional later: detect `deployTarget: cf-pages` and emit `_headers` or doc snippet for Markdown for Agents  

---

## 4. Verification

```bash
pnpm test && pnpm typecheck
# playground
pnpm glint doctor --dir examples/playground
# after G5: sitemap contains /raw/blog/
curl -s https://<brand>/sitemap-index.xml | head   # or sitemap-0 / hand-roll
```

Cross-check OpenStart plan G1/O1 stay consistent.

---

## 5. Success criteria

- [x] Paired OpenStart+Glint checklist lives in Glint `docs/AEO.md`  
- [x] Doctor WARNs on weak/missing llms surfaces when posts exist  
- [x] Bing verification nudge exists  
- [x] robots retrieval list documented + templates updated  
- [x] Twins in sitemap via `glintSitemapLastmod` (always-on)  
- [x] Edge docs: CF Markdown for Agents + Accept plain/md  
- [x] Pipeline question/gap map in plan play  
- [x] CHANGELOG `[Unreleased]` updated on implement  

---

## 6. Sequence

1. Docs: G1, G3, G4 (docs), G6–G7 (docs) — no runtime risk  
2. Doctor: G2, G3, G4 (templates)  
3. Sitemap twins: G5  
4. Pipeline: G8  
5. Measurement pointer: G9  

---

## 7. Joint matrix (keep in sync with OpenStart)

| Surface | OpenStart (site) | Glint (blog) |
|---------|------------------|--------------|
| Twins + AEO headers | Examples + standard | Engine default |
| llms.txt / full | Examples + skill | Templates + doctor |
| robots AI policy | Examples + modes | Templates + `aiCrawlers` |
| IndexNow | Adapter + Next helper | CLI + migrate |
| Edge Accept | Docs, human gate | Docs, human gate (+ CF native note) |
| Content handoff | `content.sh` → blog | `/plan` drains inbox |
