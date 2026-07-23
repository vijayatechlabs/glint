# AEO in Glint

How this brand blog stays readable by people **and** AI search/answer engines —
**what Glint does automatically**, and **what needs a human** before any CDN/edge
change.

Glint is git-native: content lives in the repo next to the product/site context.
Agents author in the IDE; humans approve via PR; the build emits static SEO/AEO
surfaces. No separate CMS runtime.

---

## Framework (automatic)

| Output | Path / behaviour |
|---|---|
| Markdown twin | `/raw/blog/<slug>.md` with AEO response headers |
| HTML alternate | `<link rel="alternate" type="text/markdown">` on post pages |
| AI index | `/llms.txt`, `/llms-full.txt` |
| Crawler policy | `robots.txt` from `data/site.config.ts` → `aiCrawlers` |

Twin headers come from `markdownTwinResponse` (`@vijayatech/glint`):
`Content-Type: text/markdown; charset=utf-8`, `X-Markdown-Tokens`,
`X-Robots-Tag: noindex`, `Vary`, `X-AEO-Version`, `nosniff`, canonical `Link`.

```bash
curl -sI https://<this-domain>/raw/blog/<slug>.md | grep -iE \
  'content-type|x-markdown|x-robots|vary'
```

`glint doctor` warns if the twin route is missing those headers.

---

## Edge (per project — human approval required)

These **cannot** ship inside static Glint output:

- `Accept: text/markdown` → serve markdown on the HTML URL  
- AI bot User-Agent routing → markdown  
- `406` when Accept is neither HTML nor markdown  
- HTTP `Link: <…md>; rel="alternate"` + HTML `Vary: Accept`  
- Optional public twin URL `/blog/<slug>.md` rewritten to `/raw/blog/<slug>.md`

### Rules for AI agents

1. **Do not** deploy Cloudflare Workers, Vercel/Netlify middleware, or change
   CDN routes without **explicit human approval**.
2. If negotiation or edge AEO is requested:
   - Explain what the edge worker does and which host applies
   - Point at `docs/AEO.md` and (if present in the engine) 
     `.ai/docs/plans/aeo-edge-worker.md`
   - **Wait for a human yes**
3. After approval only: implement in **this brand’s** deploy config; keep Glint
   static. Re-check with the curl commands above on the live URL.

### When to skip edge

Static twins + `llms.txt` already help AI systems fetch clean content. Deploy
edge only when the brand explicitly wants same-URL content negotiation.

---

## Upgrade twin route

```ts
import { markdownTwinResponse } from "@vijayatech/glint";

return markdownTwinResponse(post.body ?? "", {
  htmlUrl: "https://example.com/blog/my-post/",
});
```

After upgrading `@vijayatech/glint`, follow **`docs/UPGRADE.md`**, then re-check with `glint doctor`.
