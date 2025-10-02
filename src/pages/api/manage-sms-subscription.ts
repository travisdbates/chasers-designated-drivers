import type { APIRoute } from 'astro';

// SMS subscription management configuration
const ENABLE_MARKETING_SMS = process.env.ENABLE_MARKETING_SMS === 'true';

interface SMSSubscriptionData {
  action: 'subscribe' | 'unsubscribe' | 'update_preferences' | 'stop' | 'start';
  customer: {
    firstName?: string;
    lastName?: string;
    phone: string;
  };
  preferences?: {
    transactional: boolean;
    marketing: boolean;
    serviceUpdates: boolean;
  };
  source?: string; // Where the subscription request came from
  consentTimestamp?: Date;
}

// In-memory storage for demo purposes
// In production, this should be stored in a database
const smsSubscriptions = new Map<string, {
  phone: string;
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
  consentTimestamp?: Date;
  optOutHistory: Array<{
    action: 'stop' | 'start';
    timestamp: Date;
    source: string;
  }>;
}>();

export const POST: APIRoute = async ({ request }) => {
  try {
    const subscriptionData: SMSSubscriptionData = await request.json();

    // Validate required fields
    if (!subscriptionData.phone || !subscriptionData.action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone number and action are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format and validate phone number
    const phoneNumber = formatPhoneNumber(subscriptionData.phone);
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number format' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();

    switch (subscriptionData.action) {
      case 'subscribe':
        return handleSubscribe(phoneNumber, subscriptionData, now);
      
      case 'unsubscribe':
      case 'stop':
        return handleUnsubscribe(phoneNumber, subscriptionData, now);
      
      case 'start':
        return handleResubscribe(phoneNumber, subscriptionData, now);
      
      case 'update_preferences':
        return handleUpdatePreferences(phoneNumber, subscriptionData, now);
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action. Must be subscribe, unsubscribe, stop, start, or update_preferences' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('SMS subscription management error:', error);
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
    const phone = url.searchParams.get('phone');
    
    if (!phone) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone parameter is required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const phoneNumber = formatPhoneNumber(phone);
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number format' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const subscription = smsSubscriptions.get(phoneNumber);
    
    if (!subscription) {
      return new Response(
        JSON.stringify({
          success: true,
          subscribed: false,
          preferences: {
            transactional: true, // Always allow transactional SMS
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
        phone: subscription.phone,
        firstName: subscription.firstName,
        lastName: subscription.lastName,
        preferences: subscription.preferences,
        subscribedAt: subscription.subscribedAt,
        lastUpdated: subscription.lastUpdated,
        source: subscription.source,
        optOutHistory: subscription.optOutHistory
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SMS subscription lookup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Helper function to format and validate phone numbers
function formatPhoneNumber(phone: string): string | null {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 or 11 digits)
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If it already starts with +1, validate length
  if (phone.startsWith('+1') && digitsOnly.length === 11) {
    return phone;
  }
  
  return null;
}

// Helper functions
function handleSubscribe(phone: string, data: SMSSubscriptionData, now: Date): Response {
  if (!ENABLE_MARKETING_SMS) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS marketing is disabled',
        skipped: true 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const defaultPreferences = {
    transactional: true, // Always allow transactional SMS
    marketing: true,     // User is subscribing to marketing
    serviceUpdates: true // Allow service updates by default
  };

  const subscription = {
    phone: phone,
    firstName: data.customer.firstName,
    lastName: data.customer.lastName,
    preferences: data.preferences || defaultPreferences,
    subscribedAt: smsSubscriptions.has(phone) ? smsSubscriptions.get(phone)!.subscribedAt : now,
    lastUpdated: now,
    source: data.source || 'api',
    consentTimestamp: data.consentTimestamp || now,
    optOutHistory: smsSubscriptions.get(phone)?.optOutHistory || []
  };

  // Add to opt-in history if this is a resubscribe
  if (smsSubscriptions.has(phone)) {
    subscription.optOutHistory.push({
      action: 'start',
      timestamp: now,
      source: data.source || 'api'
    });
  }

  smsSubscriptions.set(phone, subscription);

  console.log('SMS subscription created/updated:', {
    phone: phone,
    preferences: subscription.preferences,
    source: subscription.source
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Successfully subscribed to SMS list. Reply STOP to opt out anytime.',
      preferences: subscription.preferences,
      helpMessage: 'Msg & data rates may apply. Reply HELP for help, STOP to opt out.'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function handleUnsubscribe(phone: string, data: SMSSubscriptionData, now: Date): Response {
  let subscription = smsSubscriptions.get(phone);
  
  if (!subscription) {
    // Create a record for the opt-out even if they weren't subscribed
    subscription = {
      phone: phone,
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      preferences: {
        transactional: true, // Keep transactional messages
        marketing: false,
        serviceUpdates: false
      },
      subscribedAt: now,
      lastUpdated: now,
      source: data.source || 'stop_request',
      optOutHistory: []
    };
  } else {
    // Update preferences to opt out of marketing while keeping transactional
    subscription.preferences.marketing = false;
    subscription.preferences.serviceUpdates = false;
    subscription.lastUpdated = now;
  }

  // Add to opt-out history
  subscription.optOutHistory.push({
    action: 'stop',
    timestamp: now,
    source: data.source || 'stop_request'
  });

  smsSubscriptions.set(phone, subscription);

  console.log('SMS unsubscribed from marketing:', {
    phone: phone,
    preferences: subscription.preferences
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'You have been unsubscribed from marketing SMS. You may still receive important service-related messages.',
      preferences: subscription.preferences,
      confirmationMessage: 'STOP confirmed. You will no longer receive marketing messages from Chasers DD.'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function handleResubscribe(phone: string, data: SMSSubscriptionData, now: Date): Response {
  if (!ENABLE_MARKETING_SMS) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS marketing is disabled',
        skipped: true 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let subscription = smsSubscriptions.get(phone);
  
  if (!subscription) {
    // Create new subscription
    subscription = {
      phone: phone,
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      preferences: {
        transactional: true,
        marketing: true,
        serviceUpdates: true
      },
      subscribedAt: now,
      lastUpdated: now,
      source: data.source || 'start_request',
      consentTimestamp: now,
      optOutHistory: []
    };
  } else {
    // Reactivate marketing preferences
    subscription.preferences.marketing = true;
    subscription.preferences.serviceUpdates = true;
    subscription.lastUpdated = now;
    subscription.consentTimestamp = now;
  }

  // Add to opt-in history
  subscription.optOutHistory.push({
    action: 'start',
    timestamp: now,
    source: data.source || 'start_request'
  });

  smsSubscriptions.set(phone, subscription);

  console.log('SMS resubscribed to marketing:', {
    phone: phone,
    preferences: subscription.preferences
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'You have been resubscribed to Chasers DD SMS notifications.',
      preferences: subscription.preferences,
      confirmationMessage: 'Welcome back! You will now receive SMS updates from Chasers DD. Reply STOP to opt out anytime.'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function handleUpdatePreferences(phone: string, data: SMSSubscriptionData, now: Date): Response {
  if (!data.preferences) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Preferences object is required for update_preferences action' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let subscription = smsSubscriptions.get(phone);
  
  if (!subscription) {
    // Create new subscription with provided preferences
    subscription = {
      phone: phone,
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      preferences: {
        transactional: true, // Always allow transactional SMS
        marketing: data.preferences.marketing || false,
        serviceUpdates: data.preferences.serviceUpdates || false
      },
      subscribedAt: now,
      lastUpdated: now,
      source: data.source || 'preferences_update',
      consentTimestamp: data.preferences.marketing ? now : undefined,
      optOutHistory: []
    };
  } else {
    // Update existing subscription
    const wasMarketingEnabled = subscription.preferences.marketing;
    
    subscription.preferences = {
      transactional: true, // Always allow transactional SMS
      marketing: data.preferences.marketing,
      serviceUpdates: data.preferences.serviceUpdates
    };
    subscription.lastUpdated = now;
    
    // Update consent timestamp if marketing was enabled
    if (data.preferences.marketing && !wasMarketingEnabled) {
      subscription.consentTimestamp = now;
      subscription.optOutHistory.push({
        action: 'start',
        timestamp: now,
        source: data.source || 'preferences_update'
      });
    } else if (!data.preferences.marketing && wasMarketingEnabled) {
      subscription.optOutHistory.push({
        action: 'stop',
        timestamp: now,
        source: data.source || 'preferences_update'
      });
    }
    
    // Update name if provided
    if (data.customer.firstName) subscription.firstName = data.customer.firstName;
    if (data.customer.lastName) subscription.lastName = data.customer.lastName;
  }

  smsSubscriptions.set(phone, subscription);

  console.log('SMS preferences updated:', {
    phone: phone,
    preferences: subscription.preferences
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'SMS preferences updated successfully',
      preferences: subscription.preferences
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}