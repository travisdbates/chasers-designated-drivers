import type { Handler, HandlerEvent } from "@netlify/functions";
import { config } from "dotenv";

// Load environment variables
config();

// This function is triggered by Netlify Form submissions
// Configure in Netlify UI: Settings > Forms > Form notifications > Outgoing webhooks
// Add webhook URL: /.netlify/functions/driver-signup-notification
export const handler: Handler = async (event: HandlerEvent) => {
  // Only handle POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    console.log("Driver signup notification triggered");

    // Parse the Netlify form submission payload
    const payload = JSON.parse(event.body || "{}");
    const formData = payload.data;

    console.log("Form data received:", formData);

    // Import the notification service
    const { sendAdminSignupNotification } = await import(
      "../../src/pages/api/notification-services.js"
    );

    // Parse the form data
    const fullName = formData.fullName || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Parse address
    const streetAddress1 = formData.streetAddress1 || "";
    const streetAddress2 = formData.streetAddress2 || "";
    const city = formData.city || "";
    const state = formData.state || "";
    const zipCode = formData.zipCode || "";

    const fullAddress = [streetAddress1, streetAddress2, city, state, zipCode]
      .filter(Boolean)
      .join(", ");

    // Parse days available (Netlify sends checkboxes as comma-separated string or array)
    let daysAvailable: string[] = [];
    if (typeof formData.daysAvailable === "string") {
      daysAvailable = formData.daysAvailable.split(",").map((d) => d.trim());
    } else if (Array.isArray(formData.daysAvailable)) {
      daysAvailable = formData.daysAvailable;
    }

    // Prepare admin notification data
    const adminNotificationData = {
      signupType: "driver" as const,
      customer: {
        firstName: firstName,
        lastName: lastName,
        email: formData.email || "",
        phone: formData.cellPhone || "",
      },
      driverInfo: {
        address: fullAddress,
        hasValidLicense: formData.hasLicense === "yes",
        startDate: formData.startDate || "",
        daysAvailable: daysAvailable,
        additionalInfo: formData.additionalInfo || "",
      },
      timestamp: new Date(),
    };

    // Send admin notification
    const result = await sendAdminSignupNotification(adminNotificationData);

    if (result.success) {
      console.log("Admin notification sent successfully:", result.data);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Admin notification sent",
        }),
      };
    } else if (result.skipped) {
      console.log("Admin notification skipped:", result.message);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Admin notification skipped",
        }),
      };
    } else {
      console.error("Admin notification failed:", result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: result.error,
        }),
      };
    }
  } catch (error: any) {
    console.error("Driver signup notification error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error.message,
      }),
    };
  }
};
