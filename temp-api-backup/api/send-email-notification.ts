import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getCurrentNotificationSettings, isNotificationEnabled } from './manage-notification-settings.js';


// Resend configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@chasersdd.com';

// Initialize Resend
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface EmailNotificationData {
  type: 'transaction_confirmation' | 'welcome' | 'marketing';
  customer: {
    firstName: string;
    lastName: string;
    email: string;
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
    // Check if email notifications are enabled
    if (!isNotificationEnabled('email')) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email notifications are disabled',
          skipped: true 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if Resend is configured
    if (!resend || !RESEND_API_KEY) {
      console.error('Resend API key not configured:', {
        hasResend: !!resend,
        hasApiKey: !!RESEND_API_KEY,
        apiKeyPreview: RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 8)}...` : 'undefined',
        allResendEnvVars: Object.keys(process.env).filter(k => k.includes('RESEND')),
        allEnvVars: Object.keys(process.env).length,
        directRead: {
          RESEND_API_KEY: process.env.RESEND_API_KEY,
          NODE_ENV: process.env.NODE_ENV,
          ASTRO_ENV: process.env.ASTRO_ENV
        }
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const notificationData: EmailNotificationData = await request.json();

    // Validate required fields
    if (!notificationData.customer?.email || !notificationData.type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Customer email and notification type are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let emailContent;
    let subject;

    // Generate email content based on type
    switch (notificationData.type) {
      case 'transaction_confirmation':
        if (!notificationData.transaction) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Transaction data required for confirmation email' 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        subject = `Payment Confirmation - ${notificationData.transaction.planName} Membership`;
        emailContent = generateTransactionConfirmationEmail(notificationData);
        break;

      case 'welcome':
        subject = 'Welcome to Chasers DD - Your Membership is Active';
        emailContent = generateWelcomeEmail(notificationData);
        break;

      case 'marketing':
        if (!isNotificationEnabled('marketing_email')) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Marketing emails are disabled',
              skipped: true 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (!notificationData.marketingConsent) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Marketing email skipped - no consent',
              skipped: true 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        subject = 'Thank you for joining Chasers DD';
        emailContent = generateMarketingEmail(notificationData);
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

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [notificationData.customer.email],
      subject: subject,
      html: emailContent,
    });

    if (error) {
      console.error('Resend email error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send email notification' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', {
      emailId: data?.id,
      recipient: notificationData.customer.email,
      type: notificationData.type
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification sent successfully',
        emailId: data?.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email notification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

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
            
            <p>To request a ride, call us at <strong>(480) 695-3659</strong> or use our member portal.</p>
            
            <a href="https://chasersdd.com/dashboard" class="btn">Access Member Dashboard</a>
            
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
            
            <a href="https://chasersdd.com/dashboard" class="btn">Access Your Dashboard</a>
            
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
            
            <a href="https://chasersdd.com/member-benefits" class="btn">Explore Member Benefits</a>
            
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