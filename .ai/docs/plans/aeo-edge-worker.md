# Edge Worker Guidance — Optional AEO Content Negotiation

**Status:** reference (not engine code; brand-deployed)  
**Date:** 2026-07-23  
**Related:** `.ai/docs/plans/aeo.md`, **`docs/AEO.md`** (agent/human contract)  
**Scope:** Runtime behaviour that **cannot** be emitted by a static site generator.
Deploy only if a brand wants same-URL Accept / bot-UA negotiation. Static Glint
output still covers most SEO/AEO value without this.

**Agent rule:** do **not** implement this in a brand repo or host without
**explicit human approval**. Summarize risks and wait. Brand-facing summary ships
as `docs/AEO.md` via `glint sync`.

---

## 1. Why this is not engine code

Glint builds pure static HTML + markdown files. Content negotiation requires
inspecting request headers (`Accept`, `User-Agent`) — that only exists at the
edge (CDN Worker / middleware).

| Need | Edge required? | Static Glint |
|---|---|---|
| Twin body + AEO headers | No | `/raw/blog/<slug>.md` |
| Accept / bot UA negotiation | **Yes** | Document only |
| HTML `Vary` / HTTP `Link` | Often yes | HTML `<link rel=alternate>` in head |

---

## 2. Design decisions

### 2.1 Two URL surfaces

| Role | URL | Who |
|---|---|---|
| Optional public twin | `/blog/hello.md` for HTML `/blog/hello/` | Edge |
| Origin twin (Glint) | `/raw/blog/<slug>.md` | `astro build` |

Worker: advertise public twin via HTTP `Link`, serve MD on Accept/bot/direct `.md`,
fetch origin `/raw/…` with a loop-safe internal header.

### 2.2 Negotiation algorithm (RFC 7231)

1. Parse `Accept` with `q` values; ignore `q=0`.
2. Score `text/html` and `text/markdown` (exact, `text/*`, `*/*`).
3. Empty Accept → **html** (unless bot extension).
4. No match → **406**.
5. Higher `q` wins; ties prefer **html**.
6. Optional: only wildcards + known AI bot UA → **markdown**.
7. Never override explicit `Accept: text/html`.

Do **not** treat `*/*` alone as “wants HTML” when bot negotiation is on.

### 2.3 Headers

Markdown (including 404 MD bodies): `Content-Type: text/markdown; charset=utf-8`,
`X-Markdown-Tokens`, `X-Robots-Tag` with `noindex`, `Vary: Accept` (+ `User-Agent`
if bots used). Recommended: `X-AEO-Version: 1.0`, `nosniff`.

HTML with twin: **append** alternate `Link`; ensure `Vary` includes `Accept`.

406: `Vary: Accept` + plain body listing supported types.

### 2.4 Loop safety

Internal subrequests set `X-Glint-AEO-Internal: 1` and skip negotiation when set.

### 2.5 Bot list

Brand-owned UA substring list (GPTBot, ClaudeBot, …). No external package dependency.

---

## 3. Path mapping

```ts
const HTML_POST_PREFIX = "/blog";   // "" when mounted paths are /{slug}/
const ORIGIN_TWIN_PREFIX = "/raw/blog";
```

| Request | Public twin | Origin twin |
|---|---|---|
| `/blog/hello/` | `/blog/hello.md` | `/raw/blog/hello.md` |
| `/blog/hello.md` | same | `/raw/blog/hello.md` |
| Mounted `/{slug}/` | `/{slug}.md` | `/raw/blog/{slug}.md` |

---

## 4. Shared helpers

