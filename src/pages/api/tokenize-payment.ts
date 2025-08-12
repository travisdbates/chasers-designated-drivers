import type { APIRoute } from 'astro';

export const prerender = false;

// MiCamp tokenization API configuration
const TOKENIZATION_API_KEY = import.meta.env.PUBLIC_ACCEPTBLUE_TOKENIZATION_KEY || process.env.PUBLIC_ACCEPTBLUE_TOKENIZATION_KEY;
const MICAMP_API_BASE = 'https://api.sandbox.micampblue.com/api/v2';
const MICAMP_TOKENIZATION_URL = `${MICAMP_API_BASE}/payment-methods`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const cardData = await request.json();

    // Validate required fields
    if (!cardData.cardNumber || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvv) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'All card fields are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!TOKENIZATION_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tokenization service not configured' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format card data for MiCamp tokenization
    const tokenizationRequest = {
      card_number: cardData.cardNumber.replace(/\s/g, ''), // Remove spaces
      expiry_month: cardData.expiryMonth,
      expiry_year: cardData.expiryYear,
      cvv2: cardData.cvv,
      avs_zip: cardData.zipCode || ''
    };

    console.log('Tokenizing payment with MiCamp:', {
      cardNumber: `****${cardData.cardNumber.slice(-4)}`,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      hasZip: !!cardData.zipCode
    });

    // Call MiCamp tokenization API
    // Use Basic auth for tokenization as well
    const credentials = Buffer.from(`${TOKENIZATION_API_KEY}:`).toString('base64');
    
    const response = await fetch(MICAMP_TOKENIZATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(tokenizationRequest)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('MiCamp tokenization error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Payment tokenization failed' 
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return successful tokenization result
    console.log('Tokenization successful:', {
      hasNonce: !!result.nonce,
      cardType: result.card_type,
      last4: result.last_4
    });

    return new Response(
      JSON.stringify({
        success: true,
        nonce: result.nonce,
        cardType: result.card_type,
        last4: result.last_4,
        maskedCard: `****-****-****-${result.last_4}`,
        expiryMonth: parseInt(cardData.expiryMonth),
        expiryYear: parseInt(cardData.expiryYear),
        avsZip: cardData.zipCode
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tokenization error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Payment tokenization failed'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};