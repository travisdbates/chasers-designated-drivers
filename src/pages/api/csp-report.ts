import type { APIRoute } from "astro";
import { sendSecurityAlert } from "../../lib/security-alerts";

export const prerender = false;

// Receives Content-Security-Policy violation reports from payment pages. A violation means
// something tried to load or run on the checkout page that isn't on the allowlist, which is
// what a card skimmer injection looks like, so each distinct violation is emailed.

const MAX_BODY_BYTES = 64 * 1024;
const ALERT_THROTTLE_MS = 60 * 60 * 1000; // one email per distinct violation per hour
const MAX_ALERTS_PER_HOUR = 20; // cap per function instance so fake reports can't flood email

const lastAlertAt = new Map<string, number>();
let alertWindowStart = Date.now();
let alertsInWindow = 0;

interface Violation {
  documentUri: string;
  directive: string;
  blockedUri: string;
  sourceFile: string;
  lineNumber: string;
  disposition: string;
  sample: string;
}

// Violations caused by the visitor's own browser extensions are noise, not tampering
const EXTENSION_SCHEMES = /^(chrome|moz|safari|safari-web|ms-browser)-extension:/i;

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).slice(0, 500);
}

// Supports both the legacy report-uri format and the Reporting API (report-to) format
function parseViolations(payload: any): Violation[] {
  const reports = Array.isArray(payload) ? payload : [payload];
  return reports
    .map((report) => {
      const legacy = report?.["csp-report"];
      if (legacy) {
        return {
          documentUri: str(legacy["document-uri"]),
          directive: str(legacy["effective-directive"] || legacy["violated-directive"]),
          blockedUri: str(legacy["blocked-uri"]),
          sourceFile: str(legacy["source-file"]),
          lineNumber: str(legacy["line-number"]),
          disposition: str(legacy["disposition"]),
          sample: str(legacy["script-sample"]),
        };
      }
      if (report?.type === "csp-violation" && report.body) {
        const body = report.body;
        return {
          documentUri: str(body.documentURL),
          directive: str(body.effectiveDirective),
          blockedUri: str(body.blockedURL),
          sourceFile: str(body.sourceFile),
          lineNumber: str(body.lineNumber),
          disposition: str(body.disposition),
          sample: str(body.sample),
        };
      }
      return null;
    })
    .filter((violation): violation is Violation => violation !== null);
}

function isNoise(violation: Violation): boolean {
  return (
    EXTENSION_SCHEMES.test(violation.blockedUri) ||
    EXTENSION_SCHEMES.test(violation.sourceFile)
  );
}

function shouldAlert(key: string): boolean {
  const now = Date.now();
  if (now - alertWindowStart > ALERT_THROTTLE_MS) {
    alertWindowStart = now;
    alertsInWindow = 0;
  }
  const last = lastAlertAt.get(key);
  if ((last && now - last < ALERT_THROTTLE_MS) || alertsInWindow >= MAX_ALERTS_PER_HOUR) {
    return false;
  }
  lastAlertAt.set(key, now);
  alertsInWindow++;
  return true;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response(null, { status: 413 });
    }

    const violations = parseViolations(JSON.parse(raw)).filter(
      (violation) => !isNoise(violation)
    );

    for (const violation of violations) {
      console.warn("CSP violation on payment page:", violation);

      let blockedOrigin = violation.blockedUri;
      try {
        blockedOrigin = new URL(violation.blockedUri).origin;
      } catch {
        // "inline", "eval", etc. are not URLs
      }

      if (!shouldAlert(`${violation.directive}|${blockedOrigin}`)) continue;

      await sendSecurityAlert({
        subject: `Checkout page CSP violation (${violation.directive || "unknown"})`,
        lines: [
          "The browser blocked or reported something on a payment page that is not on the allowlist.",
          "This can mean a script was injected into the checkout page. Investigate if you did not just change the page.",
          "",
          `Page: ${violation.documentUri}`,
          `Directive: ${violation.directive}`,
          `Blocked: ${violation.blockedUri}`,
          `Source: ${violation.sourceFile}${violation.lineNumber ? `:${violation.lineNumber}` : ""}`,
          `Mode: ${violation.disposition || "unknown"}`,
          `Sample: ${violation.sample || "(none)"}`,
          `Reported at: ${new Date().toISOString()}`,
          "",
          "Further identical violations are suppressed for one hour. See Netlify function logs for all reports.",
        ],
      });
    }
  } catch (error) {
    console.error("Invalid CSP report:", error);
  }

  // Browsers ignore the response; always accept so reporting never retries or errors
  return new Response(null, { status: 204 });
};
