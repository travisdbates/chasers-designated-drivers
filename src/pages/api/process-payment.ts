import type { APIRoute } from 'astro';

// Enable server-side rendering for this API endpoint
export const prerender = false;

// MiCamp/AcceptBlue API configuration  
const ACCEPTBLUE_API_KEY = import.meta.env.ACCEPTBLUE_API_KEY || process.env.ACCEPTBLUE_API_KEY;
const ACCEPTBLUE_PIN = import.meta.env.ACCEPTBLUE_PIN || process.env.ACCEPTBLUE_PIN;
const ACCEPTBLUE_ENVIRONMENT = import.meta.env.ACCEPTBLUE_ENVIRONMENT || process.env.ACCEPTBLUE_ENVIRONMENT || 'sandbox';
const MICAMP_BASE_URL = ACCEPTBLUE_ENVIRONMENT === 'production' 
  ? 'https://api.micampblue.com/api/v2' 
  : 'https://api.sandbox.micampblue.com/api/v2';

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('Processing payment request...');
    
    // Check if request has content
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!contentType?.includes('application/json')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content-Type must be application/json' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await request.json();
    console.log('Received payment data:', JSON.stringify(paymentData, null, 2));
    
    // Validate required fields - only accept secure tokens
    if (!paymentData.payment?.token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Secure payment token is required. Direct card processing is not supported.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentData.customer?.email || !paymentData.planId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Customer email and plan ID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amount based on plan
    const planPricing = {
      'standard-individual': 59.99,
      'individual': 89.99,
      'joint': 89.99,
      'joint-premier': 149.99,
      'family': 249.99,
      'business': 599.99,
      'business-premier': 699.99
    };

    const amount = planPricing[paymentData.planId as keyof typeof planPricing] || 0;
    
    if (amount === 0 && paymentData.planId !== 'business') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid plan selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create AcceptBlue transaction request - try different field structure
    const transactionRequest: any = {
      amount: Math.round(amount * 100), // Convert to cents
      // Try standard field names
      first_name: paymentData.customer.firstName,
      last_name: paymentData.customer.lastName,
      email: paymentData.customer.email,
      phone: paymentData.customer.phone,
      address1: paymentData.customer.address,
      city: paymentData.customer.city,
      state: paymentData.customer.state,
      zip: paymentData.customer.zipCode,
      country: 'US',
      // Transaction details
      description: `${paymentData.plan?.name || 'Membership'} - ${paymentData.planId}`,
      // Try without metadata first to isolate issues
    };

    // Add secure tokenized payment source only - AcceptBlue expects nonce- prefix
    console.log('Processing secure tokenized payment');
    transactionRequest.source = `nonce-${paymentData.payment.token}`;
    
    // Add expiry fields as AcceptBlue expects separate integer month/year fields (full 4-digit year)
    if (paymentData.payment.expiryMonth && paymentData.payment.expiryYear) {
      transactionRequest.expiry_month = parseInt(paymentData.payment.expiryMonth);
      transactionRequest.expiry_year = parseInt(paymentData.payment.expiryYear); // Full 4-digit year
      console.log('Expiry date formatting:', {
        originalMonth: paymentData.payment.expiryMonth,
        originalYear: paymentData.payment.expiryYear,
        finalExpiryMonth: transactionRequest.expiry_month,
        finalExpiryYear: transactionRequest.expiry_year
      });
    } else {
      console.log('No expiry date data available from token');
    }

    // Process payment with MiCamp API
    // Create Basic Auth header (API Key:PIN)
    const credentials = Buffer.from(`${ACCEPTBLUE_API_KEY}:${ACCEPTBLUE_PIN}`).toString('base64');
    
    console.log('Sending transaction request to AcceptBlue:', JSON.stringify(transactionRequest, null, 2));
    
    const response = await fetch(`${MICAMP_BASE_URL}/transactions/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(transactionRequest)
    });

    const result = await response.json();
    
    console.log('AcceptBlue API response status:', response.status);
    console.log('AcceptBlue API response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('AcceptBlue API error - Status:', response.status);
      console.error('AcceptBlue API error - Response:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error_message || result.message || result.response_text || 'Payment processing failed',
          details: result,
          debug: {
            sentRequest: transactionRequest,
            responseStatus: response.status,
            fullResponse: result
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (result.status === 'Approved') {
      // TODO: Store customer and subscription information in database
      // TODO: Set up recurring billing
      
      console.log('Payment successful:', {
        transactionId: result.id,
        customer: paymentData.customer.email,
        plan: paymentData.planId,
        amount: amount
      });

      // Send notifications (don't block payment response if notifications fail)
      Promise.all([
        sendEmailNotifications(paymentData, result.id, amount),
        sendSMSNotifications(paymentData, result.id, amount)
      ]).catch(error => {
        console.error('Notification sending failed (non-blocking):', error);
      });

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: result.id,
          message: 'Payment processed successfully',
          customer: {
            email: paymentData.customer.email,
            plan: paymentData.planId
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.response_text || 'Payment was declined'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Helper function to send email notifications with retry logic
async function sendEmailNotifications(paymentData: any, transactionId: string, amount: number) {
  const { sendNotificationBatch, logNotificationMetrics } = await import('./notification-utils.js');
  
  try {
    const emailNotifications = [
      // Transaction confirmation email (always sent)
      {
        type: 'email' as const,
        data: {
          type: 'transaction_confirmation',
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            email: paymentData.customer.email
          },
          transaction: {
            id: transactionId,
            amount: amount,
            planName: paymentData.plan.name,
            planId: paymentData.planId
          }
        }
      },
      // Welcome email (always sent)
      {
        type: 'email' as const,
        data: {
          type: 'welcome',
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            email: paymentData.customer.email
          }
        }
      }
    ];

    // Add marketing email if consent given
    if (paymentData.marketing?.emailConsent) {
      emailNotifications.push({
        type: 'email' as const,
        data: {
          type: 'marketing',
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            email: paymentData.customer.email
          },
          marketingConsent: true
        }
      });
    }

    // Send notifications with retry logic
    const batchResult = await sendNotificationBatch(emailNotifications, {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 10000
    });

    // Log metrics for each notification
    batchResult.results.forEach((result, index) => {
      logNotificationMetrics('email', result, {
        transactionId,
        notificationType: emailNotifications[index].data.type,
        customerEmail: paymentData.customer.email
      });
    });

    console.log(`Email notifications batch: ${batchResult.successful} successful, ${batchResult.failed} failed`);
    
    // Don't throw error if some notifications failed - payment was successful
    if (batchResult.failed > 0) {
      console.warn(`${batchResult.failed} email notifications failed but payment was processed successfully`);
    }

  } catch (error) {
    console.error('Email notification error:', error);
    // Don't throw - payment was successful even if notifications failed
  }
}

// Helper function to send SMS notifications with retry logic
async function sendSMSNotifications(paymentData: any, transactionId: string, amount: number) {
  const { sendNotificationBatch, logNotificationMetrics } = await import('./notification-utils.js');
  
  try {
    const smsNotifications = [
      // Transaction confirmation SMS (always sent)
      {
        type: 'sms' as const,
        data: {
          type: 'transaction_confirmation',
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            phone: paymentData.customer.phone
          },
          transaction: {
            id: transactionId,
            amount: amount,
            planName: paymentData.plan.name,
            planId: paymentData.planId
          }
        }
      },
      // Welcome SMS (always sent)
      {
        type: 'sms' as const,
        data: {
          type: 'welcome',
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            phone: paymentData.customer.phone
          }
        }
      }
    ];

    // Add marketing SMS if consent given
    if (paymentData.marketing?.smsConsent) {
      smsNotifications.push({
        type: 'sms' as const,
        data: {
          type: 'marketing',
          customer: {
            firstName: paymentData.customer.firstName,
            lastName: paymentData.customer.lastName,
            phone: paymentData.customer.phone
          },
          marketingConsent: true
        }
      });
    }

    // Send notifications with retry logic
    const batchResult = await sendNotificationBatch(smsNotifications, {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 10000
    });

    // Log metrics for each notification
    batchResult.results.forEach((result, index) => {
      logNotificationMetrics('sms', result, {
        transactionId,
        notificationType: smsNotifications[index].data.type,
        customerPhone: paymentData.customer.phone
      });
    });

    console.log(`SMS notifications batch: ${batchResult.successful} successful, ${batchResult.failed} failed`);
    
    // Don't throw error if some notifications failed - payment was successful
    if (batchResult.failed > 0) {
      console.warn(`${batchResult.failed} SMS notifications failed but payment was processed successfully`);
    }

  } catch (error) {
    console.error('SMS notification error:', error);
    // Don't throw - payment was successful even if notifications failed
  }
}