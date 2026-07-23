/**
 * Google Web Search Indexing API — JWT auth + URL notification.
 *
 * Uses Node's built-in `crypto` for JWT signing (RS256) and global `fetch`
 * for HTTP. No external dependencies (no google-auth-library).
 *
 * API docs: https://developers.google.com/search/apis/indexing-api/v3/using-api
 * Quota: 200 notifications/day (free tier). Batch intelligently.
 */
import { readFileSync, existsSync } from "node:fs";
import { createSign } from "node:crypto";
import { join } from "node:path";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

export interface GoogleIndexingConfig {
  serviceAccountKey: string; // path to SA JSON key file
}

export interface UrlNotification {
  url: string;
  type: "URL_UPDATED" | "URL_DELETED";
}

export interface SubmitResult {
  submitted: number;
  succeeded: number;
  failed: number;
  errors: Array<{ url: string; status: number; body: string }>;
}

// ── Config reader ────────────────────────────────────────────────────────────

/** Read `googleIndexing` block from data/site.config.ts (regex parse). */
export function readGoogleIndexingConfig(dir: string): GoogleIndexingConfig | null {
  const configPath = join(dir, "data/site.config.ts");
  if (!existsSync(configPath)) return null;
  const text = readFileSync(configPath, "utf8");

  const blockMatch = text.match(/googleIndexing\s*:\s*\{([\s\S]*?)\}/);
  if (!blockMatch) return null;

  const keyMatch = blockMatch[1]!.match(/serviceAccountKey\s*:\s*["'`]([^"'`]*)["'`]/);
  const serviceAccountKey = keyMatch ? keyMatch[1]! : "";

  return { serviceAccountKey };
}

/** Load and validate the service account JSON key file. */
export function loadServiceAccountKey(keyPath: string, dir: string): ServiceAccountKey | null {
  const resolved = keyPath.startsWith("/") ? keyPath : join(dir, keyPath);
  if (!existsSync(resolved)) return null;
  try {
    const raw = JSON.parse(readFileSync(resolved, "utf8")) as ServiceAccountKey;
    if (!raw.private_key || !raw.client_email) return null;
    return raw;
  } catch {
    return null;
  }
}

// ── JWT → OAuth2 token ───────────────────────────────────────────────────────

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Create a signed JWT and exchange it for an OAuth2 access token.
 * Uses RS256 with the service account's private key.
 */
export async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const claimB64 = base64UrlEncode(Buffer.from(JSON.stringify(claim)));
  const signInput = `${headerB64}.${claimB64}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signInput);
  const signature = base64UrlEncode(signer.sign(sa.private_key));
  const jwt = `${signInput}.${signature}`;

  const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (HTTP ${res.status}): ${body}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  return json.access_token;
}

// ── URL notification ─────────────────────────────────────────────────────────

const INDEXING_API = "https://indexing.googleapis.com/v3/urlNotifications:publish";

/** Submit a single URL notification to Google Indexing API. */
async function notifyUrl(
  token: string,
  notification: UrlNotification,
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(INDEXING_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: notification.url,
      type: notification.type,
    }),
  });

  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

/**
 * Submit URL notifications to Google Indexing API.
 * Processes one-by-one (API doesn't support batch).
 * Quota: 200/day — caller should prioritize.
 */
export async function submitToGoogle(
  sa: ServiceAccountKey,
  notifications: UrlNotification[],
): Promise<SubmitResult> {
  const result: SubmitResult = {
    submitted: notifications.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  if (notifications.length === 0) return result;

  console.log(`[Google Indexing] Authenticating as ${sa.client_email}…`);
  const token = await getAccessToken(sa);
  console.log(`[Google Indexing] Token acquired. Submitting ${notifications.length} URL(s)…`);

  for (const n of notifications) {
    try {
      const r = await notifyUrl(token, n);
      if (r.ok) {
        result.succeeded++;
      } else {
        result.failed++;
        result.errors.push({ url: n.url, status: r.status, body: r.body });
        console.warn(`[Google Indexing] FAIL ${n.type} ${n.url} → HTTP ${r.status}: ${r.body}`);
      }
    } catch (err) {
      result.failed++;
      result.errors.push({ url: n.url, status: 0, body: (err as Error).message });
      console.warn(`[Google Indexing] ERROR ${n.url}: ${(err as Error).message}`);
    }
  }

  console.log(
    `[Google Indexing] Done: ${result.succeeded}/${result.submitted} succeeded, ${result.failed} failed.`,
  );
  return result;
}

/**
 * Quick auth check — tries to get an access token without submitting anything.
 * Returns the SA email on success, or throws.
 */
export async function validateAuth(sa: ServiceAccountKey): Promise<string> {
  await getAccessToken(sa);
  return sa.client_email;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a URL delta (from indexnow's computeUrlDelta) into Google notifications.
 * Added/Updated → URL_UPDATED, Deleted → URL_DELETED.
 */
export function deltaToNotifications(
  added: string[],
  updated: string[],
  deleted: string[],
): UrlNotification[] {
  const notifications: UrlNotification[] = [];
  for (const url of added) notifications.push({ url, type: "URL_UPDATED" });
  for (const url of updated) notifications.push({ url, type: "URL_UPDATED" });
  for (const url of deleted) notifications.push({ url, type: "URL_DELETED" });
  return notifications;
}

/**
 * Prioritize notifications when approaching daily quota (200/day).
 * New URLs first, then updated, then deleted. Cap at `max`.
 */
export function prioritizeNotifications(
  notifications: UrlNotification[],
  max = 200,
): UrlNotification[] {
  const added = notifications.filter((n) => n.type === "URL_UPDATED");
  const deleted = notifications.filter((n) => n.type === "URL_DELETED");
  // Added/updated first (they help indexing speed most), then deletes.
  const sorted = [...added, ...deleted];
  if (sorted.length <= max) return sorted;
  console.warn(
    `[Google Indexing] ${sorted.length} URLs exceed daily quota (${max}). Submitting top ${max}.`,
  );
  return sorted.slice(0, max);
}
