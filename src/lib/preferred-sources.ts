/**
 * Google Preferred Sources helpers (Search Central, last updated 2026-08-20 UTC).
 *
 * Official rule: only domain-level and subdomain-level sites are eligible in
 * the source preferences tool. A subdirectory (example.com/blog) is not its
 * own source — the button still adds the host.
 *
 * Eligibility ≠ citation. The button is a reader signal for Top Stories /
 * AI Mode / AI Overviews, not a ranking or AEO KPI.
 */

export const PREFERRED_SOURCES_SCRIPT =
  "https://news.google.com/swg/js/v1/publisher.js";

export const PREFERRED_SOURCES_DEEPLINK_BASE =
  "https://www.google.com/preferences/source";

/** Attribute Search Central's standard button looks for. */
export const PREFERRED_SOURCES_BUTTON_ATTR = "google-add-preferred-source-btn";

export const PREFERRED_SOURCES_MARKERS = [
  PREFERRED_SOURCES_SCRIPT,
  PREFERRED_SOURCES_BUTTON_ATTR,
  "preferred-sources",
] as const;

export type PreferredSourcesTheme = "light" | "dark";

export interface PreferredSourcesConfig {
  /** Default true when the block is omitted. Set false to suppress the button. */
  enabled?: boolean;
  theme?: PreferredSourcesTheme;
  /** BCP 47 override; omit to use the reader language. */
  lang?: string;
}

export interface PreferredSourceInfo {
  host: string;
  path: string;
  /** Host looks like a registrable domain or subdomain. */
  hostEligible: boolean;
  /**
   * True only when the URL path is `/`.
   * Search Central: `https://www.example.com/blog` is not eligible as its own source.
   */
  pathIsDistinctSource: boolean;
  deeplink: string;
}

function parseHostAndPath(domainOrUrl: string): { host: string; path: string } {
  const raw = domainOrUrl.trim();
  if (!raw) return { host: "", path: "/" };
  try {
    const href = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw.replace(/^\/+/, "")}`;
    const u = new URL(href);
    const host = u.hostname.replace(/\.$/, "").toLowerCase();
    const path = (u.pathname || "/").replace(/\/+$/, "") || "/";
    return { host, path };
  } catch {
    const stripped = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    const [hostPart, ...rest] = stripped.split("/");
    const host = (hostPart ?? "").replace(/\.$/, "").toLowerCase();
    const path = rest.length ? `/${rest.join("/")}`.replace(/\/+$/, "") || "/" : "/";
    return { host, path };
  }
}

/** Resolve the host Google will actually add, plus a deeplink fallback. */
export function preferredSourceHost(domainOrUrl: string): PreferredSourceInfo {
  const { host, path } = parseHostAndPath(domainOrUrl);
  const hostEligible = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
    host,
  );
  const pathIsDistinctSource = path === "/";
  const deeplink = `${PREFERRED_SOURCES_DEEPLINK_BASE}?q=${encodeURIComponent(host)}`;
  return { host, path, hostEligible, pathIsDistinctSource, deeplink };
}

export function preferredSourcesEnabled(
  cfg: PreferredSourcesConfig | undefined | null,
): boolean {
  return cfg?.enabled !== false;
}