```typescript
function parseAccept(header: string): { type: string; q: number }[] {
  if (!header.trim()) return [];
  return header.split(",").map((part) => {
    const [rawType, ...params] = part.trim().split(";").map((s) => s.trim());
    let q = 1;
    for (const p of params) {
      const m = /^q\s*=\s*([0-9.]+)$/i.exec(p);
      if (m) q = Math.min(1, Math.max(0, parseFloat(m[1]!)));
    }
    return { type: (rawType || "*/*").toLowerCase(), q };
  });
}

function qualityFor(
  ranges: { type: string; q: number }[],
  media: "text/html" | "text/markdown",
): number {
  let best = -1;
  for (const { type, q } of ranges) {
    if (q <= 0) continue;
    if (type === media || type === "text/*" || type === "*/*") {
      if (q > best) best = q;
    }
  }
  return best;
}

/** Brand-owned starter list — extend as needed. */
const AI_BOT_RE =
  /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Anthropic-ai|Claude-Web|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User|Google-Extended|Applebot-Extended|CCBot|Bytespider|Amazonbot|meta-externalagent|meta-externalfetcher/i;

type Format = "html" | "markdown" | "406";

function negotiate(acceptHeader: string | null, userAgent: string | null): Format {
  const ranges = parseAccept(acceptHeader || "");
  const isBot = AI_BOT_RE.test(userAgent || "");

  if (ranges.length === 0) return isBot ? "markdown" : "html";

  const qHtml = qualityFor(ranges, "text/html");
  const qMd = qualityFor(ranges, "text/markdown");
  if (qHtml < 0 && qMd < 0) return "406";

  if (qHtml >= 0 && qHtml >= qMd) {
    const onlyWildcard =
      ranges.every((r) => r.type === "*/*" || r.type === "text/*") &&
      !ranges.some((r) => r.type === "text/html" || r.type === "text/markdown");
    if (isBot && onlyWildcard) return "markdown";
    return "html";
  }
  if (qMd > qHtml) return "markdown";
  return "html";
}

function appendLink(headers: Headers, twinUrl: string) {
  const value = `<${twinUrl}>; rel="alternate"; type="text/markdown"`;
  const existing = headers.get("Link");
  if (!existing) {
    headers.set("Link", value);
    return;
  }
  if (/rel\s*=\s*"?alternate"?/i.test(existing) && /text\/markdown/i.test(existing)) return;
  headers.set("Link", `${existing}, ${value}`);
}

function ensureVary(headers: Headers, token: string) {
  const parts = (headers.get("Vary") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.some((p) => p.toLowerCase() === token.toLowerCase())) parts.push(token);
  headers.set("Vary", parts.join(", "));
}

function mdHeaders(body: string, varyUa: boolean): HeadersInit {
  const tokens = Math.ceil(new TextEncoder().encode(body).length / 4);
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "X-Markdown-Tokens": String(body.length === 0 ? 0 : Math.max(1, tokens)),
    "X-Robots-Tag": "noindex, follow",
    Vary: varyUa ? "Accept, User-Agent" : "Accept",
    "X-AEO-Version": "1.0",
    "X-Content-Type-Options": "nosniff",
  };
}

function publicTwinPath(pathname: string, htmlPostPrefix: string): string | null {
  let path = pathname;
  if (path.endsWith(".md")) path = path.slice(0, -3);
  path = path.replace(/\/+$/, "") || "";

  if (htmlPostPrefix) {
    const prefix = htmlPostPrefix.replace(/\/+$/, "");
    if (path === prefix || !path.startsWith(prefix + "/")) return null;
    const slug = path.slice(prefix.length + 1);
    if (!slug || slug.includes("/")) return null;
    return `${prefix}/${slug}.md`;
  }
  const slug = path.replace(/^\//, "");
  if (!slug || slug.includes("/")) return null;
  return `/${slug}.md`;
}

function originTwinPath(publicMdPath: string, originTwinPrefix: string): string {
  const slug = publicMdPath.replace(/\.md$/, "").split("/").filter(Boolean).pop()!;
  return `${originTwinPrefix.replace(/\/+$/, "")}/${slug}.md`;
}
```

---

## 5. Cloudflare Worker

```typescript
export interface Env {
  ORIGIN?: string;
}

const HTML_POST_PREFIX = "/blog";
const ORIGIN_TWIN_PREFIX = "/raw/blog";
const INTERNAL = "x-glint-aeo-internal";

// … paste §4 helpers …

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get(INTERNAL) === "1") {
      return fetch(request);
    }

    const url = new URL(request.url);
    const originBase = env.ORIGIN || url.origin;
    const format = negotiate(
      request.headers.get("accept"),
      request.headers.get("user-agent"),
    );

    if (format === "406") {
      return new Response(
        "Not Acceptable\n\nSupported types: text/html, text/markdown\n",
        {
          status: 406,
          headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Accept" },
        },
      );
    }

    const wantsMd = format === "markdown" || url.pathname.endsWith(".md");
    const publicMd = publicTwinPath(url.pathname, HTML_POST_PREFIX);

    if (wantsMd && publicMd) {
      const originPath = originTwinPath(publicMd, ORIGIN_TWIN_PREFIX);
      try {
        const twinRes = await fetch(new URL(originPath, originBase).toString(), {
          headers: { [INTERNAL]: "1" },
        });
        if (twinRes.ok) {
          const body = await twinRes.text();
          return new Response(body, { status: 200, headers: mdHeaders(body, true) });
        }
      } catch {
        /* 404 md below */
      }
      const notFound = "# 404 Not Found\n\nNo markdown twin for this URL.\n";
      return new Response(notFound, { status: 404, headers: mdHeaders(notFound, true) });
    }

    const originReq = new Request(
      env.ORIGIN ? new URL(url.pathname + url.search, env.ORIGIN) : request,
      { headers: new Headers(request.headers) },
    );
    originReq.headers.set(INTERNAL, "1");
    const originRes = await fetch(originReq);
    const headers = new Headers(originRes.headers);
    if (publicMd) {
      appendLink(headers, publicMd);
      ensureVary(headers, "Accept");
    }
    return new Response(originRes.body, {
      status: originRes.status,
      statusText: originRes.statusText,
      headers,
    });
  },
};
```

