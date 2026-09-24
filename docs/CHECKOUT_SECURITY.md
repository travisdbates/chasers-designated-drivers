# Checkout Security Controls

The controls on the Chasers DD payment pages (`/checkout/*`), how to operate them, and which PCI DSS 4.0 requirement each one covers.

## Summary

| Control | Where | PCI DSS 4.0 |
|---|---|---|
| Card data is entered only in AcceptBlue's hosted tokenization iframe; our page and servers receive a single-use nonce | `src/components/PaymentForm.astro`, `src/pages/api/process-payment.ts` | Scope reduction (SAQ A eligibility) |
| The payment API rejects any request containing raw card fields | `src/pages/api/process-payment.ts` | 3.2, 3.3 |
| Payment pages load no third-party scripts except the tokenization library (no analytics, chat or client-side router) | `src/layouts/BaseLayout.astro` (`paymentPage` prop) | 6.4.3 |
| Strict Content-Security-Policy with a per-request nonce: only scripts we rendered and the tokenization origin can run | `src/middleware.ts`, `src/config/payment-security.ts` | 6.4.3 |
| CSP violation reports are logged and emailed | `src/pages/api/csp-report.ts` | 6.4.3, 11.6.1 |
| Hourly change/tamper detection of page content, every script (hashed), and HTTP security headers, with email alerts and admin approval | `netlify/functions/checkout-integrity-monitor.ts`, `src/lib/checkout-integrity.ts` | 11.6.1 |
| Security headers (HSTS, nosniff, frame protection, referrer policy) | `src/middleware.ts`, `netlify.toml` | 6.4.3 / general hardening |

## Payment flow

1. The browser loads the AcceptBlue Hosted Tokenization library from the tokenization origin. It renders the card number, expiry and CVV fields inside an iframe served by AcceptBlue.
2. On submit, `getNonceToken()` exchanges the card data held in the iframe for a single-use nonce.
3. The browser posts customer details, the nonce, expiry month/year, last 4 digits and card type to `/api/process-payment`.
4. The server creates the AcceptBlue customer and a saved payment method from `nonce-<token>`, then charges the saved payment method and creates the monthly schedule.

If the tokenization library fails to load, the form shows an error and stays disabled. There is no fallback to plain card inputs.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `PUBLIC_ACCEPTBLUE_TOKENIZATION_KEY` | Tokenization (public) source key from MiCamp | required |
| `PUBLIC_ACCEPTBLUE_ENVIRONMENT` | `sandbox` or `production`; picks the tokenization URL | `sandbox` |
| `PUBLIC_ACCEPTBLUE_TOKENIZATION_URL` | Override the tokenization script URL (e.g. a MiCamp white-label URL). The CSP allows this URL's origin | AcceptBlue v0.3 URL for the environment |
| `CHECKOUT_CSP_MODE` | `enforce`, or `report-only` as a temporary escape hatch. The monitor flags report-only as a policy problem | `enforce` |
| `SECURITY_ALERT_EMAILS` | Comma-separated recipients for security alerts | falls back to `ON_SIGNUP_NOTIFICATION_EMAILS` |
| `CHECKOUT_MONITOR_BASE_URL` | Site the monitor checks | Netlify's `URL` |
| `RESEND_API_KEY`, `FROM_EMAIL` | Already used for notifications; also used for alerts | existing |

`PUBLIC_*` variables are baked in at build time, so redeploy after changing them.

## Operating the change detection

- **Schedule:** hourly (PCI requires at least weekly). The first run records the baseline and emails a confirmation.
- **Run on demand:** Netlify dashboard → Functions → `checkout-integrity-monitor` → Run now.
- **What is compared:** HTTP status/redirects, the monitored security headers (CSP nonce normalized), every `<script>` (external URL + SHA-256 of the file, or SHA-256 of inline content), iframes, form targets, and a SHA-256 of the full page HTML.
- **Policy checks (can't be approved away):** a page doesn't return 200, is missing an enforcing CSP or HSTS, doesn't load the tokenization script, or loads a third-party script from anywhere other than the tokenization origin.
- **When you get a "change detected" email:**
  1. Check whether it matches a deploy you just made (pricing changes through the admin panel also change the pages).
  2. If yes: log in at `/admin` → Checkout Integrity → review the change list → approve. It becomes the new baseline.
  3. If not: treat it as a possible compromise. Roll back to the last good deploy in Netlify (Deploys → select deploy → Publish deploy), rotate credentials and investigate before taking payments again.
- Unapproved changes are re-sent as a reminder every 24 hours.
- Baselines live in the Netlify Blobs store `checkout-integrity`.
- A change to AcceptBlue's own tokenization script also triggers an alert, since its hash is part of the snapshot. Confirm with MiCamp/AcceptBlue before approving.

## Evidence for the assessor

- This document, and the CSP header visible on any `/checkout/*` response.
- Alert emails and the Netlify function logs for `checkout-integrity-monitor` (one entry per hourly run) and `/api/csp-report`.
- The admin panel's approval history (approved time and approver for the current baseline).
