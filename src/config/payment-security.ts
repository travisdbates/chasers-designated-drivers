// Shared configuration for payment-page security controls (PCI DSS 4.0 req. 6.4.3 / 11.6.1).
// Used by the SSR middleware (headers + CSP), the payment form, the CSP report endpoint
// and the scheduled checkout integrity monitor, so all of them agree on what is authorized.

// Hosted tokenization library served by AcceptBlue (MiCamp's processor). Card data is typed
// into an iframe served from this origin, so it never touches our page or our servers.
// Override with PUBLIC_ACCEPTBLUE_TOKENIZATION_URL if MiCamp gives you a white-label URL.
const DEFAULT_TOKENIZATION_URLS = {
  production: "https://tokenization.accept.blue/tokenization/v0.3",
  sandbox: "https://tokenization.sandbox.accept.blue/tokenization/v0.3",
} as const;

function readEnv(name: string): string | undefined {
  // import.meta.env is populated for PUBLIC_* vars at build time; process.env at runtime
  // (Netlify functions). Check both so this works in Astro pages and plain functions.
  const fromMeta = (import.meta as any).env?.[name];
  if (fromMeta) return fromMeta;
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

export function getTokenizationEnvironment(): "production" | "sandbox" {
  const env =
    readEnv("PUBLIC_ACCEPTBLUE_ENVIRONMENT") || readEnv("ACCEPTBLUE_ENVIRONMENT");
  return env === "production" ? "production" : "sandbox";
}

export function getTokenizationScriptUrl(): string {
  return (
    readEnv("PUBLIC_ACCEPTBLUE_TOKENIZATION_URL") ||
    DEFAULT_TOKENIZATION_URLS[getTokenizationEnvironment()]
  );
}

export function getTokenizationOrigin(): string {
  return new URL(getTokenizationScriptUrl()).origin;
}

// Every page that renders the payment form. The middleware applies the strict CSP to these
// and the integrity monitor fetches each one.
export const PAYMENT_PAGE_PATHS = [
  "/checkout/individual",
  "/checkout/joint",
  "/checkout/family",
  "/checkout/corporate",
  "/checkout/business",
] as const;

export function isPaymentPagePath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized.startsWith("/checkout/") || normalized === "/checkout";
}

export const CSP_REPORT_PATH = "/api/csp-report";

// "enforce" blocks anything not on the allowlist; "report-only" just reports violations.
// Defaults to enforce: set CHECKOUT_CSP_MODE=report-only only as a temporary escape hatch.
export function getCspMode(): "enforce" | "report-only" {
  return readEnv("CHECKOUT_CSP_MODE") === "report-only" ? "report-only" : "enforce";
}

export function getCspHeaderName(): string {
  return getCspMode() === "enforce"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";
}

// Strict allowlist for payment pages. Inline scripts must carry the per-request nonce, and
// the only third-party script/frame allowed is the hosted tokenization origin.
export function buildPaymentPageCsp(nonce: string): string {
  const tokenizationOrigin = getTokenizationOrigin();
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${tokenizationOrigin}`,
    `frame-src ${tokenizationOrigin}`,
    `connect-src 'self' ${tokenizationOrigin}`,
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
    "report-to csp-endpoint",
  ].join("; ");
}

// Headers applied to every SSR response. Static assets get the same set from netlify.toml.
export const BASE_SECURITY_HEADERS: Record<string, string> = {
  // No includeSubDomains: other chasersdd.com subdomains may not all serve HTTPS.
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// Extra headers for payment pages on top of the base set.
export const PAYMENT_PAGE_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
  "Reporting-Endpoints": `csp-endpoint="${CSP_REPORT_PATH}"`,
};

// Headers the integrity monitor records and alerts on when they change or disappear.
export const MONITORED_HEADERS = [
  "content-security-policy",
  "content-security-policy-report-only",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "reporting-endpoints",
  "cache-control",
] as const;

export function getSecurityAlertRecipients(): string[] {
  const raw =
    readEnv("SECURITY_ALERT_EMAILS") || readEnv("ON_SIGNUP_NOTIFICATION_EMAILS") || "";
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}
