# Plan: IndexNow runtime in Glint

**Status:** **implemented in tree** (2026-07-17) — review fixes applied  
**Date:** 2026-07-17  
**Owner:** Glint engine  
**Related:** OpenStart AEO standard → sibling `OpenStart/.ai/docs/plans/indexnow.md`  
**Code:** `src/lib/indexnow.ts`, `src/cli/commands/indexnow.ts`, `migrate.ts`, `src/integration/indexnow.ts`  
**Protocol:** [indexnow.org/documentation](https://www.indexnow.org/documentation)

### Shipped vs residual

| Item | Status |
|------|--------|
| Git delta + deletes + twins | ✅ |
| Durable `--since-sha` (no HEAD~1 default) | ✅ |
| Root keyLocation via origin when mounted | ✅ |
| `glintIndexNow` key + twin sitemap inject | ✅ |
| Twin headers + alternate + Link canonical | ✅ templates |
| `glint migrate indexnow` | ✅ |
| Auto-advance GH cursor var | residual (reminder only) |
| Host-specific deploy webhook recipes | residual (docs) |

---

## 0. Review verdict (approval blockers)

High-level architecture stands: **key at build time · notify only when URL is live · engine owns runtime**.  
**Do not implement the previous draft unchanged.** P0 gaps below must be designed into P0/P1.

| # | Blocker | Required fix |
|---|---------|----------------|
| B1 | RSS-only misses **edits** and **deletes** | Primary = **git/content deploy manifest**; RSS = fallback for net-new posts only |
| B2 | `.glint/*` state dies on fresh GHA runners | No local-only state as source of truth; use **git SHA range** or durable remote store |
| B3 | Wait-for-key/RSS can see **previous** deploy | Require **deploy completion signal** (not blind push→poll) |
| B4 | Mounted `/blog` cannot own root `/{key}.txt` | Explicit **scoped `keyLocation`** design |
| B5 | `glint sync` does **not** rewrite astro/theme | Explicit **migration path** beyond current sync buckets |
| B6 | Workflow assumed `npm ci` + non-existent script | Package-manager-aware template + real `glint indexnow` only |

---

## 1. Goal

1. Key verification file always in build artifact (including plain `astro build`).
2. HTTP submit runs **after this deploy is live**, with a completion signal.
3. Submit **added + updated + deleted** URLs (protocol supports all three) — not full historic bulk on every run or first enable.
4. Mounted blogs use correct **path-scoped** key location.
5. Align with: `merge → build → deploy → IndexNow`.

---

## 2. Current state (verified 2026-07-17)

| Piece | Today |
|-------|--------|
| Config | `indexNow` in `data/site.config.ts` |
| Key file | Written only in `pingIndexNow` during `glint build` |
| Ping | After `npm run build` inside `glint build` only |
| URL set | Every `<loc>` in every `sitemap*.xml` (includes **sitemap-index** entries — bug) |
| Diff / deletes | None |
| State | None durable |
| Sync | Docs/scripts/agent files only — **not** `astro.config`, routes, headers |

### Known failures

1. CI using `npm run build` skips ping + key write path.
2. Build-time ping races deploy (key 404 → 403).
3. Full-sitemap resubmit + index `<loc>` pollution.
4. No edit/delete detection.

---

## 3. Principles

1. **Split write vs submit** — build emits key file; post-deploy submits.
2. **Change source of truth = deploy content delta**, not RSS `pubDate`.
3. **Live gate = this revision**, not “any 200 on a stable key URL.”
4. **Public URLs only** — drafts/members out; deletions still submitted when URL left the public set.
5. **One ping path per brand** (GH Action **or** Coolify post-deploy — not both).
6. **Protocol-honest** — 200/202 = receipt only; never claim crawl, ranking, or ChatGPT fetch.
7. **Git-native process** — scaffolded workflow + CLI; secrets once per brand.

---

## 4. Target architecture

```
  merge to main
       │
       ▼
  build (astro + pagefind)
       │  astro:build:done → key file at configured key path in dist/
       ▼
  deploy finishes  ──►  completion signal (needs: deploy | webhook | revision marker)
       │
       ▼
  glint indexnow
       │  1. resolve URL delta (git/content primary)
       │  2. expand twins for post URLs
       │  3. public-URL gate (200 / 301|404|410 for deletes)
       │  4. POST batches ≤10k; handle 200/202/429
       ▼
  logs + optional durable cursor (SHA), not ephemeral “last 20”
```

---

## 5. Deliverables

### 5.1 Shared module — `src/lib/indexnow.ts`

| Function | Behavior |
|----------|----------|
| `readIndexNowConfig(dir)` | `baseUrl`, `indexNow` key, **`keyLocation` strategy**, mount path |
| `validateKey(key)` | 8–128 chars; `[A-Za-z0-9-]` only ([protocol](https://www.indexnow.org/documentation)) |
| `writeIndexNowKeyFile(distDir, key, relativePath)` | UTF-8 body = key only |
| `resolveKeyLocation(cfg)` | Root or mount-scoped URL (see §5.4) |
| `collectPageUrlsFromSitemaps(...)` | **Recursively** resolve sitemap indexes → urlsets; **never** treat index `<loc>` as a page |
| `computeUrlDelta(opts)` | See §5.3 — primary change source |
| `expandTwins(urls, cfg)` | HTML post → pair `/raw/...md` |
| `gatePublicUrls(delta)` | Adds/updates: expect **200** on canonical host; deletes: allow **301/404/410** |
| `submitIndexNow(payload)` | Batch ≤ **10_000**; honor **Retry-After** on 429; treat **200 and 202** as accepted receipt; log body/status; concurrency lock |
| `load/storeCursor` | Durable deploy SHA only (see §5.3b) — **not** GHA workspace file as sole state |

Remove fragile regex config parse when a clean load path exists; keep fallback only for doctor.

### 5.2 Key file at build time — Astro integration

`glintIndexNow()` (or extend sitemap integration) on `astro:build:done`:

- Write key file to configured dist path.
- **No HTTP submit** here.
- Registration: **new sites** via `glint new`; **existing sites** via explicit migration (§5.5) — **not** assumed free `glint sync` today.

Optional: also emit under `public/` for source-tree presence when path is under site root/base.

### 5.3 URL delta — **git/content first; RSS fallback only**

#### Primary (required default): deploy content manifest

Recommended approach:

```
glint indexnow --since-sha <previous-deployed-sha> --sha <current-sha>
```

Derive changed public URLs from:

1. **Git diff** `previous..current` on content paths (`content/**`, redirects, etc.).
2. Map paths → public HTML URLs (and twins) using the same rules as build (`draft`, `publishedAt`, mount).
3. **Deleted/renamed** content → old public URLs in `urlList` (IndexNow supports deleted URLs).
4. **Edits** (same slug, body/frontmatter change) → resubmit HTML + twin even if `publishedAt` unchanged.

`previous-deployed-sha` sources (pick one durable strategy; document per host):

| Strategy | When |
|----------|------|
| **A. Git tag / GH environment variable** updated only after successful deploy + IndexNow | Recommended for GH-deployed brands |
| **B. `repository_dispatch` payload** from Coolify includes `sha` | Coolify primary deploy |
| **C. Remote object** (R2/S3/MinIO) `indexnow-cursor.json` `{ sha, updatedAt }` with **compare-and-swap / lock** | Multi-runner / concurrent deploys |

**Rejected as sole state:** `.glint/indexnow-state.json` on the Actions runner (ephemeral → re-submits “last N” forever).

#### Fallback: RSS (net-new only)

- Use live `/rss.xml` **only** when no prior SHA exists **and** operator passes `--fallback-rss`.
- RSS `pubDate` **cannot** detect in-place edits or deletions — never claim it does.
- On first enable: **do not** auto-submit full historic sitemap. Options:
  - submit only URLs in **this** deploy’s git range, or
  - require explicit `--bootstrap` with a capped list / confirmation.

#### Explicit contradiction fix

| Situation | Behavior |
|-----------|----------|
| First enable, no cursor | Submit **this deploy’s delta only** (or empty + warn). **Not** full site. |
| Recovery / known under-submit | Operator `--bootstrap` or `--full` (batched, logged, rare) |
| Steady state | SHA-range delta + deletes |

### 5.3b Concurrency

- Mutex: remote lock key or GH `concurrency: group: indexnow-${{ github.repository }}` + cancel-in-progress false with serial queue.
- Two merges must not both read the same prior SHA and both advance cursor without merging deltas.
- Cursor advances **only** after accepted receipt (**200 or 202**) for the batch (or partial success policy: advance only URLs accepted).

### 5.3c Response handling (protocol)

| HTTP | Meaning | Action |
|------|---------|--------|
| **200** | Submitted successfully (receipt) | Log; count success |
| **202** | Received; **key validation pending** | **Valid success for first response** — log; do not treat as failure; optional re-check later |
| 400 | Bad format | Fail job; fix payload |
| 403 | Key invalid / not found | Fail; print keyLocation |
| 422 | URL/host/key schema mismatch | Fail; check mount scoping |
| 429 | Rate limit | Backoff using **Retry-After**; re-batch |

Max **10_000** URLs per POST. Retain submission logs (CI artifact or remote log).

### 5.4 Key location — root vs mounted blog

| Deploy shape | Key file location | `keyLocation` | Allowed `urlList` prefix |
|--------------|-------------------|---------------|---------------------------|
| Standalone site at host root | `https://domain/{key}.txt` | root (Option 1 preferred) | entire host |
| Mounted `/blog` (or other base) | Prefer **parent hosts root key** (Option 1) | root | entire host if parent agrees |
| Mounted, parent cannot host key | `https://domain/blog/{key}.txt` (under mount) | that exact URL | **only** URLs under `https://domain/blog/` ([path-scoped keys](https://www.indexnow.org/documentation)) |

Config sketch:

```ts
indexNow: {
  key: "…",                    // validated 8–128 [A-Za-z0-9-]
  // default: "root" | "base" derived from mount
  keyPath: "root" | "base",    // base → `${base}/{key}.txt`
}
```

Hard-coding root `keyLocation` for `/blog` mounts is a **bug**. Doctor must WARN if mount ≠ `/` and keyPath is root without parent confirmation flag.

### 5.5 Migration mechanism (sync is not enough)

**Today:** `glint sync` buckets do **not** alter `astro.config`, theme routes, or brand-owned scaffolds.

**Required for this feature:**

| Change | Delivery |
|--------|----------|
| Register `glintIndexNow` / sitemap twin injection | `glint new` for greenfield; **`glint migrate indexnow`** (or `doctor --fix` interactive) for existing brands |
| Twin headers on `raw/**` routes | Same migrate: patch known template paths **or** document manual patch list with checksums |
| Post-page markdown `alternate` | Same |
| `.github/workflows/indexnow.yml` + wait script | Engine-generated: may go through **new sync bucket** “engine CI templates” **or** migrate command that writes if missing / `--force` |
| Brand-owned files already customized | Migrate **never** silent-overwrite; print diff / dry-run |

Plan must not say “`glint sync` alone rolls out IndexNow to naam/zira.”

### 5.6 CLI — `glint indexnow`

```
glint indexnow [--dir .]
  --since-sha <sha> | --since-ref <tag>
  --sha <sha>                 # default: HEAD
  --fallback-rss              # only if no since-sha
  --bootstrap | --full        # rare; explicit
  --dry-run
  --json-log
```

Steps:

1. Load + validate config/key/keyLocation.
2. Compute delta (§5.3).
3. Expand twins for post URLs.
4. Public URL gate.
5. Submit batches; handle 200/202/429.
6. Advance durable cursor only on accepted batches.
7. Soft-fail network only if configured; default CI: non-zero on 4xx (except retryable 429 exhausted).

### 5.7 Deploy completion signal (not blind poll)

| Host | Signal |
|------|--------|
| **GH deploys** (wrangler etc.) | Same workflow: `needs: [deploy]` then IndexNow |
| **Coolify** | Post-deploy command with `$GIT_COMMIT` **or** webhook → `repository_dispatch` with `sha` |
| **CF Pages git-connected** | Prefer Cloudflare deploy hook / Pages deploy status API; **do not** use “key file 200” alone as proof of **new** revision |
| **Revision marker (optional)** | Build embeds `meta name="glint-sha" content="{sha}"` or `/.glint-revision`; wait until production returns **expected sha** |

Wait-for-key remains a **secondary** check (key must be 200 for 202→200 path) after revision match.

### 5.8 Twin sitemap + headers + canonical policy

**Sitemap:** inject **all** public twin URLs at lower priority; recursive sitemap collection for IndexNow must not use index locs as pages.

**Headers (twin route):**

```ts
headers: {
  "Content-Type": "text/plain; charset=utf-8", // compatibility experiment — see note
  "Content-Disposition": "inline",
  "Link": `<${htmlUrl}>; rel="canonical"`,     // reduce duplicate competition
}
```

- `text/plain` + `inline`: **evidence-labelled compatibility experiment** (field report), not an uncritical forever requirement; keep HTML `alternate type="text/markdown"`.
- Low sitemap priority **does not** replace canonical policy — set **Link canonical → HTML** on twins (and/or noindex if product decides twins are AI-only; default = canonical to HTML so twins don’t compete).

**IndexNow:** submit HTML + twin on add/update; on delete submit both old URLs.

### 5.9 Doctor

WARN/ERROR when:

- Published public content + empty/invalid key.
- Mount + wrong keyPath / missing parent root key.
- Missing migrate for integration when doctor detects no key file in last build artifact (if available).
- No durable IndexNow path (no workflow **and** no Coolify post-deploy documented in site config).
- Sitemap collector would still scrape index locs (self-test).

### 5.10 GH Actions template (engine-owned, honest)

Materialize via **migrate / new**, not magic sync of theme routes.

```yaml
name: IndexNow
on:
  workflow_dispatch:
  # Prefer: called after deploy job, or repository_dispatch deploy-succeeded
  repository_dispatch:
    types: [deploy-succeeded]

concurrency:
  group: indexnow-${{ github.repository }}
  cancel-in-progress: false

jobs:
  indexnow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # need history for git diff
      - uses: pnpm/action-setup@v4   # Glint ecosystem is pnpm-oriented
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: IndexNow
        env:
          SITE_URL: ${{ vars.SITE_URL }}
          INDEXNOW_PREV_SHA: ${{ vars.INDEXNOW_PREV_SHA }}  # or from dispatch client_payload
        run: pnpm exec glint indexnow --since-sha "$INDEXNOW_PREV_SHA" --sha "${{ github.sha }}"
      - name: Advance cursor (example)
        if: success()
        # update GH variable / remote cursor — implementation detail
        run: echo "advance INDEXNOW_PREV_SHA to ${{ github.sha }}"
```

- **Not** `npm ci` + `npx tsx scripts/indexnow.ts` as universal.
- Package manager: detect `pnpm-lock.yaml` / `package-lock.json` in template generator.
- Blind `on: push` without deploy signal is **discouraged** in comments.

### 5.11 Docs

- ARCHITECTURE, AGENT-GUIDE, GETTING-STARTED, ORGANIC-GROWTH-PLAN §1c, CHANGELOG.
- Explicit: IndexNow = notification receipt only.

---

## 6. Out of scope

- Claiming IndexNow causes ChatGPT retrieval, ranking, or training.
- Google Indexing API.
- Silent overwrite of brand-customized theme files.
- Full historic sitemap on first enable by default.

---

## 7. Implementation sequence

| Phase | Work |
|-------|------|
| **P0** | `src/lib/indexnow.ts`: validate key, submit (200/202/429/batch), recursive sitemap helper |
| **P0** | `glint indexnow` with **git SHA delta** + twin expand + delete URLs |
| **P0** | Durable cursor design (GH var or remote) + concurrency group |
| **P0** | Remove default build-time ping |
| **P0** | Deploy-completion contract documented + template uses it |
| **P1** | Key path root vs base; doctor for mounts |
| **P1** | Astro integration key write |
| **P1** | **`glint migrate indexnow`** (integration, headers, alternate, workflow) |
| **P1** | Twin sitemap injection + Link canonical |
| **P2** | RSS fallback only; bootstrap flag; submission log artifacts |
| **P3** | Brand rollout (naam / vijayatech / zira) via migrate + host wiring |

---

## 8. Brand rollout checklist

1. Ship engine release with CLI + migrate.
2. Per brand: `pnpm update @vijayatech/glint` → `pnpm exec glint migrate indexnow --dry-run` → apply.
3. Set key (valid charset/length); choose keyPath for mount.
4. Wire **one** post-deploy signal + durable prev SHA.
5. Confirm key URL 200 **and** revision marker/sha if used.
6. Dry-run IndexNow; then live; check logs for 200/202.
7. Bing Webmaster: register key; spot-check.
8. Confirm no build-time ping / no double path.

---

## 9. Success criteria

- Edits and deletes appear in submissions without `publishedAt` bumps.
- Fresh GHA runner does not re-spam “last 20” from missing local state.
- IndexNow never runs against previous deploy solely because root key is 200.
- Mounted blogs use scoped keyLocation or parent root key intentionally.
- Existing brands get a **migrate** path, not a false promise of `sync`.
- 202 Accepted treated as success-with-pending-key-check.
- Sitemap indexes not submitted as page URLs.

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Wrong prev SHA → missed URLs | Bootstrap + logs; doctor |
| Wrong prev SHA → too many URLs | Batch + 429 backoff |
| Double Coolify + GHA | Config: single path |
| Brand theme drift | migrate dry-run; no silent overwrite |
| Overclaiming AI effects | Docs wording |

---

## 11. Decision log

| Decision | Choice | Why |
|----------|--------|-----|
| Change source | **Git/content SHA delta** primary | Edits + deletes; durable |
| RSS | Fallback net-new only | pubDate blind to edits/deletes |
| First enable | Deploy delta only; no auto full historic | Align plans; avoid spam |
| State | Durable SHA cursor (var/remote) | GHA workspace ephemeral |
| Live gate | Deploy signal / revision | Stable key ≠ new deploy |
| Mounted key | Root preferred; else base-scoped keyLocation | Protocol Option 1/2 |
| Migration | `glint migrate indexnow` | sync cannot patch scaffolds today |
| HTTP 202 | Accept as receipt | Protocol |
| Twin Content-Type | Experiment `text/plain` + canonical Link | Evidence-labelled; avoid dupe SEO |
| Agent | Not sole path | Reliability |

---

## 12. Open questions

1. Cursor store: GH Actions variable API vs R2/MinIO for all brands?
2. Coolify default: post-deploy shell vs `repository_dispatch`?
3. Auto-generate key on `glint new` vs paste from Bing?
4. Twin policy: canonical-to-HTML only vs optional `noindex` for twins?
5. Align OpenStart adapter contract field-for-field with this CLI?
