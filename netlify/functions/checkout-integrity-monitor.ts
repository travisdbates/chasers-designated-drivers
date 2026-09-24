import type { Config } from "@netlify/functions";
import { runIntegrityCheck } from "../../src/lib/checkout-integrity";

// Scheduled change/tamper detection for the checkout pages (PCI DSS 4.0 req. 11.6.1, which
// requires at least weekly checks). Can also be run on demand from the Netlify dashboard:
// Functions → checkout-integrity-monitor → Run now.
export default async () => {
  try {
    const result = await runIntegrityCheck();
    console.log("Checkout integrity check:", {
      status: result.status,
      changes: result.changes.length,
      policyIssues: result.policyIssues,
      alerted: result.alerted,
    });
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // A monitor that silently stops is itself a finding, so surface failures loudly
    console.error("🚨 Checkout integrity check failed to run:", error);
    return new Response("Integrity check failed", { status: 500 });
  }
};

export const config: Config = {
  schedule: "@hourly",
};
