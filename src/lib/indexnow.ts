import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { splitFrontmatter } from "./content.js";

export interface IndexNowConfig {
  baseUrl: string;
  domain: string;
  mount: string;
  deployTarget: string;
  key: string;
  keyPath: "root" | "base";
}

export interface UrlDelta {
  added: string[];
  updated: string[];
  deleted: string[];
}

/** Regex-parse data/site.config.ts for IndexNow fields. */
export function readIndexNowConfig(dir: string): IndexNowConfig | null {
  const configPath = join(dir, "data/site.config.ts");
  if (!existsSync(configPath)) return null;
  const cfgText = readFileSync(configPath, "utf8");

  const baseUrlMatch = cfgText.match(/baseUrl:\s*["'`](https?:\/\/[^"'`\s]+)["'`]/);
  if (!baseUrlMatch) return null;
  const baseUrl = baseUrlMatch[1]!;

  const domainMatch = cfgText.match(/domain:\s*["'`]([^"'`\s]+)["'`]/);
  let domain = domainMatch ? domainMatch[1]! : "";
  try {
    if (!domain) domain = new URL(baseUrl).hostname;
  } catch {
    return null;
  }

  const mountMatch = cfgText.match(/mount:\s*["'`]([^"'`]*)["'`]/);
  const mount = mountMatch ? mountMatch[1]! : "";

  const deployTargetMatch = cfgText.match(/deployTarget:\s*["'`]([^"'`]+)["'`]/);
  const deployTarget = deployTargetMatch ? deployTargetMatch[1]! : "";

  const indexNowBlockMatch = cfgText.match(/indexNow:\s*(\{[\s\S]*?\}|["'`]([^"'`]*)["'`])/);
  if (!indexNowBlockMatch) return null;

  const block = indexNowBlockMatch[1]!;
  let key = "";
  let keyPath: "root" | "base" = "root";

  if (block.startsWith("{")) {
    const keyMatch = block.match(/key:\s*["'`]([^"'`]+)["'`]/);
    if (keyMatch) key = keyMatch[1]!;
    const keyPathMatch = block.match(/keyPath:\s*["'`](root|base)["'`]/);
    if (keyPathMatch) keyPath = keyPathMatch[1] as "root" | "base";
  } else {
    key = indexNowBlockMatch[2] ?? "";
  }

  if (!key) return null;

  return { baseUrl, domain, mount, deployTarget, key, keyPath };
}

/** IndexNow key: 8–128 chars, [A-Za-z0-9-] only. */
export function validateKey(key: string): boolean {
  return /^[A-Za-z0-9-]{8,128}$/.test(key);
}

/**
 * Where to write the key file in dist, and its public URL.
 * keyPath "root" → always at site origin root (not under baseUrl path).
 * keyPath "base" → under mount path (scoped keyLocation).
 */
export function resolveKeyLocation(cfg: IndexNowConfig): {
  filePath: string;
  url: string;
  urlPath: string;
} {
  const key = cfg.key;
  let origin: string;
  try {
    origin = new URL(cfg.baseUrl).origin;
  } catch {
    origin = cfg.baseUrl.replace(/\/$/, "");
  }

  if (cfg.keyPath === "base" && cfg.mount && cfg.mount !== "/") {
    const cleanMount = cfg.mount.replace(/^\/+|\/+$/g, "");
    const urlPath = `/${cleanMount}/${key}.txt`;
    return {
      filePath: `${cleanMount}/${key}.txt`,
      urlPath,
      url: `${origin}${urlPath}`,
    };
  }

  const urlPath = `/${key}.txt`;
  return {
    filePath: `${key}.txt`,
    urlPath,
    url: `${origin}${urlPath}`,
  };
}

export function writeIndexNowKeyFile(distDir: string, key: string, relativePath: string): void {
  const fullPath = join(distDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, key, "utf8");
}

/** Recursively resolve sitemap indexes → page URLs only (never index locs as pages). */
export function collectPageUrlsFromSitemaps(distDir: string): string[] {
  const urls: string[] = [];
  const processed = new Set<string>();

  function parseSitemapFile(filename: string) {
    if (processed.has(filename)) return;
    processed.add(filename);

    const fullPath = join(distDir, filename);
    if (!existsSync(fullPath)) return;

    const content = readFileSync(fullPath, "utf8");
    const isIndex = /<sitemapindex[\s>]/i.test(content);

    if (isIndex) {
      for (const match of content.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
        const sitemapUrl = match[1]!.trim();
        try {
          const baseName = new URL(sitemapUrl).pathname.split("/").pop();
          if (baseName?.endsWith(".xml")) parseSitemapFile(baseName);
        } catch {
          const m = sitemapUrl.match(/\/([^/]+\.xml)$/);
          if (m?.[1]) parseSitemapFile(m[1]);
        }
      }
      return;
    }

    for (const match of content.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      urls.push(match[1]!.trim());
    }
  }

  let startFiles: string[] = [];
  try {
    startFiles = readdirSync(distDir).filter(
      (f: string) => f.startsWith("sitemap") && f.endsWith(".xml"),
    );
  } catch {
    startFiles = ["sitemap-index.xml"];
  }

  // Prefer indexes first so children are resolved correctly
  startFiles.sort((a, b) => {
    const ai = a.includes("index") ? 0 : 1;
    const bi = b.includes("index") ? 0 : 1;
    return ai - bi;
  });

  for (const file of startFiles) parseSitemapFile(file);
  return [...new Set(urls)];
}

/**
 * Append twin URLs into every urlset sitemap under dist (priority 0.5).
 * Prefer non-index files; skip sitemapindex documents.
 */
export function injectTwinUrlsIntoSitemaps(distDir: string, twinUrls: string[], priority = "0.5"): number {
  if (twinUrls.length === 0) return 0;

  let files: string[] = [];
  try {
    files = readdirSync(distDir).filter(
      (f: string) => f.startsWith("sitemap") && f.endsWith(".xml"),
    );
  } catch {
    return 0;
  }

  const urlsets = files.filter((f) => {
    const c = readFileSync(join(distDir, f), "utf8");
    return /<urlset[\s>]/i.test(c) && !/<sitemapindex[\s>]/i.test(c);
  });
  if (urlsets.length === 0) return 0;

  // Prefer the largest urlset (most page URLs) as primary injection target;
  // still inject into all so multi-sitemap sites stay complete.
  let total = 0;
  const remaining = new Set(twinUrls);

  for (const targetFile of urlsets) {
    if (remaining.size === 0) break;
    const fullPath = join(distDir, targetFile);
    let content = readFileSync(fullPath, "utf8");
    const existing = new Set(
      [...content.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]!.trim()),
    );
    const entries: string[] = [];
    for (const url of remaining) {
      if (existing.has(url)) {
        remaining.delete(url);
        continue;
      }
      entries.push(
        `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <priority>${priority}</priority>\n  </url>`,
      );
      remaining.delete(url);
    }
    if (entries.length === 0) continue;
    content = content.replace(/<\/urlset>\s*$/i, `${entries.join("\n")}\n</urlset>\n`);
    writeFileSync(fullPath, content, "utf8");
    total += entries.length;
  }

  return total;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function runGit(args: string[], cwd: string): string {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) return "";
  return r.stdout ?? "";
}

function parsePublicState(content: string): { data: Record<string, unknown>; isPublic: boolean } | null {
  try {
    const { data } = splitFrontmatter(content);
    const draft = data.draft === true;
    const visibility = data.visibility ?? "public";
    if (draft || visibility === "members") {
      return { data, isPublic: false };
    }
    // Future scheduled posts are not public yet
    const publishedAt = data.publishedAt;
    if (publishedAt != null) {
      const t = publishedAt instanceof Date ? publishedAt.getTime() : Date.parse(String(publishedAt));
      if (!Number.isNaN(t) && t > Date.now()) {
        return { data, isPublic: false };
      }
    }
    return { data, isPublic: true };
  } catch {
    return null;
  }
}

function getFrontmatterAtRevision(
  dir: string,
  revision: string,
  filePath: string,
): { data: Record<string, unknown>; isPublic: boolean } | null {
  const content = runGit(["show", `${revision}:${filePath}`], dir);
  if (!content) return null;
  return parsePublicState(content);
}

function getFrontmatterCurrent(
  dir: string,
  filePath: string,
): { data: Record<string, unknown>; isPublic: boolean } | null {
  const fullPath = join(dir, filePath);
  if (!existsSync(fullPath)) return null;
  try {
    return parsePublicState(readFileSync(fullPath, "utf8"));
  } catch {
    return null;
  }
}

/** Public HTML URL for a content post. */
export function getUrlForPost(
  cfg: IndexNowConfig,
  collection: string,
  filePath: string,
  data: Record<string, unknown>,
): string {
  const fileBasename = filePath.split(/[\\/]/).pop()!.replace(/\.md$/, "");
  const slug = String(data.slug ?? fileBasename);
  const baseUrl = cfg.baseUrl.replace(/\/$/, "");

  if (cfg.mount && cfg.mount !== "/") {
    return `${baseUrl}/${slug}/`;
  }
  return `${baseUrl}/${collection}/${slug}/`;
}

/** Twin markdown URL for a public HTML post URL. */
export function twinUrlForHtml(htmlUrl: string, cfg: IndexNowConfig): string | null {
  const baseUrl = cfg.baseUrl.replace(/\/$/, "");
  if (!htmlUrl.startsWith(baseUrl) || htmlUrl.includes("/raw/")) return null;

  const relativePath = htmlUrl.substring(baseUrl.length).replace(/^\/+|\/+$/g, "");
  if (!relativePath) return null;

  const parts = relativePath.split("/");
  if (cfg.mount && cfg.mount !== "/") {
    const slug = parts[0]!;
    return `${baseUrl}/raw/blog/${slug}.md`;
  }
  if (parts.length >= 2) {
    const collection = parts[0]!;
    const slug = parts[1]!;
    return `${baseUrl}/raw/${collection}/${slug}.md`;
  }
  return null;
}

export function computeUrlDelta(
  dir: string,
  sinceSha: string,
  sha: string,
  cfg: IndexNowConfig,
): UrlDelta {
  const added: string[] = [];
  const updated: string[] = [];
  const deleted: string[] = [];

  const diffOutput = runGit(["diff", "--name-status", sinceSha, sha], dir);
  if (!diffOutput) return { added, updated, deleted };

  for (const line of diffOutput.split("\n").filter(Boolean)) {
    const parts = line.split("\t");
    const status = parts[0]!;
    if (!status) continue;

    if (status.startsWith("R")) {
      const oldPath = parts[1]!;
      const newPath = parts[2]!;

      if (oldPath?.startsWith("content/") && oldPath.endsWith(".md")) {
        const oldState = getFrontmatterAtRevision(dir, sinceSha, oldPath);
        if (oldState?.isPublic) {
          const col = oldPath.split(/[\\/]/)[1] ?? "";
          deleted.push(getUrlForPost(cfg, col, oldPath, oldState.data));
        }
      }
      if (newPath?.startsWith("content/") && newPath.endsWith(".md")) {
        const newState = getFrontmatterCurrent(dir, newPath);
        if (newState?.isPublic) {
          const col = newPath.split(/[\\/]/)[1] ?? "";
          added.push(getUrlForPost(cfg, col, newPath, newState.data));
        }
      }
      continue;
    }

    const filePath = parts[1]!;
    if (!filePath?.startsWith("content/") || !filePath.endsWith(".md")) continue;
    const collection = filePath.split(/[\\/]/)[1] ?? "";

    if (status === "A") {
      const state = getFrontmatterCurrent(dir, filePath);
      if (state?.isPublic) added.push(getUrlForPost(cfg, collection, filePath, state.data));
    } else if (status === "M") {
      const oldState = getFrontmatterAtRevision(dir, sinceSha, filePath);
      const newState = getFrontmatterCurrent(dir, filePath);
      const oldPublic = oldState?.isPublic ?? false;
      const newPublic = newState?.isPublic ?? false;

      if (!oldPublic && newPublic) {
        added.push(getUrlForPost(cfg, collection, filePath, newState!.data));
      } else if (oldPublic && newPublic) {
        updated.push(getUrlForPost(cfg, collection, filePath, newState!.data));
      } else if (oldPublic && !newPublic) {
        deleted.push(getUrlForPost(cfg, collection, filePath, oldState!.data));
      }
    } else if (status === "D") {
      const oldState = getFrontmatterAtRevision(dir, sinceSha, filePath);
      if (oldState?.isPublic) {
        deleted.push(getUrlForPost(cfg, collection, filePath, oldState.data));
      }
    }
  }

  return { added, updated, deleted };
}

/** Pair each public HTML URL with its /raw twin. */
export function expandTwins(urls: string[], cfg: IndexNowConfig): string[] {
  const result: string[] = [];
  for (const url of urls) {
    result.push(url);
    const twin = twinUrlForHtml(url, cfg);
    if (twin) result.push(twin);
  }
  return [...new Set(result)];
}

/** Keep only URLs whose host matches cfg (IndexNow 422 otherwise). */
export function filterUrlsForHost(cfg: IndexNowConfig, urls: string[]): {
  valid: string[];
  rejected: string[];
} {
  let expected: string;
  try {
    expected = new URL(cfg.baseUrl).host;
  } catch {
    expected = cfg.domain;
  }
  const valid: string[] = [];
  const rejected: string[] = [];
  for (const raw of urls) {
    try {
      const u = new URL(raw);
      if (u.host === expected || u.hostname === cfg.domain) valid.push(u.href);
      else rejected.push(raw);
    } catch {
      rejected.push(raw);
    }
  }
  return { valid, rejected };
}

/**
 * Live HTTP gate. Uses redirect: "manual" so 301 deletes are not followed to 200.
 * Add/update: 200 only. Delete: 301, 302, 307, 308, 404, 410.
 */
export async function gatePublicUrls(urls: string[], isDelete: boolean): Promise<string[]> {
  const verified: string[] = [];

  async function statusOf(url: string): Promise<number> {
    try {
      let res = await fetch(url, { method: "HEAD", redirect: "manual" });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url, { method: "GET", redirect: "manual" });
      }
      return res.status;
    } catch {
      return 0;
    }
  }

  const deleteOk = new Set([301, 302, 307, 308, 404, 410]);

  for (const url of urls) {
    const status = await statusOf(url);
    if (isDelete) {
      if (deleteOk.has(status)) verified.push(url);
      else {
        console.warn(
          `[IndexNow] delete candidate ${url} returned HTTP ${status} (want 301/404/410). Skipping.`,
        );
      }
    } else if (status === 200) {
      verified.push(url);
    } else {
      console.warn(`[IndexNow] ${url} returned HTTP ${status} (expected 200). Skipping.`);
    }
  }

  return verified;
}

/** Submit in batches of ≤10_000; 200 and 202 are success; honor Retry-After on 429. */
export async function submitIndexNow(
  host: string,
  key: string,
  keyLocation: string,
  urlList: string[],
): Promise<boolean> {
  const maxBatchSize = 10_000;
  let allSuccess = true;

  for (let i = 0; i < urlList.length; i += maxBatchSize) {
    const batch = urlList.slice(i, i + maxBatchSize);
    let success = false;
    let retries = 3;
    let delayMs = 1000;

    while (!success && retries > 0) {
      try {
        const response = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ host, key, keyLocation, urlList: batch }),
        });

        if (response.status === 200 || response.status === 202) {
          console.log(
            `[IndexNow] Submitted ${batch.length} URL(s) — HTTP ${response.status} (receipt only; not a crawl guarantee).`,
          );
          success = true;
        } else if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 5;
          const wait = Number.isFinite(waitSeconds) ? waitSeconds : 5;
          console.warn(`[IndexNow] Rate limited (429). Retrying in ${wait}s…`);
          await new Promise((r) => setTimeout(r, wait * 1000));
          retries--;
        } else {
          const body = await response.text();
          console.error(`[IndexNow] Failed HTTP ${response.status}: ${body}`);
          allSuccess = false;
          break;
        }
      } catch (err) {
        console.error(`[IndexNow] Network error: ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
        retries--;
      }
    }

    if (!success) allSuccess = false;
  }

  return allSuccess;
}

/** Collect twin URLs for every public HTML post URL (for sitemap injection). */
export function twinsForHtmlUrls(htmlUrls: string[], cfg: IndexNowConfig): string[] {
  const twins: string[] = [];
  for (const u of htmlUrls) {
    const t = twinUrlForHtml(u, cfg);
    if (t) twins.push(t);
  }
  return [...new Set(twins)];
}
