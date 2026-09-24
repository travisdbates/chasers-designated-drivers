import { defineMiddleware } from "astro:middleware";
import { randomBytes } from "node:crypto";
import {
  BASE_SECURITY_HEADERS,
  PAYMENT_PAGE_HEADERS,
  buildPaymentPageCsp,
  getCspHeaderName,
  isPaymentPagePath,
} from "./config/payment-security";

// Tags every <script> the server rendered with the request's nonce. Anything injected later
// (browser extension, compromised third party, XSS) has no nonce and is blocked by the CSP.
function addNonceToScripts(html: string, nonce: string): string {
  return html.replace(/<script(?=[\s>])/gi, `<script nonce="${nonce}"`);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  // Prerendered pages are built ahead of time and have no request to secure.
  if (context.isPrerendered) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  const isHtml = headers.get("content-type")?.includes("text/html") ?? false;
  if (!isPaymentPagePath(context.url.pathname) || !isHtml) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const nonce = randomBytes(16).toString("base64");
  const html = addNonceToScripts(await response.text(), nonce);

  for (const [name, value] of Object.entries(PAYMENT_PAGE_HEADERS)) {
    headers.set(name, value);
  }
  headers.set(getCspHeaderName(), buildPaymentPageCsp(nonce));
  headers.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
