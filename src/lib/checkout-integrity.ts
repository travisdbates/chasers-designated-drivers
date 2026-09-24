import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import {
  MONITORED_HEADERS,
  PAYMENT_PAGE_PATHS,
  getTokenizationOrigin,
} from "../config/payment-security";
import { sendSecurityAlert } from "./security-alerts";

// Change and tamper detection for payment pages (PCI DSS 4.0 req. 11.6.1).
//
// Each run fetches every payment page as a browser would receive it and records its HTTP
// security headers, every script (URL + SHA-256 of its contents, inline or external), iframes,
// form targets and a hash of the full HTML. The result is compared to the last approved
// snapshot; any difference is emailed and stays "pending" until an admin approves it.

export interface PageSnapshot {
  path: string;
  status: number;
  location: string | null;
  headers: Record<string, string>;
  htmlSha256: string;
  scripts: string[];
  iframes: string[];
  forms: string[];
}

export interface Snapshot {
  capturedAt: string;
  baseUrl: string;
  pages: PageSnapshot[];
}

export interface ApprovedBaseline {
  snapshot: Snapshot;
  approvedAt: string;
  approvedBy: string;
}

export interface PendingChange {
  snapshot: Snapshot;
  changes: string[];
  fingerprint: string;
  detectedAt: string;
  lastAlertAt: string;
}

const STORE_NAME = "checkout-integrity";
const APPROVED_KEY = "approved-baseline";
const PENDING_KEY = "pending-change";
const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export function getMonitorBaseUrl(): string {
  return (
    process.env.CHECKOUT_MONITOR_BASE_URL ||
    process.env.URL || // Netlify's primary site URL
    "https://chasersdd.com"
  ).replace(/\/+$/, "");
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

// The CSP nonce is random per request; normalize it so it doesn't read as a change
function stripNonces(value: string): string {
  return value
    .replace(/'nonce-[^']*'/g, "'nonce-*'")
    .replace(/\snonce="[^"]*"/g, "");
}

function attr(tagAttributes: string, name: string): string | null {
  const match = tagAttributes.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match ? match[1] : null;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "ChasersDD-Checkout-Integrity-Monitor/1.0", ...init.headers },
  });
}

async function hashRemoteScript(
  url: string,
  cache: Map<string, string>
): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  let result: string;
  try {
    const response = await fetchWithTimeout(url);
    result = response.ok
      ? sha256(new Uint8Array(await response.arrayBuffer()))
      : `fetch-failed-${response.status}`;
  } catch (error: any) {
    result = `fetch-failed-${error?.name || "error"}`;
  }
  cache.set(url, result);
  return result;
}

async function capturePage(
  baseUrl: string,
  path: string,
  scriptCache: Map<string, string>
): Promise<PageSnapshot> {
  const pageUrl = `${baseUrl}${path}`;
  const response = await fetchWithTimeout(pageUrl, { redirect: "manual" });

  const headers: Record<string, string> = {};
  for (const name of MONITORED_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers[name] = stripNonces(value);
  }

  const html = stripNonces(await response.text());

  const scripts: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const [, attributes, body] = match;
    const src = attr(attributes, "src");
    if (src) {
      const absolute = new URL(src, pageUrl).toString();
      scripts.push(`${absolute} sha256=${await hashRemoteScript(absolute, scriptCache)}`);
    } else {
      scripts.push(`inline sha256=${sha256(body)}`);
    }
  }

  const iframes = [...html.matchAll(/<iframe\b([^>]*)>/gi)].map(
    ([, attributes]) => attr(attributes, "src") || "(no src)"
  );
  const forms = [...html.matchAll(/<form\b([^>]*)>/gi)].map(
    ([, attributes]) =>
      `${attr(attributes, "id") || "(no id)"} action=${attr(attributes, "action") || "(self)"}`
  );

  return {
    path,
    status: response.status,
    location: response.headers.get("location"),
    headers,
    htmlSha256: sha256(html),
    scripts: scripts.sort(),
    iframes: iframes.sort(),
    forms: forms.sort(),
  };
}

