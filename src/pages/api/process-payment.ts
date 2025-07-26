import type { APIRoute } from 'astro';

// AcceptBlue API configuration
const ACCEPTBLUE_API_KEY = process.env.ACCEPTBLUE_API_KEY || 'your_api_key_here';
const ACCEPTBLUE_PIN = process.env.ACCEPTBLUE_PIN || 'your_pin_here';
const ACCEPTBLUE_BASE_URL = process.env.ACCEPTBLUE_ENVIRONMENT === 'production' 
  ? 'https://api.accept.blue' 
  : 'https://sandbox-api.accept.blue';

export const POST: APIRoute = async ({ request }) => {
  try {
    const paymentData = await request.json();
    
    // Validate required fields
    if (!paymentData.payment?.token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment token is required' }),
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
      'individual': 89.00,
      'joint': 149.00,
      'family': 249.00,
      'corporate': 399.00,
      'business': 0 // Custom pricing
    };

    const amount = planPricing[paymentData.planId as keyof typeof planPricing] || 0;
    
    if (amount === 0 && paymentData.planId !== 'business') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid plan selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create AcceptBlue transaction
    const transactionRequest = {
      source: paymentData.payment.token,
      amount: Math.round(amount * 100), // Convert to cents
      customer: {
        first_name: paymentData.customer.firstName,
        last_name: paymentData.customer.lastName,
        email: paymentData.customer.email,
        phone: paymentData.customer.phone,
        address: {
          line_1: paymentData.customer.address,
          city: paymentData.customer.city,
          state: paymentData.customer.state,
          postal_code: paymentData.customer.zipCode,
          country: 'US'
        }
      },
      metadata: {
        plan_id: paymentData.planId,
        plan_name: paymentData.plan.name,
        subscription_type: 'monthly'
      }
    };

    // Process payment with AcceptBlue
    const response = await fetch(`${ACCEPTBLUE_BASE_URL}/v2/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCEPTBLUE_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(transactionRequest)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('AcceptBlue API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Payment processing failed' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (result.status === 'approved') {
      // TODO: Store customer and subscription information in database
      // TODO: Send welcome email
      // TODO: Set up recurring billing
      
      console.log('Payment successful:', {
        transactionId: result.id,
        customer: paymentData.customer.email,
        plan: paymentData.planId,
        amount: amount
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