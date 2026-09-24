import { Resend } from "resend";
import { getSecurityAlertRecipients } from "../config/payment-security";

export interface SecurityAlert {
  subject: string;
  // Plain-text lines; rendered into a simple HTML email and escaped
  lines: string[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Emails a payment-page security alert to SECURITY_ALERT_EMAILS
// (falls back to ON_SIGNUP_NOTIFICATION_EMAILS). Always logs, even if email is not configured.
export async function sendSecurityAlert(alert: SecurityAlert): Promise<boolean> {
  console.warn(`🚨 SECURITY ALERT: ${alert.subject}\n${alert.lines.join("\n")}`);

  const apiKey = process.env.RESEND_API_KEY;
  const recipients = getSecurityAlertRecipients();
  if (!apiKey || recipients.length === 0) {
    console.error(
      "Security alert email not sent: RESEND_API_KEY or SECURITY_ALERT_EMAILS not configured"
    );
    return false;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.FROM_EMAIL || "noreply@chasersdd.com",
    to: recipients,
    subject: `[Chasers DD Security] ${alert.subject}`,
    html: `<div style="font-family: monospace; white-space: pre-wrap;">${alert.lines
      .map(escapeHtml)
      .join("<br>")}</div>`,
  });

  if (error) {
    console.error("Security alert email failed:", error);
    return false;
  }
  return true;
}