---

## 6. Vercel middleware (conceptual)

Only if the project runs Edge Middleware. Return a **new `Response`** for markdown
(do not rely on rewrite options for response AEO headers).

```typescript
import { NextRequest, NextResponse } from "next/server";

const HTML_POST_PREFIX = "/blog";
const ORIGIN_TWIN_PREFIX = "/raw/blog";
// … paste §4 helpers …

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const format = negotiate(
    request.headers.get("accept"),
    request.headers.get("user-agent"),
  );

  if (format === "406") {
    return new NextResponse(
      "Not Acceptable\n\nSupported types: text/html, text/markdown\n",
      { status: 406, headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Accept" } },
    );
  }

  const wantsMd = format === "markdown" || pathname.endsWith(".md");
  const publicMd = publicTwinPath(pathname, HTML_POST_PREFIX);

  if (wantsMd && publicMd) {
    const originPath = originTwinPath(publicMd, ORIGIN_TWIN_PREFIX);
    const twinRes = await fetch(new URL(originPath, request.url), {
      headers: { "x-glint-aeo-internal": "1" },
    });
    if (twinRes.ok) {
      const body = await twinRes.text();
      return new NextResponse(body, { status: 200, headers: mdHeaders(body, true) });
    }
    const notFound = "# 404 Not Found\n\nNo markdown twin for this URL.\n";
    return new NextResponse(notFound, { status: 404, headers: mdHeaders(notFound, true) });
  }

  const response = NextResponse.next();
  if (publicMd) {
    appendLink(response.headers, publicMd);
    ensureVary(response.headers, "Accept");
  }
  return response;
}

export const config = { matcher: ["/blog/:path*"] };
```

---

## 7. Netlify Edge Function

```typescript
import type { Context } from "@netlify/edge-functions";

const HTML_POST_PREFIX = "/blog";
const ORIGIN_TWIN_PREFIX = "/raw/blog";
// … paste §4 helpers …

export default async (request: Request, context: Context) => {
  if (request.headers.get("x-glint-aeo-internal") === "1") {
    return context.next();
  }

  const url = new URL(request.url);
  const format = negotiate(
    request.headers.get("accept"),
    request.headers.get("user-agent"),
  );

  if (format === "406") {
    return new Response(
      "Not Acceptable\n\nSupported types: text/html, text/markdown\n",
      { status: 406, headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Accept" } },
    );
  }

  const wantsMd = format === "markdown" || url.pathname.endsWith(".md");
  const publicMd = publicTwinPath(url.pathname, HTML_POST_PREFIX);

  if (wantsMd && publicMd) {
    const originPath = originTwinPath(publicMd, ORIGIN_TWIN_PREFIX);
    const twinRes = await fetch(new URL(originPath, url.origin), {
      headers: { "x-glint-aeo-internal": "1" },
    });
    if (twinRes.ok) {
      const body = await twinRes.text();
      return new Response(body, { status: 200, headers: mdHeaders(body, true) });
    }
    const notFound = "# 404 Not Found\n\nNo markdown twin for this URL.\n";
    return new Response(notFound, { status: 404, headers: mdHeaders(notFound, true) });
  }

  const originRes = await context.next();
  const headers = new Headers(originRes.headers);
  if (publicMd) {
    appendLink(headers, publicMd);
    ensureVary(headers, "Accept");
  }
  return new Response(originRes.body, {
    status: originRes.status,
    statusText: originRes.statusText,
    headers,
  });
};

export const config = { path: "/blog/*" };
```

---

## 8. Verification (after human-approved deploy)

```bash
BRAND=https://<brand>
SLUG=<slug>

curl -sI -H "Accept: text/markdown" "$BRAND/blog/$SLUG/" | grep -i content-type

curl -sI \
  -H "User-Agent: Mozilla/5.0 (compatible; GPTBot/1.0)" \
  -H "Accept: */*" \
  "$BRAND/blog/$SLUG/" | grep -i content-type

curl -sI -H "User-Agent: GPTBot/1.0" -H "Accept: text/html" \
  "$BRAND/blog/$SLUG/" | grep -i content-type

curl -sI -H "Accept: image/png" "$BRAND/blog/$SLUG/"

curl -sI "$BRAND/blog/$SLUG/" | grep -iE '^(vary|link):'
curl -sI "$BRAND/raw/blog/$SLUG.md" | grep -i content-type
```

---

## 9. When to deploy

| Scenario | Recommendation |
|---|---|
| Strong SEO + AI-readable twins | **Skip** edge |
| Same-URL Accept negotiation | Human-approved worker |
| No edge compute | Static only |

---

## 10. Out of scope

- Worker package inside `@vijayatech/glint`
- Required third-party AEO tools
- Non-blog page twins
