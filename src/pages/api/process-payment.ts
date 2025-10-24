import type { APIRoute } from "astro";
import { getPlanDetailsForNotification } from "../../config/plans.ts";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Enable server-side rendering for this API endpoint
export const prerender = false;

// MiCamp/AcceptBlue API configuration
// Use process.env directly in Netlify Functions
const ACCEPTBLUE_API_KEY = process.env.ACCEPTBLUE_API_KEY;
const ACCEPTBLUE_PIN = process.env.ACCEPTBLUE_PIN;
const ACCEPTBLUE_ENVIRONMENT = process.env.ACCEPTBLUE_ENVIRONMENT || "sandbox";
const MICAMP_BASE_URL =
  ACCEPTBLUE_ENVIRONMENT === "production"
    ? "https://api.micampblue.com/api/v2"
    : "https://api.sandbox.micampblue.com/api/v2";

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log("🚀 =============== PAYMENT REQUEST RECEIVED ===============");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("📡 URL Path:", request.url);
    console.log("📡 Request Method:", request.method);
    console.log("📡 Processing payment request...");

    // Debug: Check if credentials are loaded
    console.log("🔑 API Credentials Check:", {
      hasApiKey: !!ACCEPTBLUE_API_KEY,
      hasPin: !!ACCEPTBLUE_PIN,
      environment: ACCEPTBLUE_ENVIRONMENT,
      baseUrl: MICAMP_BASE_URL
    });

    // Log all headers for debugging
    console.log("📋 Request Headers:");
    for (const [name, value] of request.headers) {
      console.log(`  ${name}: ${value}`);
    }

    // Check if request has content
    const contentType = request.headers.get("content-type");
    console.log("📋 Content-Type:", contentType);

    if (!contentType?.includes("application/json")) {
      console.error("❌ Invalid Content-Type:", contentType);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Content-Type must be application/json",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("📥 Attempting to parse JSON payload...");
    const paymentData = await request.json();
    console.log("✅ JSON payload parsed successfully!");
    console.log("📊 Payment Data Structure:", {
      hasCustomer: !!paymentData.customer,
      hasPlanId: !!paymentData.planId,
      hasCardNumber: !!paymentData.cardNumber,
      hasToken: !!paymentData.payment?.token,
      customerEmail: paymentData.customer?.email || "NOT PROVIDED",
      planId: paymentData.planId || "NOT PROVIDED",
    });
    console.log(
      "📝 Full Received payment data:",
      JSON.stringify(paymentData, null, 2)
    );

    // Validate required fields - accept either token or direct card data
    if (!paymentData.payment?.token && !paymentData.cardNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment token or card information is required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!paymentData.customer?.email || !paymentData.planId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Customer email and plan ID are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate amount based on plan using centralized configuration
    const planDetails = getPlanDetailsForNotification(paymentData.planId);
    const amount = planDetails ? planDetails.priceNumeric : 0;

    if (amount === 0 && paymentData.planId !== "business") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid plan selected" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ==================== STEP 1: CREATE CUSTOMER ====================
    console.log(
      "🚀 STARTING RECURRING BILLING SETUP - STEP 1: CREATE CUSTOMER"
    );
    console.log("📝 Customer data to create:", {
      firstName: paymentData.customer.firstName,
      lastName: paymentData.customer.lastName,
      email: paymentData.customer.email,
      phone: paymentData.customer.phone,
      address: paymentData.customer.address,
      city: paymentData.customer.city,
      state: paymentData.customer.state,
      zipCode: paymentData.customer.zipCode,
    });

    let customerId = null;
    try {
      const customerResult = await createStandaloneCustomer(
        paymentData.customer
      );
      customerId = customerResult.id;
      console.log("✅ STEP 1 COMPLETE: Customer saved successfully!");
      console.log("👤 Customer Details:", {
        customerId,
        identifier: customerResult.identifier,
        email: paymentData.customer.email,
        customerNumber: customerResult.customer_number,
      });
    } catch (error) {
      console.error("❌ STEP 1 FAILED: Customer creation failed:", error);
      console.error(
        "⚠️  Continuing without customer linking - transaction will still work"
      );
    }

    // ==================== STEP 2: CREATE PAYMENT METHOD ====================
    console.log("\n🚀 STEP 2: CREATE PAYMENT METHOD (SAVE CARD)");
    if (customerId) {
      console.log("💳 Card data to save:", {
        cardNumber: "****" + paymentData.cardNumber.slice(-4),
        expiryMonth: paymentData.expiryMonth,
        expiryYear: paymentData.expiryYear,
        customerId: customerId,
      });
    }

    let paymentMethodId = null;
    let paymentMethodResult = null;
    try {
      if (!customerId) {
        throw new Error("Cannot create payment method without customer ID");
      }

      paymentMethodResult = await createPaymentMethod(customerId, paymentData);
      paymentMethodId = paymentMethodResult.id;
      console.log(
        "✅ STEP 2 COMPLETE: Payment method (card) saved successfully!"
      );
      console.log("💳 Payment Method Details:", {
        paymentMethodId,
        customerId,
        isPrimary: paymentMethodResult.is_primary,
        cardType: paymentMethodResult.card_type,
        last4: paymentMethodResult.last4,
      });
    } catch (error) {
      console.error("❌ STEP 2 FAILED: Payment method creation failed:", error);
      console.error(
        "⚠️  Falling back to direct charge without recurring billing"
      );
    }

    // ==================== STEP 2.5: VERIFY PAYMENT METHOD CREATION ====================
    let actualPaymentMethodId = paymentMethodId;
    if (customerId && paymentMethodId) {
      console.log("\n🚀 STEP 2.5: VERIFY PAYMENT METHOD CREATION");
      try {
        // Verify the payment method was created successfully by checking customer's payment methods
        const credentials = Buffer.from(
          `${ACCEPTBLUE_API_KEY}:${ACCEPTBLUE_PIN}`
        ).toString("base64");

        console.log(
          "🔍 Verifying payment method creation for customer:",
          customerId
        );
        const existingMethodsResponse = await fetch(
          `${MICAMP_BASE_URL}/customers/${customerId}/payment-methods`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${credentials}`,
              Accept: "application/json",
              "User-Agent": "chasers_dd",
            },
          }
        );

        const existingMethods = await existingMethodsResponse.json();
        console.log(
          "💳 Payment methods verification response status:",
          existingMethodsResponse.status
        );
        console.log(
          "💳 Customer payment methods after creation:",
          JSON.stringify(existingMethods, null, 2)
        );

        // Find our newly created payment method
        if (Array.isArray(existingMethods) && existingMethods.length > 0) {
          const matchingMethod = existingMethods.find(pm => pm.id === paymentMethodId);
          if (matchingMethod) {
            actualPaymentMethodId = matchingMethod.id;
            console.log("✅ STEP 2.5 COMPLETE: Payment method verified!");
            console.log("💳 Verified Payment Method:", {
              id: matchingMethod.id,
              card_type: matchingMethod.card_type,
              last4: matchingMethod.last4,
              is_primary: matchingMethod.is_primary
            });
          } else {
            console.warn("⚠️  Payment method not found in customer's methods, using original ID");
          }
        } else {
          console.warn("⚠️  No payment methods found for customer, this may indicate an issue");
        }
      } catch (error) {
        console.error(
          "❌ STEP 2.5 FAILED: Payment method verification failed:",
          error
        );
        console.error("⚠️  Will use original payment method ID");
      }
    }

    // Create AcceptBlue transaction request (proper structure for recurring)
    const transactionRequest: any = {
      amount: amount, // MiCamp Blue v2 expects amount in USD, not cents
      // Transaction details
      transaction_details: {
        description: `${paymentData.plan?.name || "Membership"} - ${paymentData.planId} (Recurring)`,
      },
      // Billing info structure
      billing_info: {
        first_name: paymentData.customer.firstName,
        last_name: paymentData.customer.lastName,
        street: paymentData.customer.address,
        city: paymentData.customer.city,
        state: paymentData.customer.state,
        zip: paymentData.customer.zipCode,
        country: "US",
        phone: paymentData.customer.phone,
      },
      // Shipping info (same as billing for memberships)
      shipping_info: {
        first_name: paymentData.customer.firstName,
        last_name: paymentData.customer.lastName,
        street: paymentData.customer.address,
        city: paymentData.customer.city,
        state: paymentData.customer.state,
        zip: paymentData.customer.zipCode,
        country: "US",
        phone: paymentData.customer.phone,
      },
      // Link to customer if created successfully
      ...(customerId && {
        customer: {
          customer_id: customerId,
          send_receipt: true,
          email: paymentData.customer.email,
          identifier: `${paymentData.customer.firstName} ${paymentData.customer.lastName} (${paymentData.customer.email})`,
        },
      }),
      // Transaction flags - THIS IS WHERE RECURRING GOES
      transaction_flags: {
        is_recurring: true, // Enable recurring transactions for membership billing
        is_customer_initiated: true, // Customer initiated this transaction
        cardholder_present: false, // Online transaction
        card_present: false, // Online transaction
      },
      // AVS data (required for recurring)
      avs_zip: paymentData.customer.zipCode,
      avs_address: paymentData.customer.address,
      // Save card for future recurring charges
      save_card: true,
    };

    // ==================== STEP 3: CREATE RECURRING TRANSACTION ====================
    console.log("\n🚀 STEP 3: CREATE RECURRING TRANSACTION");

    if (paymentMethodId) {
      // Use payment method for recurring billing with proper source token format
      // The validation pattern is: "(tkn|nonce|ref|pm)-[A-Za-z0-9]+"
      // Since we created a payment method directly, use "pm-" prefix
      transactionRequest.source = `pm-${paymentMethodId}`; // Format as pm-PAYMENTMETHODID for source charges
      // Remove direct card fields since we're using a source token
      delete transactionRequest.card;
      delete transactionRequest.expiry_month;
      delete transactionRequest.expiry_year;
      delete transactionRequest.cvv2;
      delete transactionRequest.save_card; // Don't need to save again
      console.log("✅ SETTING UP RECURRING BILLING:");
      console.log(
        "💳 Payment Source (Formatted Token):",
        `pm-${paymentMethodId}`
      );
      console.log("💳 Original Payment Method ID:", paymentMethodId);
      console.log("🔄 Recurring Settings:", {
        isRecurring: transactionRequest.transaction_flags.is_recurring,
        isCustomerInitiated:
          transactionRequest.transaction_flags.is_customer_initiated,
        customerId: customerId,
        sourceToken: `pm-${paymentMethodId}`,
      });
      console.log("💰 Transaction Details:", {
        amount: amount,
        planId: paymentData.planId,
        planName: paymentData.plan?.name,
        description: transactionRequest.transaction_details.description,
      });
    } else if (paymentData.payment?.token) {
      // Fallback to token
      transactionRequest.source = paymentData.payment.token;
      console.warn("⚠️  Using token source (not ideal for recurring)");
    } else {
      // Fallback to direct card processing (won't be recurring)
      transactionRequest.card = paymentData.cardNumber.replace(/\s/g, "");
      transactionRequest.expiry_month = parseInt(paymentData.expiryMonth);
      transactionRequest.expiry_year = parseInt(paymentData.expiryYear);
      transactionRequest.cvv2 = paymentData.cvv;
      // Remove recurring flag if no payment method
      transactionRequest.transaction_flags.is_recurring = false;
      console.error(
        "❌ STEP 3 FALLBACK: Using direct card without recurring billing"
      );
      console.error(
        "⚠️  This transaction will NOT be set up for recurring payments"
      );
    }

    // Process payment with MiCamp API
    // Create Basic Auth header (API Key:PIN)
    const credentials = Buffer.from(
      `${ACCEPTBLUE_API_KEY}:${ACCEPTBLUE_PIN}`
    ).toString("base64");

    console.log(
      "Sending transaction request to AcceptBlue:",
      JSON.stringify(transactionRequest, null, 2)
    );

    const response = await fetch(`${MICAMP_BASE_URL}/transactions/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
        "User-Agent": "chasers_dd",
      },
      body: JSON.stringify(transactionRequest),
    });

    const result = await response.json();

    console.log("AcceptBlue API response status:", response.status);
    console.log("AcceptBlue API response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("AcceptBlue API error - Status:", response.status);
      console.error("AcceptBlue API error - Response:", result);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            result.error_message ||
            result.message ||
            result.response_text ||
            "Payment processing failed",
          details: result,
          debug: {
            sentRequest: transactionRequest,
            responseStatus: response.status,
            fullResponse: result,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (result.status === "Approved") {
      // ==================== STEP 4: CREATE RECURRING SCHEDULE ====================
      let scheduleId = null;
      if (customerId && paymentMethodId) {
        console.log("\n🚀 STEP 4: CREATE RECURRING SCHEDULE");
        try {
          // Use the actual payment method ID if we created one, otherwise fall back to card_ref
          const methodToUse = actualPaymentMethodId || paymentMethodId;
          scheduleId = await createRecurringSchedule(
            customerId,
            { id: methodToUse, card_ref: paymentMethodId },
            amount,
            paymentData,
            result
          );
          console.log(
            "✅ STEP 4 COMPLETE: Recurring schedule created successfully!"
          );
          console.log("📅 Schedule Details:", {
            scheduleId,
            frequency: "monthly",
          });
        } catch (error) {
          console.error(
            "❌ STEP 4 FAILED: Recurring schedule creation failed:",
            error
          );
          console.error(
            "⚠️  Transaction was successful but recurring billing setup incomplete"
          );
        }
      }

      console.log(
        "\n🎉 =============== RECURRING BILLING SETUP COMPLETE! ==============="
      );
      console.log(
        "✅ STEP 3 COMPLETE: Recurring transaction processed successfully!"
      );
      console.log("🎯 FINAL RESULTS:");
      console.log("📊 Transaction Summary:", {
        transactionId: result.id,
        referenceNumber: result.reference_number,
        authCode: result.auth_code,
        amount: amount,
        status: result.status,
      });
      console.log("👤 Customer & Billing Setup:", {
        customerId: customerId,
        customerEmail: paymentData.customer.email,
        paymentMethodId: paymentMethodId,
        linkedToCustomer: !!customerId,
        recurringEnabled: !!scheduleId,
        planId: paymentData.planId,
        planName: paymentData.plan?.name,
        subscriptionType: "monthly",
        scheduleId: scheduleId,
      });
      console.log(
        "🔄 Recurring Status:",
        scheduleId
          ? "✅ ENABLED - Future charges will be automatic"
          : "❌ DISABLED - Manual charges required"
      );
      console.log(
        "===============================================================\n"
      );

      // Send notifications (don't block payment response if notifications fail)
      Promise.all([
        sendEmailNotifications(paymentData, result.id, amount),
        sendSMSNotifications(paymentData, result.id, amount),
      ]).catch((error) => {
        console.error("Notification sending failed (non-blocking):", error);
      });

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: result.id,
          customerId: customerId,
          message: "Payment processed successfully",
          customer: {
            email: paymentData.customer.email,
            plan: paymentData.planId,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.response_text || "Payment was declined",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Helper function to create customer from transaction
async function createCustomerFromTransaction(
  transactionId: string | number,
  customerData: any
) {
  const credentials = Buffer.from(
    `${ACCEPTBLUE_API_KEY}:${ACCEPTBLUE_PIN}`
  ).toString("base64");

  // Try create-from-transaction first
  try {
    // Create identifier from customer name and email
    const identifier = `${customerData.firstName} ${customerData.lastName} (${customerData.email})`;

    const customerRequest = {
      transaction_id: transactionId,
      identifier: identifier, // Add required identifier
      customer_number: `CHASERS-${Date.now()}`, // Optional unique identifier
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      billing_info: {
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        street: customerData.address,
        city: customerData.city,
        state: customerData.state,
        zip: customerData.zipCode,
        country: "US",
        phone: customerData.phone,
      },
      shipping_info: {
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        street: customerData.address,
        city: customerData.city,
        state: customerData.state,
        zip: customerData.zipCode,
        country: "US",
        phone: customerData.phone,
      },
      active: true,
    };

    console.log(
      "Creating customer from transaction:",
      JSON.stringify(customerRequest, null, 2)
    );

    const response = await fetch(
      `${MICAMP_BASE_URL}/customers/create-from-transaction`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        "User-Agent": "chasers_dd",
        },
        body: JSON.stringify(customerRequest),
      }
    );

    const result = await response.json();

    console.log("Customer creation response status:", response.status);
    console.log("Customer creation response:", JSON.stringify(result, null, 2));

    if (response.ok) {
      return result;
    } else {
      console.warn(
        "Create-from-transaction failed, trying standalone customer creation"
      );
      throw new Error(
        `Transaction-based creation failed: ${result.message || response.status}`
      );
    }
  } catch (error) {
    console.warn(
      "Create-from-transaction failed, trying standalone customer creation:",
      error.message
    );

    // Fallback: Create standalone customer
    return await createStandaloneCustomer(customerData);
  }
}

// Helper function to create standalone customer
async function createStandaloneCustomer(customerData: any) {
  const credentials = Buffer.from(
    `${ACCEPTBLUE_API_KEY}:${ACCEPTBLUE_PIN}`
  ).toString("base64");

  // Create identifier from customer name and email
  const identifier = `${customerData.firstName} ${customerData.lastName} (${customerData.email})`;

  const customerRequest = {
    identifier: identifier, // Required field
    customer_number: `CHASERS-${Date.now()}`, // Optional unique identifier
    first_name: customerData.firstName,
    last_name: customerData.lastName,
    email: customerData.email,
    phone: customerData.phone,
    billing_info: {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      street: customerData.address,
      city: customerData.city,
      state: customerData.state,
      zip: customerData.zipCode,
      country: "US",
      phone: customerData.phone,
    },
    shipping_info: {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      street: customerData.address,
      city: customerData.city,
      state: customerData.state,
      zip: customerData.zipCode,
      country: "US",
      phone: customerData.phone,
    },
    active: true,
  };

  console.log(
    "Creating standalone customer:",
    JSON.stringify(customerRequest, null, 2)
  );

  const response = await fetch(`${MICAMP_BASE_URL}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
        "User-Agent": "chasers_dd",
    },
    body: JSON.stringify(customerRequest),
  });

  console.log("Standalone customer creation response status:", response.status);

  // Handle non-JSON responses (like "Unauthorized" text)
  const contentType = response.headers.get("content-type");
  let result;
  if (contentType && contentType.includes("application/json")) {
    result = await response.json();
    console.log(
      "Standalone customer creation response:",
      JSON.stringify(result, null, 2)
    );
  } else {
    const textResponse = await response.text();
    console.error("Non-JSON response received:", textResponse);
    throw new Error(
      `API returned non-JSON response (${response.status}): ${textResponse}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Standalone customer creation failed: ${result.message || response.status}`
    );
  }

  return result;
}

// Helper function to create payment method directly using customer payment methods API
async function createPaymentMethod(customerId: number, paymentData: any) {
  if (!customerId) {
    throw new Error("Customer ID is required to create payment method");
  }

  const credentials = Buffer.from(
    `${ACCEPTBLUE_API_KEY}:${ACCEPTBLUE_PIN}`
  ).toString("base64");

  // Create name on card from customer data
  const nameOnCard = `${paymentData.customer.firstName} ${paymentData.customer.lastName}`;

  // Use direct payment method creation API (Option A: Create Credit Card Payment Method)
  const paymentMethodRequest = {
    // Card data (required) - exact field names from API documentation
    card: paymentData.cardNumber.replace(/\s/g, ""), // 14-16 digits only
    expiry_month: parseInt(paymentData.expiryMonth), // 1-12
    expiry_year: parseInt(paymentData.expiryYear), // 2020-9999
    cvv2: paymentData.cvv, // optional CVV
    name: nameOnCard, // optional cardholder name
    // AVS data (optional billing verification)
    avs_address: paymentData.customer.address,
    avs_zip: paymentData.customer.zipCode,
  };

  console.log(
    `🚀 Creating payment method directly for customer ${customerId}:`,
    JSON.stringify(
      {
        ...paymentMethodRequest,
        card: "****" + paymentMethodRequest.card.slice(-4), // Hide full card number in logs
        cvv2: "***", // Hide CVV in logs
      },
      null,
      2
    )
  );

  console.log("🔍 Using direct payment method creation endpoint...");
  console.log("Base URL:", MICAMP_BASE_URL);
  console.log("Endpoint:", `${MICAMP_BASE_URL}/customers/${customerId}/payment-methods`);

  const response = await fetch(`${MICAMP_BASE_URL}/customers/${customerId}/payment-methods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
        "User-Agent": "chasers_dd",
    },
    body: JSON.stringify(paymentMethodRequest),
  });

  console.log("💳 Payment method creation response status:", response.status);
  console.log(
    "💳 Payment method creation response headers:",
    Object.fromEntries(response.headers)
  );

  // Check if response is JSON or HTML/text
  const responseText = await response.text();
  console.log("💳 Payment method creation raw response:", responseText);

  let result;
  try {
    result = JSON.parse(responseText);
    console.log(
      "💳 Payment method creation parsed JSON:",
      JSON.stringify(result, null, 2)
    );
  } catch (parseError) {
    console.error("Failed to parse response as JSON:", parseError.message);
    console.error(
      "Response was likely HTML or plain text:",
      responseText.substring(0, 500)
    );
    throw new Error(
      `Payment method creation endpoint returned non-JSON response (${response.status}): ${responseText.substring(0, 200)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Payment method creation failed (${response.status}): ${result.message || result.error_message || "Unknown error"}`
    );
  }

  if (!result.id) {
    throw new Error(
      "Payment method creation succeeded but no payment method ID was returned"
    );
  }

  // Return the payment method details
  console.log("✅ Payment method created successfully!");
  console.log("💳 Payment method ID:", result.id);
  console.log("💳 Available fields:", Object.keys(result));

  return {
    id: result.id, // Use the actual payment method ID
    token: result.token || result.card_ref || result.id, // Token for source charges
    customerId: customerId,
    card_type: result.card_type,
    last4: result.last4 || result.last_4,
    is_primary: result.is_primary,
    fullResponse: result, // For debugging
  };
}


// Helper function to create a recurring schedule
async function createRecurringSchedule(
  customerId: number,
  paymentMethodInfo: any,
  amount: number,
  paymentData: any,
  transactionResult: any
) {
  const credentials = Buffer.from(
    `${ACCEPTBLUE_API_KEY}:${ACCEPTBLUE_PIN}`
  ).toString("base64");

  try {
    console.log("🔄 Creating recurring schedule for customer:", customerId);
    console.log("💳 Using payment method info:", paymentMethodInfo);

    const cardRef = paymentMethodInfo.card_ref || paymentMethodInfo.id;

    // Step 4a: Get customer's payment methods to find the integer payment_method_id
    console.log(`🔍 Getting payment methods for customer... ${customerId}/`);
    const paymentMethodsResponse = await fetch(
      `${MICAMP_BASE_URL}/customers/${customerId}/payment-methods`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        "User-Agent": "chasers_dd",
        },
      }
    );

    const paymentMethods = await paymentMethodsResponse.json();
    console.log(
      "💳 Customer payment methods response:",
      JSON.stringify(paymentMethods, null, 2)
    );

    if (!paymentMethodsResponse.ok) {
      throw new Error(
        `Failed to get payment methods (${paymentMethodsResponse.status}): ${paymentMethods.error_message || "Unknown error"}`
      );
    }

    // Find the payment method that matches our card_ref
    let paymentMethodId = null;
    if (Array.isArray(paymentMethods)) {
      // Look for payment method with matching card reference
      const matchingMethod = paymentMethods.find(
        (pm) =>
          pm.card_ref === cardRef ||
          pm.token === cardRef ||
          pm.id === cardRef ||
          pm.last_4 === String(cardRef).slice(-4)
      );
      paymentMethodId = matchingMethod?.id;
    }

    if (!paymentMethodId) {
      throw new Error(`No payment method found for card reference: ${cardRef}`);
    }

    console.log("✅ Found payment method ID:", paymentMethodId);

    // Step 4b: Create recurring schedule with proper payment_method_id (integer)
    // Calculate next billing date: 1 month from the original transaction date
    console.log("🔍 DEBUG: Transaction result fields:", {
      hasCreatedAt: !!transactionResult.created_at,
      createdAt: transactionResult.created_at,
      hasCreatedDate: !!transactionResult.created_date,
      createdDate: transactionResult.created_date,
      hasTimestamp: !!transactionResult.timestamp,
      timestamp: transactionResult.timestamp,
      allFields: Object.keys(transactionResult)
    });

    // Get transaction date from nested transaction object if available
    const transactionDate = transactionResult.transaction?.created_at
      ? new Date(transactionResult.transaction.created_at)
      : (transactionResult.created_at
          ? new Date(transactionResult.created_at)
          : new Date()); // Fallback to current date if transaction date not available

    const nextBillingDate = new Date(transactionDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    const startDate = nextBillingDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    console.log("📅 Recurring billing date calculation:", {
      originalTransactionDate: transactionDate.toISOString(),
      nextBillingDate: nextBillingDate.toISOString(),
      startDate: startDate,
      usingFallback: !transactionResult.created_at
    });

    const scheduleRequest = {
      title: `${paymentData.plan?.name || "Membership"} Subscription`, // Required field
      amount: amount, // MiCamp Blue v2 expects amount in USD, not cents
      frequency: "monthly", // Monthly billing for membership
      payment_method_id: paymentMethodId, // Use integer payment method ID
      description: `${paymentData.plan?.name || "Membership"} - Monthly Recurring`,
      start_date: startDate, // Set to 1 month from original transaction date
      next_run_date: startDate // Try this field as well in case start_date is ignored
    };

    console.log(
      "📋 Creating recurring schedule:",
      JSON.stringify(scheduleRequest, null, 2)
    );

    const response = await fetch(
      `${MICAMP_BASE_URL}/customers/${customerId}/recurring-schedules`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        "User-Agent": "chasers_dd",
        },
        body: JSON.stringify(scheduleRequest),
      }
    );

    const result = await response.json();

    console.log("📅 Recurring schedule response status:", response.status);
    console.log(
      "📅 Recurring schedule response:",
      JSON.stringify(result, null, 2)
    );

    if (!response.ok) {
      throw new Error(
        `Recurring schedule creation failed (${response.status}): ${result.error_message || result.message || "Unknown error"}`
      );
    }

    return result.id; // Return schedule ID
  } catch (error) {
    console.error("❌ Recurring schedule creation error:", error);
    throw error;
  }
}

