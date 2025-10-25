import type { APIRoute } from 'astro';

// Email subscription management configuration
const ENABLE_MARKETING_EMAILS = process.env.ENABLE_MARKETING_EMAILS === 'true';

interface EmailSubscriptionData {
  action: 'subscribe' | 'unsubscribe' | 'update_preferences';
  customer: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  preferences?: {
    transactional: boolean;
    marketing: boolean;
    serviceUpdates: boolean;
  };
  source?: string; // Where the subscription request came from (checkout, website, etc.)
}

// In-memory storage for demo purposes
// In production, this should be stored in a database
const emailSubscriptions = new Map<string, {
  email: string;
  firstName?: string;
  lastName?: string;
  preferences: {
    transactional: boolean;
    marketing: boolean;
    serviceUpdates: boolean;
  };
  subscribedAt: Date;
  lastUpdated: Date;
  source: string;
}>();

export const POST: APIRoute = async ({ request }) => {
  try {
    const subscriptionData: EmailSubscriptionData = await request.json();

    // Validate required fields
    if (!subscriptionData.email || !subscriptionData.action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email address and action are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(subscriptionData.email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email address format' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const email = subscriptionData.email.toLowerCase();
    const now = new Date();

    switch (subscriptionData.action) {
      case 'subscribe':
        return handleSubscribe(email, subscriptionData, now);
      
      case 'unsubscribe':
        return handleUnsubscribe(email, subscriptionData);
      
      case 'update_preferences':
        return handleUpdatePreferences(email, subscriptionData, now);
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action. Must be subscribe, unsubscribe, or update_preferences' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Email subscription management error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const email = url.searchParams.get('email');
    
    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email parameter is required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const subscription = emailSubscriptions.get(email.toLowerCase());
    
    if (!subscription) {
      return new Response(
        JSON.stringify({
          success: true,
          subscribed: false,
          preferences: {
            transactional: true, // Always allow transactional emails
            marketing: false,
            serviceUpdates: false
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscribed: true,
        email: subscription.email,
        firstName: subscription.firstName,
        lastName: subscription.lastName,
        preferences: subscription.preferences,
        subscribedAt: subscription.subscribedAt,
        lastUpdated: subscription.lastUpdated,
        source: subscription.source
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email subscription lookup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Helper functions
function handleSubscribe(email: string, data: EmailSubscriptionData, now: Date): Response {
  if (!ENABLE_MARKETING_EMAILS) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email marketing is disabled',
        skipped: true 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const defaultPreferences = {
    transactional: true, // Always allow transactional emails
    marketing: true,     // User is subscribing to marketing
    serviceUpdates: true // Allow service updates by default
  };

  const subscription = {
    email: email,
    firstName: data.customer.firstName,
    lastName: data.customer.lastName,
    preferences: data.preferences || defaultPreferences,
    subscribedAt: emailSubscriptions.has(email) ? emailSubscriptions.get(email)!.subscribedAt : now,
    lastUpdated: now,
    source: data.source || 'api'
  };

  emailSubscriptions.set(email, subscription);

  console.log('Email subscription created/updated:', {
    email: email,
    preferences: subscription.preferences,
    source: subscription.source
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Successfully subscribed to email list',
      preferences: subscription.preferences
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function handleUnsubscribe(email: string, data: EmailSubscriptionData): Response {
  const subscription = emailSubscriptions.get(email);
  
  if (!subscription) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email address was not subscribed'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Update preferences to opt out of marketing while keeping transactional
  subscription.preferences.marketing = false;
  subscription.preferences.serviceUpdates = false;
  subscription.lastUpdated = new Date();
  
  emailSubscriptions.set(email, subscription);

  console.log('Email unsubscribed from marketing:', {
    email: email,
    preferences: subscription.preferences
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Successfully unsubscribed from marketing emails',
      preferences: subscription.preferences
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function handleUpdatePreferences(email: string, data: EmailSubscriptionData, now: Date): Response {
  if (!data.preferences) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Preferences object is required for update_preferences action' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let subscription = emailSubscriptions.get(email);
  
  if (!subscription) {
    // Create new subscription with provided preferences
    subscription = {
      email: email,
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      preferences: {
        transactional: true, // Always allow transactional emails
        marketing: data.preferences.marketing || false,
        serviceUpdates: data.preferences.serviceUpdates || false
      },
      subscribedAt: now,
      lastUpdated: now,
      source: data.source || 'preferences_update'
    };
  } else {
    // Update existing subscription
    subscription.preferences = {
      transactional: true, // Always allow transactional emails
      marketing: data.preferences.marketing,
      serviceUpdates: data.preferences.serviceUpdates
    };
    subscription.lastUpdated = now;
    
    // Update name if provided
    if (data.customer.firstName) subscription.firstName = data.customer.firstName;
    if (data.customer.lastName) subscription.lastName = data.customer.lastName;
  }

  emailSubscriptions.set(email, subscription);

  console.log('Email preferences updated:', {
    email: email,
    preferences: subscription.preferences
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Email preferences updated successfully',
      preferences: subscription.preferences
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}