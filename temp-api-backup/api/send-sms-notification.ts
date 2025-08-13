import type { APIRoute } from 'astro';
import { Twilio } from 'twilio';
import { getCurrentNotificationSettings, isNotificationEnabled } from './manage-notification-settings.js';


// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio
const twilio = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) 
  ? new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) 
  : null;

interface SMSNotificationData {
  type: 'transaction_confirmation' | 'welcome' | 'marketing';
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  transaction?: {
    id: string;
    amount: number;
    planName: string;
    planId: string;
  };
  marketingConsent?: boolean;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check if SMS notifications are enabled
    if (!isNotificationEnabled('sms')) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'SMS notifications are disabled',
          skipped: true 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if Twilio is configured
    if (!twilio || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials not fully configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const notificationData: SMSNotificationData = await request.json();

    // Validate required fields
    if (!notificationData.customer?.phone || !notificationData.type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Customer phone and notification type are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate and format phone number
    const phoneNumber = formatPhoneNumber(notificationData.customer.phone);
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number format' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let messageContent;

    // Generate SMS content based on type
    switch (notificationData.type) {
      case 'transaction_confirmation':
        if (!notificationData.transaction) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Transaction data required for confirmation SMS' 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        messageContent = generateTransactionConfirmationSMS(notificationData);
        break;

      case 'welcome':
        messageContent = generateWelcomeSMS(notificationData);
        break;

      case 'marketing':
        if (!isNotificationEnabled('marketing_sms')) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Marketing SMS are disabled',
              skipped: true 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (!notificationData.marketingConsent) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Marketing SMS skipped - no consent',
              skipped: true 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        messageContent = generateMarketingSMS(notificationData);
        break;

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid notification type' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Send SMS via Twilio
    const message = await twilio.messages.create({
      body: messageContent,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log('SMS sent successfully:', {
      messageSid: message.sid,
      recipient: phoneNumber,
      type: notificationData.type
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS notification sent successfully',
        messageSid: message.sid
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SMS notification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to send SMS notification'
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

// SMS template functions
function generateTransactionConfirmationSMS(data: SMSNotificationData): string {
  const { customer, transaction } = data;
  
  return `Hi ${customer.firstName}! Your Chasers DD ${transaction?.planName} membership payment ($${(transaction?.amount || 0).toFixed(2)}) has been confirmed. Transaction ID: ${transaction?.id}. Call (480) 695-3659 for rides 3PM-3AM daily. Welcome to the family!`;
}

function generateWelcomeSMS(data: SMSNotificationData): string {
  const { customer } = data;
  
  return `Welcome to Chasers DD, ${customer.firstName}! Your membership is active. We drive you home in YOUR car 3PM-3AM daily. Call (480) 695-3659 when you need a safe ride. Thanks for choosing us!`;
}

function generateMarketingSMS(data: SMSNotificationData): string {
  const { customer } = data;
  
  return `Hi ${customer.firstName}! Thanks for joining Chasers DD. As a member, you get priority booking & special rates. We're Phoenix's trusted designated driver service - your car, our driving. Call (480) 695-3659 or text STOP to opt out.`;
}