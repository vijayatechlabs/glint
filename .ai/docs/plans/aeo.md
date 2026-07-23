# Plan: AEO — Static Headers + Optional Edge Guidance

**Status:** static shipped (headers + docs); edge remains brand opt-in  
**Date:** 2026-07-23  
**Owner:** Glint engine  
**Related:** `docs/AEO.md`, `docs/BLOG-SPEC.md`, `.ai/docs/plans/aeo-edge-worker.md`  
**Philosophy:** Glint is pure static output — adopt everything achievable at build
time; document edge setup for the rest. Never force a runtime dependency. Agents
ask humans before any edge deploy. No third-party AEO product dependencies or
promotions in docs.

---

## 0. Background

AI search and answer engines prefer clean, structured text. Glint already ships
most of that surface statically:

| Already in Glint | Where |
|---|---|
| Origin twins at `/raw/blog/<slug>.md` | `[slug].md.ts.tmpl` + `markdownTwinResponse` |
| HTML `<link rel="alternate" type="text/markdown">` | `Base.astro.tmpl` via `markdownAlternate` |
| Canonical `Link` on twin response | twin helper |
| `llms.txt` + `llms-full.txt` | templates |
| AI crawler policy | `robots.txt.ts.tmpl` + `site.aiCrawlers` |

**Optional gap:** same-URL content negotiation (`Accept` / bot UA) and public
`/blog/<slug>.md` aliases need edge compute — brand-owned, human-approved
(see `aeo-edge-worker.md` and `docs/AEO.md`).

---

## 1. Disposition

| Surface | Strategy | Status |
|---|---|---|
| Twin `Content-Type: text/markdown; charset=utf-8` | Framework helper | ✅ done |
| `X-Markdown-Tokens`, `X-Robots-Tag`, `Vary`, `X-AEO-Version`, `nosniff` | Framework helper | ✅ done |
| Twin body | Post markdown body | ✅ done |
| HTML `<link rel=alternate>` | Theme | ✅ done |
| HTTP `Link` + HTML `Vary` on HTML | Edge guidance | 📝 optional |
| Accept / bot UA / 406 | Edge guidance | 📝 optional |
| Public `/blog/<slug>.md` rewrite | Edge guidance | 📝 optional |
| doctor WARN for twin headers | Framework | ✅ done |
| `docs/AEO.md` agent/human contract | Framework + sync | ✅ done |

---

## 2. Design decisions

### 2.1 Token count

`Math.ceil(Buffer.byteLength(body, "utf-8") / 4)` — heuristic only.

### 2.2 Edge is brand concern

Engine provides reference notes only. Brands deploy Workers only with human
approval. Host-agnostic static deploys stay the default.

### 2.3 Origin path

Keep `/raw/blog/<slug>.md`. Optional public `.md` aliases are edge-only.

### 2.4 Docs policy

User- and agent-facing docs describe **Glint behaviour** only. No external AEO
product names, links, or CLI score promotion.

---

## 3. Files (static work)

| File | Change |
|---|---|
| `src/lib/aeo-twin.ts` | Headers helper |
| Scaffold + playground twin routes | Use helper |
| `src/cli/commands/doctor.ts` | WARN missing headers |
| `src/cli/commands/migrate.ts` | Preserve/upgrade markdown Content-Type |
| `docs/AEO.md` + scaffold copy | Agent/human contract |
| `.ai/docs/plans/aeo-edge-worker.md` | Optional edge reference |

---

## 4. Verification (static)

```bash
curl -sI https://<brand>/raw/blog/<slug>.md | grep -iE \
  'content-type|x-markdown|x-robots|vary|x-aeo|x-content-type'
```

Edge verification: only after human approval — see `aeo-edge-worker.md`.

---

## 5. Out of scope

- Runtime content negotiation inside the engine package
- Required edge worker for every brand
- Non-blog page twins
- Third-party AEO CLIs as a Glint dependency