export async function captureSnapshot(baseUrl = getMonitorBaseUrl()): Promise<Snapshot> {
  const scriptCache = new Map<string, string>();
  const pages: PageSnapshot[] = [];
  for (const path of PAYMENT_PAGE_PATHS) {
    try {
      pages.push(await capturePage(baseUrl, path, scriptCache));
    } catch (error: any) {
      pages.push({
        path,
        status: 0,
        location: null,
        headers: {},
        htmlSha256: `fetch-failed-${error?.name || "error"}`,
        scripts: [],
        iframes: [],
        forms: [],
      });
    }
  }
  return { capturedAt: new Date().toISOString(), baseUrl, pages };
}

function diffList(label: string, before: string[], after: string[]): string[] {
  const removed = before.filter((item) => !after.includes(item));
  const added = after.filter((item) => !before.includes(item));
  return [
    ...added.map((item) => `+ ${label} added: ${item}`),
    ...removed.map((item) => `- ${label} removed: ${item}`),
  ];
}

export function diffSnapshots(approved: Snapshot, current: Snapshot): string[] {
  const changes: string[] = [];
  for (const page of current.pages) {
    const before = approved.pages.find((p) => p.path === page.path);
    if (!before) {
      changes.push(`[${page.path}] page was not in the approved baseline`);
      continue;
    }
    const pageChanges: string[] = [];
    if (before.status !== page.status) {
      pageChanges.push(`~ HTTP status: ${before.status} -> ${page.status}`);
    }
    if (before.location !== page.location) {
      pageChanges.push(`~ redirect location: ${before.location} -> ${page.location}`);
    }
    const headerNames = new Set([...Object.keys(before.headers), ...Object.keys(page.headers)]);
    for (const name of [...headerNames].sort()) {
      const oldValue = before.headers[name];
      const newValue = page.headers[name];
      if (oldValue === newValue) continue;
      if (oldValue === undefined) pageChanges.push(`+ header added: ${name}: ${newValue}`);
      else if (newValue === undefined) pageChanges.push(`- header removed: ${name}: ${oldValue}`);
      else pageChanges.push(`~ header changed: ${name}\n    was: ${oldValue}\n    now: ${newValue}`);
    }
    pageChanges.push(...diffList("script", before.scripts, page.scripts));
    pageChanges.push(...diffList("iframe", before.iframes, page.iframes));
    pageChanges.push(...diffList("form", before.forms, page.forms));
    if (before.htmlSha256 !== page.htmlSha256) {
      pageChanges.push(`~ page HTML changed (sha256 ${before.htmlSha256.slice(0, 12)}… -> ${page.htmlSha256.slice(0, 12)}…)`);
    }
    if (pageChanges.length > 0) {
      changes.push(`[${page.path}]`, ...pageChanges.map((line) => `  ${line}`));
    }
  }
  return changes;
}

// Conditions that are wrong regardless of what was approved
export function findPolicyIssues(snapshot: Snapshot): string[] {
  const issues: string[] = [];
  const tokenizationOrigin = getTokenizationOrigin();
  for (const page of snapshot.pages) {
    const prefix = `[${page.path}]`;
    if (page.status !== 200) {
      issues.push(`${prefix} returned HTTP ${page.status || "error"} (expected 200)`);
      continue;
    }
    if (!page.headers["content-security-policy"]) {
      issues.push(`${prefix} is not sending an enforcing Content-Security-Policy header`);
    }
    if (!page.headers["strict-transport-security"]) {
      issues.push(`${prefix} is missing the Strict-Transport-Security header`);
    }
    if (!page.scripts.some((script) => script.startsWith(tokenizationOrigin))) {
      issues.push(`${prefix} does not load the hosted tokenization script from ${tokenizationOrigin}`);
    }
    const thirdParty = page.scripts.filter(
      (script) =>
        !script.startsWith("inline ") &&
        !script.startsWith(snapshot.baseUrl) &&
        !script.startsWith(tokenizationOrigin)
    );
    for (const script of thirdParty) {
      issues.push(`${prefix} loads an unapproved third-party script: ${script}`);
    }
  }
  return issues;
}

export async function getApprovedBaseline(): Promise<ApprovedBaseline | null> {
  return (await store().get(APPROVED_KEY, { type: "json" })) as ApprovedBaseline | null;
}

