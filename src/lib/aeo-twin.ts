/**
 * AEO helpers for static markdown twins.
 *
 * Origin twins live at `/raw/blog/<slug>.md`. Headers are applied at build time.
 * Accept / bot-UA negotiation cannot run in static output — see docs/AEO.md
 * (edge is opt-in, human-approved).
 */

/** Substrings that should appear in a twin route source (doctor / migrate). */
export const AEO_TWIN_HEADER_MARKERS = [
  "text/markdown",
  "X-Markdown-Tokens",
  "X-Robots-Tag",
  "X-AEO-Version",
  "X-Content-Type-Options",
  "Vary",
] as const;

export interface MarkdownTwinHeaderOptions {
  /** Absolute HTML canonical URL for this post (Link rel=canonical target). */
  htmlUrl: string;
}

/**
 * Response headers for a Glint origin markdown twin.
 * Token count: UTF-8 byte length / 4 (heuristic for AI client budgeting).
 * Non-empty bodies report at least 1 token.
 */
export function markdownTwinHeaders(
  body: string,
  opts: MarkdownTwinHeaderOptions,
): Record<string, string> {
  const raw = Math.ceil(Buffer.byteLength(body, "utf-8") / 4);
  const tokens = body.length === 0 ? 0 : Math.max(1, raw);
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": "inline",
    Link: `<${opts.htmlUrl}>; rel="canonical"`,
    "X-Robots-Tag": "noindex, follow",
    "X-Markdown-Tokens": String(tokens),
    Vary: "Accept, User-Agent",
    "X-AEO-Version": "1.0",
    "X-Content-Type-Options": "nosniff",
  };
}

/** Build a standard twin Response (200). */
export function markdownTwinResponse(
  body: string,
  opts: MarkdownTwinHeaderOptions,
): Response {
  return new Response(body, {
    status: 200,
    headers: markdownTwinHeaders(body, opts),
  });
}