// Helper function to send email notifications with retry logic
async function sendEmailNotifications(
  paymentData: any,
  transactionId: string,
  amount: number
) {
  const { sendNotificationBatch, logNotificationMetrics } = await import(
    "./notification-utils.js"
  );

  try {
    // Get centralized plan details for email content
    const planDetails = getPlanDetailsForNotification(paymentData.planId);

    const emailNotifications = [
      // Transaction confirmation email (always sent)
      {
        type: "email" as const,
        data: {
          type: "transaction_confirmation",
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            email: paymentData.customer.email,
          },
          transaction: {
            id: transactionId,
            amount: amount,
            planName: planDetails?.name || paymentData.plan?.name,
            planId: paymentData.planId,
          },
          plan: planDetails ? {
            name: planDetails.name,
            price: planDetails.price,
            features: planDetails.features,
            emailSubject: planDetails.emailSubject,
            smsMessage: planDetails.smsMessage,
            tripFee: planDetails.tripFee,
            billingCycle: planDetails.billingCycle
          } : null,
        },
      },
      // Welcome email (always sent)
      {
        type: "email" as const,
        data: {
          type: "welcome",
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            email: paymentData.customer.email,
          },
          plan: planDetails ? {
            name: planDetails.name,
            price: planDetails.price,
            features: planDetails.features,
            emailSubject: planDetails.emailSubject,
            tripFee: planDetails.tripFee
          } : null,
        },
      },
    ];

    // Add marketing email if consent given
    if (paymentData.marketing?.emailConsent) {
      emailNotifications.push({
        type: "email" as const,
        data: {
          type: "marketing",
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            email: paymentData.customer.email,
          },
          marketingConsent: true,
        },
      });
    }

    // Send notifications with retry logic
    const batchResult = await sendNotificationBatch(emailNotifications, {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 10000,
    });

    // Log metrics for each notification
    batchResult.results.forEach((result, index) => {
      logNotificationMetrics("email", result, {
        transactionId,
        notificationType: emailNotifications[index].data.type,
        customerEmail: paymentData.customer.email,
      });
    });

    console.log(
      `Email notifications batch: ${batchResult.successful} successful, ${batchResult.failed} failed`
    );

    // Don't throw error if some notifications failed - payment was successful
    if (batchResult.failed > 0) {
      console.warn(
        `${batchResult.failed} email notifications failed but payment was processed successfully`
      );
    }
  } catch (error) {
    console.error("Email notification error:", error);
    // Don't throw - payment was successful even if notifications failed
  }
}

