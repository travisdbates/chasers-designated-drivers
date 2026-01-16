import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }
}

interface QRScanMetric {
  timestamp: FirebaseFirestore.Timestamp | Date;
  scanId: string;
  campaignId: string | null;
  destinationUrl: string;
  userAgent: string | null;
  ipAddress: string | null;
  referer: string | null;
  acceptLanguage: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
}

/**
 * QR Code Tracking Function
 *
 * Usage: Create a QR code pointing to:
 *   https://yoursite.netlify.app/qr?url=ENCODED_DESTINATION_URL&campaign=CAMPAIGN_ID
 *
 * Parameters:
 *   - url (required): The destination URL to redirect to (must be URL encoded)
 *   - campaign (optional): A campaign identifier for grouping scans
 *
 * Example:
 *   /qr?url=https%3A%2F%2Fexample.com%2Fmenu&campaign=table-tent-jan2025
 */
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed. Use GET." }),
    };
  }

  // Parse query parameters
  const params = event.queryStringParameters || {};
  const destinationUrl = params.url;
  const campaignId = params.campaign || null;

  // Validate destination URL
  if (!destinationUrl) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `
        <!DOCTYPE html>
        <html>
        <head><title>QR Tracking Error</title></head>
        <body>
          <h1>Missing destination URL</h1>
          <p>The QR code is misconfigured. Please contact support.</p>
        </body>
        </html>
      `,
    };
  }

  // Decode and validate the URL
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(destinationUrl);
    new URL(decodedUrl);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `
        <!DOCTYPE html>
        <html>
        <head><title>QR Tracking Error</title></head>
        <body>
          <h1>Invalid destination URL</h1>
          <p>The QR code contains an invalid URL. Please contact support.</p>
        </body>
        </html>
      `,
    };
  }

  // Generate a unique scan ID
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Extract headers for metrics
  const headers = event.headers || {};

  // Build the metric object
  const metric: QRScanMetric = {
    timestamp: new Date(),
    scanId,
    campaignId,
    destinationUrl: decodedUrl,
    userAgent: headers["user-agent"] || null,
    ipAddress: headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
               headers["x-nf-client-connection-ip"] ||
               headers["client-ip"] || null,
    referer: headers["referer"] || headers["referrer"] || null,
    acceptLanguage: headers["accept-language"] || null,
    country: headers["x-country"] || headers["x-nf-country-code"] || null,
    region: headers["x-region"] || headers["x-nf-region-code"] || null,
    city: headers["x-city"] || headers["x-nf-city"] || null,
  };

  // Save to Firestore
  try {
    if (getApps().length > 0) {
      const db = getFirestore();
      await db.collection("qr-redirects").add({
        ...metric,
        timestamp: new Date(), // Firestore will convert to Timestamp
      });
      console.log("QR scan saved to Firestore:", scanId);
    } else {
      console.warn("Firebase not initialized - check environment variables");
      console.log("QR_SCAN_METRIC:", JSON.stringify(metric));
    }
  } catch (err) {
    console.error("Failed to save to Firestore:", err);
    // Still log to console as backup
    console.log("QR_SCAN_METRIC:", JSON.stringify(metric));
  }

  // Redirect to the destination URL
  return {
    statusCode: 302,
    headers: {
      Location: decodedUrl,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
    body: "",
  };
};