export async function getPendingChange(): Promise<PendingChange | null> {
  return (await store().get(PENDING_KEY, { type: "json" })) as PendingChange | null;
}

// Approve exactly the snapshot that was alerted on, so a newer unseen change is never
// approved by accident.
export async function approvePendingChange(
  expectedFingerprint: string,
  approvedBy: string
): Promise<boolean> {
  const pending = await getPendingChange();
  if (!pending || pending.fingerprint !== expectedFingerprint) return false;
  const baseline: ApprovedBaseline = {
    snapshot: pending.snapshot,
    approvedAt: new Date().toISOString(),
    approvedBy,
  };
  await store().setJSON(APPROVED_KEY, baseline);
  await store().delete(PENDING_KEY);
  return true;
}

export interface MonitorResult {
  status: "baseline-created" | "unchanged" | "changed";
  changes: string[];
  policyIssues: string[];
  alerted: boolean;
}

export async function runIntegrityCheck(): Promise<MonitorResult> {
  const snapshot = await captureSnapshot();
  const policyIssues = findPolicyIssues(snapshot);
  const approved = await getApprovedBaseline();
  const adminUrl = `${snapshot.baseUrl}/admin`;

  if (!approved) {
    await store().setJSON(APPROVED_KEY, {
      snapshot,
      approvedAt: snapshot.capturedAt,
      approvedBy: "initial baseline (automatic)",
    } satisfies ApprovedBaseline);
    const alerted = await sendSecurityAlert({
      subject: "Checkout integrity monitoring enabled",
      lines: [
        `Recorded the initial baseline for ${snapshot.pages.length} payment pages at ${snapshot.baseUrl}.`,
        "Any future change to these pages, their scripts or their security headers will be emailed here.",
        "",
        ...(policyIssues.length > 0
          ? ["Problems found in the current pages:", ...policyIssues.map((i) => `  ! ${i}`), ""]
          : ["No policy problems found."]),
      ],
    });
    return { status: "baseline-created", changes: [], policyIssues, alerted };
  }

  const changes = diffSnapshots(approved.snapshot, snapshot);
  if (changes.length === 0 && policyIssues.length === 0) {
    await store().delete(PENDING_KEY);
    return { status: "unchanged", changes, policyIssues, alerted: false };
  }

  const fingerprint = sha256(JSON.stringify({ changes, policyIssues }));
  const previous = await getPendingChange();
  const now = Date.now();
  const isNew = previous?.fingerprint !== fingerprint;
  const reminderDue =
    !isNew && now - new Date(previous!.lastAlertAt).getTime() > REMINDER_INTERVAL_MS;

  let alerted = false;
  if (isNew || reminderDue) {
    alerted = await sendSecurityAlert({
      subject: isNew
        ? "Checkout page change detected"
        : "Reminder: unapproved checkout page change",
      lines: [
        `A payment page at ${snapshot.baseUrl} differs from the last approved version.`,
        "If this matches a deploy you made, approve it in the admin panel. If not, treat it as a",
        "possible compromise: roll back the deploy in Netlify and investigate before taking payments.",
        "",
        `Detected: ${isNew ? snapshot.capturedAt : previous!.detectedAt}`,
        `Last approved: ${approved.approvedAt} by ${approved.approvedBy}`,
        `Change ID: ${fingerprint.slice(0, 12)}`,
        "",
        ...(policyIssues.length > 0
          ? ["Policy problems:", ...policyIssues.map((i) => `  ! ${i}`), ""]
          : []),
        ...(changes.length > 0 ? ["Changes:", ...changes, ""] : []),
        `Review and approve: ${adminUrl}`,
      ],
    });
  }

  await store().setJSON(PENDING_KEY, {
    snapshot,
    changes: [...policyIssues.map((i) => `! ${i}`), ...changes],
    fingerprint,
    detectedAt: isNew ? snapshot.capturedAt : previous!.detectedAt,
    lastAlertAt: alerted || isNew ? new Date(now).toISOString() : previous!.lastAlertAt,
  } satisfies PendingChange);

  return { status: "changed", changes, policyIssues, alerted };
}