// Helper function to send SMS notifications with retry logic
async function sendSMSNotifications(
  paymentData: any,
  transactionId: string,
  amount: number
) {
  const { sendNotificationBatch, logNotificationMetrics } = await import(
    "./notification-utils.js"
  );

  try {
    // Get centralized plan details for SMS content
    const planDetails = getPlanDetailsForNotification(paymentData.planId);

    const smsNotifications = [
      // Transaction confirmation SMS (always sent)
      {
        type: "sms" as const,
        data: {
          type: "transaction_confirmation",
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            phone: paymentData.customer.phone,
          },
          transaction: {
            id: transactionId,
            amount: amount,
            planName: planDetails?.name || paymentData.plan?.name,
            planId: paymentData.planId,
          },
          plan: planDetails ? {
            name: planDetails.name,
            price: planDetails.price,
            smsMessage: planDetails.smsMessage,
            tripFee: planDetails.tripFee
          } : null,
        },
      },
      // Welcome SMS (always sent)
      {
        type: "sms" as const,
        data: {
          type: "welcome",
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            phone: paymentData.customer.phone,
          },
          plan: planDetails ? {
            name: planDetails.name,
            price: planDetails.price,
            smsMessage: planDetails.smsMessage,
            tripFee: planDetails.tripFee
          } : null,
        },
      },
    ];

    // Add marketing SMS if consent given
    if (paymentData.marketing?.smsConsent) {
      smsNotifications.push({
        type: "sms" as const,
        data: {
          type: "marketing",
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            phone: paymentData.customer.phone,
          },
          marketingConsent: true,
        },
      });
    }

    // Send notifications with retry logic
    const batchResult = await sendNotificationBatch(smsNotifications, {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 10000,
    });

    // Log metrics for each notification
    batchResult.results.forEach((result, index) => {
      logNotificationMetrics("sms", result, {
        transactionId,
        notificationType: smsNotifications[index].data.type,
        customerPhone: paymentData.customer.phone,
      });
    });

    console.log(
      `SMS notifications batch: ${batchResult.successful} successful, ${batchResult.failed} failed`
    );

    // Don't throw error if some notifications failed - payment was successful
    if (batchResult.failed > 0) {
      console.warn(
        `${batchResult.failed} SMS notifications failed but payment was processed successfully`
      );
    }
  } catch (error) {
    console.error("SMS notification error:", error);
    // Don't throw - payment was successful even if notifications failed
  }
}
