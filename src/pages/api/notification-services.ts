// Direct notification services for internal use (no HTTP requests)
import { config } from 'dotenv';
import twilioPackage from 'twilio';
const { Twilio } = twilioPackage;
import { Resend } from 'resend';
import { getCurrentNotificationSettings, isNotificationEnabled } from './manage-notification-settings.js';

// Load environment variables
config();

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

// Resend configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@chasersdd.com';

// Initialize services
const twilio = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)
  ? new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Interfaces
interface NotificationCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface NotificationTransaction {
  id: string;
  amount: number;
  planName: string;
  planId: string;
}

interface NotificationPlan {
  name: string;
  price: string;
  smsMessage: string;
  tripFee: number;
}

interface EmailNotificationData {
  type: 'transaction_confirmation' | 'welcome' | 'marketing';
  customer: NotificationCustomer;
  transaction?: NotificationTransaction;
  marketingConsent?: boolean;
}

interface SMSNotificationData {
  type: 'transaction_confirmation' | 'welcome' | 'marketing';
  customer: NotificationCustomer;
  transaction?: NotificationTransaction;
  plan?: NotificationPlan;
  marketingConsent?: boolean;
}

interface NotificationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  skipped?: boolean;
}

// Direct SMS notification function
export async function sendSMSNotificationDirect(data: SMSNotificationData): Promise<NotificationResult> {
  try {
    // Check if SMS notifications are enabled
    if (!isNotificationEnabled('sms')) {
      return {
        success: true,
        message: 'SMS notifications are disabled',
        skipped: true
      };
    }

    // Check if Twilio is configured
    if (!twilio || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || (!TWILIO_PHONE_NUMBER && !TWILIO_MESSAGING_SERVICE_SID)) {
      console.error('Twilio credentials not fully configured');
      return {
        success: false,
        error: 'SMS service not configured'
      };
    }

    // Validate required fields
    if (!data.customer?.phone || !data.type) {
      return {
        success: false,
        error: 'Customer phone and notification type are required'
      };
    }

    // Validate and format phone number
    const phoneNumber = formatPhoneNumber(data.customer.phone);
    if (!phoneNumber) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    let messageContent: string;

    // Generate SMS content based on type
    switch (data.type) {
      case 'transaction_confirmation':
        if (!data.transaction) {
          return {
            success: false,
            error: 'Transaction data required for confirmation SMS'
          };
        }
        messageContent = generateTransactionConfirmationSMS(data);
        break;

      case 'welcome':
        messageContent = generateWelcomeSMS(data);
        break;

      case 'marketing':
        if (!isNotificationEnabled('marketing_sms')) {
          return {
            success: true,
            message: 'Marketing SMS are disabled',
            skipped: true
          };
        }
        if (!data.marketingConsent) {
          return {
            success: true,
            message: 'Marketing SMS skipped - no consent',
            skipped: true
          };
        }
        messageContent = generateMarketingSMS(data);
        break;

      default:
        return {
          success: false,
          error: 'Invalid notification type'
        };
    }

    // Send SMS via Twilio
    const messageOptions: any = {
      body: messageContent,
      to: phoneNumber
    };

    if (TWILIO_MESSAGING_SERVICE_SID) {
      messageOptions.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else if (TWILIO_PHONE_NUMBER) {
      messageOptions.from = TWILIO_PHONE_NUMBER;
    }

    const message = await twilio.messages.create(messageOptions);

    console.log('SMS sent successfully:', {
      messageSid: message.sid,
      recipient: phoneNumber,
      type: data.type,
      status: message.status
    });

    return {
      success: true,
      message: 'SMS notification sent successfully',
      data: { messageSid: message.sid }
    };

  } catch (error: any) {
    console.error('SMS notification error:', error);
    return {
      success: false,
      error: 'Failed to send SMS notification'
    };
  }
}

// Direct email notification function
export async function sendEmailNotificationDirect(data: EmailNotificationData): Promise<NotificationResult> {
  try {
    // Check if email notifications are enabled
    if (!isNotificationEnabled('email')) {
      return {
        success: true,
        message: 'Email notifications are disabled',
        skipped: true
      };
    }

    // Check if Resend is configured
    if (!resend || !RESEND_API_KEY) {
      console.error('Resend API key not configured');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    // Validate required fields
    if (!data.customer?.email || !data.type) {
      return {
        success: false,
        error: 'Customer email and notification type are required'
      };
    }

    let emailContent: string;
    let subject: string;

    // Generate email content based on type
    switch (data.type) {
      case 'transaction_confirmation':
        if (!data.transaction) {
          return {
            success: false,
            error: 'Transaction data required for confirmation email'
          };
        }
        subject = `Payment Confirmation - ${data.transaction.planName} Membership`;
        emailContent = generateTransactionConfirmationEmail(data);
        break;

      case 'welcome':
        subject = 'Welcome to Chasers DD - Your Membership is Active';
        emailContent = generateWelcomeEmail(data);
        break;

      case 'marketing':
        if (!isNotificationEnabled('marketing_email')) {
          return {
            success: true,
            message: 'Marketing emails are disabled',
            skipped: true
          };
        }
        if (!data.marketingConsent) {
          return {
            success: true,
            message: 'Marketing email skipped - no consent',
            skipped: true
          };
        }
        subject = 'Thank you for joining Chasers DD';
        emailContent = generateMarketingEmail(data);
        break;

      default:
        return {
          success: false,
          error: 'Invalid notification type'
        };
    }

    // Send email via Resend
    const { data: emailData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.customer.email],
      subject: subject,
      html: emailContent,
    });

    if (error) {
      console.error('Resend email error:', error);
      return {
        success: false,
        error: 'Failed to send email notification'
      };
    }

    console.log('Email sent successfully:', {
      emailId: emailData?.id,
      recipient: data.customer.email,
      type: data.type
    });

    return {
      success: true,
      message: 'Email notification sent successfully',
      data: { emailId: emailData?.id }
    };

  } catch (error: any) {
    console.error('Email notification error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

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
  const { customer, transaction, plan } = data;

  const planName = plan?.name || transaction?.planName || 'membership';
  const amount = (transaction?.amount || 0).toFixed(2);

  return `Hi ${customer.firstName}! Your Chasers DD ${planName} payment ($${amount}) has been confirmed. Transaction ID: ${transaction?.id}. Call (480) 695-3659 for rides 3PM-3AM daily. Welcome to the family!`;
}

function generateWelcomeSMS(data: SMSNotificationData): string {
  const { customer, plan } = data;

  // Use centralized plan-specific SMS message if available
  if (plan?.smsMessage) {
    return plan.smsMessage;
  }

  // Fallback to generic message
  return `Welcome to Chasers DD, ${customer.firstName}! Your membership is active. We drive you home in YOUR car 3PM-3AM daily. Call (480) 695-3659 when you need a safe ride. Thanks for choosing us!`;
}

function generateMarketingSMS(data: SMSNotificationData): string {
  const { customer } = data;

  return `Hi ${customer.firstName}! Thanks for joining Chasers DD. As a member, you get priority booking & special rates. We're Phoenix's trusted designated driver service - your car, our driving. Call (480) 695-3659 or text STOP to opt out.`;
}

// Email template functions
function generateTransactionConfirmationEmail(data: EmailNotificationData): string {
  const { customer, transaction } = data;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #C8860D, #F4C430); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #666; }
          .btn { display: inline-block; background: #C8860D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .transaction-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed!</h1>
            <p>Your ${transaction?.planName} membership is now active</p>
          </div>
          <div class="content">
            <h2>Hello ${customer.firstName},</h2>
            <p>Thank you for your payment! Your Chasers DD membership has been successfully activated.</p>

            <div class="transaction-details">
              <h3>Transaction Details</h3>
              <p><strong>Transaction ID:</strong> ${transaction?.id}</p>
              <p><strong>Plan:</strong> ${transaction?.planName}</p>
              <p><strong>Amount:</strong> $${(transaction?.amount || 0).toFixed(2)}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <p>Your membership includes:</p>
            <ul>
              <li>Professional designated driver service</li>
              <li>We drive you home in YOUR vehicle</li>
              <li>Available 3PM - 3AM daily</li>
              <li>Coverage throughout Greater Phoenix Area</li>
              <li>Professional, discreet service</li>
            </ul>

            <p>To request a ride, call us at <strong>(480) 695-3659</strong>.</p>

            <p>If you have any questions, please don't hesitate to contact us at rocky@chasersdd.com or (480) 695-3659.</p>
          </div>
          <div class="footer">
            <p>Chasers DD - Your Professional Designated Driver Service</p>
            <p>Phoenix, Arizona | (480) 695-3659 | rocky@chasersdd.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateWelcomeEmail(data: EmailNotificationData): string {
  const { customer } = data;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Chasers DD</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #C8860D, #F4C430); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #666; }
          .btn { display: inline-block; background: #C8860D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Chasers DD!</h1>
            <p>Your membership is now active</p>
          </div>
          <div class="content">
            <h2>Hello ${customer.firstName},</h2>
            <p>Welcome to the Chasers DD family! We're excited to be your trusted designated driver service.</p>

            <h3>How It Works:</h3>
            <ol>
              <li><strong>Call us:</strong> (480) 695-3659 when you need a ride</li>
              <li><strong>We come to you:</strong> Professional driver arrives in an unmarked vehicle</li>
              <li><strong>Drive your car:</strong> We drive you home in YOUR vehicle</li>
              <li><strong>Safe arrival:</strong> You and your car arrive home safely</li>
            </ol>

            <h3>Service Hours:</h3>
            <p><strong>3PM - 3AM Daily</strong><br>
            Holiday Hours (Christmas, Easter, Thanksgiving): 5PM - 12AM</p>

            <h3>Coverage Area:</h3>
            <p>Greater Phoenix Area - we know the roads and the best routes to get you home safely.</p>

            <p>Questions? Contact us anytime at rocky@chasersdd.com or (480) 695-3659.</p>

            <p>Thank you for choosing Chasers DD. Drive safe!</p>
          </div>
          <div class="footer">
            <p>Chasers DD - Your Professional Designated Driver Service</p>
            <p>Phoenix, Arizona | (480) 695-3659 | rocky@chasersdd.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateMarketingEmail(data: EmailNotificationData): string {
  const { customer } = data;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Joining Chasers DD</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #C8860D, #F4C430); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #666; }
          .btn { display: inline-block; background: #C8860D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Joining!</h1>
            <p>You're now part of the Chasers DD community</p>
          </div>
          <div class="content">
            <h2>Hi ${customer.firstName},</h2>
            <p>Thank you for choosing Chasers DD as your designated driver service! You've made a smart choice for your safety and the safety of others on the road.</p>

            <h3>Why Our Members Love Us:</h3>
            <ul>
              <li><strong>Your Car Stays With You:</strong> Unlike ride-sharing, you don't have to worry about retrieving your vehicle the next day</li>
              <li><strong>Professional Service:</strong> Owner-operated business with experienced, professional drivers</li>
              <li><strong>Discreet Transportation:</strong> Unmarked vehicles ensure your privacy</li>
              <li><strong>Local Expertise:</strong> We know Phoenix and the best routes to get you home safely</li>
              <li><strong>Reliable Service:</strong> Quick response times when you need us most</li>
            </ul>

            <p>As a member, you'll also receive:</p>
            <ul>
              <li>Priority booking during busy periods</li>
              <li>Special member rates and promotions</li>
              <li>Updates on service enhancements</li>
              <li>Safety tips and local traffic updates</li>
            </ul>

            <p>Remember, we're available <strong>3PM - 3AM daily</strong> at <strong>(480) 695-3659</strong>.</p>

            <p>Thank you for helping us keep Phoenix roads safe!</p>
          </div>
          <div class="footer">
            <p>Chasers DD - Your Professional Designated Driver Service</p>
            <p>Phoenix, Arizona | (480) 695-3659 | rocky@chasersdd.com</p>
            <p><a href="https://chasersdd.com/unsubscribe">Unsubscribe from marketing emails</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}