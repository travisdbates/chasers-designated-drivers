# Signup Notification System Setup

This document explains how to configure admin notifications for new signups (both member and driver).

## Environment Variables

Add the following environment variable to your `.env` file and Netlify environment settings:

```env
ON_SIGNUP_NOTIFICATION_EMAILS=admin@chasersdd.com,notifications@chasersdd.com
```

**Format**: Comma-separated list of email addresses that should receive signup notifications

**Where to add**:
1. **Local development**: Already added to `.env`
2. **Netlify production**:
   - Go to Netlify Dashboard > Your Site > Site settings > Environment variables
   - Add `ON_SIGNUP_NOTIFICATION_EMAILS` with your desired email addresses

## Member Signup Notifications

Member signup notifications are **automatically sent** when a customer completes payment. No additional setup required.

**Trigger**: When payment is successfully processed in `/api/process-payment`

**Notification includes**:
- Customer information (name, email, phone)
- Transaction details (ID, amount, plan)
- Billing address
- Marketing consent status
- Timestamp

## Driver Signup Notifications

Driver signup notifications require **Netlify webhook configuration** since driver applications use Netlify Forms.

### Setup Steps:

1. **Deploy your site** to Netlify (the function needs to be deployed first)

2. **Configure Netlify Form webhook**:
   - Go to Netlify Dashboard > Your Site > Forms
   - Find the "driver-signup" form
   - Click on "Form notifications"
   - Click "Add notification" > "Outgoing webhook"
   - Set webhook URL to: `https://your-site.netlify.app/.netlify/functions/driver-signup-notification`
   - Event to listen for: "New form submission"
   - Save the webhook

3. **Test the integration**:
   - Submit a test driver application on your site
   - Check Netlify Functions logs for execution
   - Verify admin notification email was received

**Notification includes**:
- Driver information (name, email, phone)
- Address
- Valid driver's license status
- Desired start date
- Days available to drive
- Additional information (if provided)
- Timestamp

## How It Works

### Member Signups
1. Customer completes payment form
2. Payment is processed via AcceptBlue API
3. Customer receives confirmation email/SMS
4. **Admin notification is automatically sent to ON_SIGNUP_NOTIFICATION_EMAILS**

### Driver Signups
1. Applicant submits driver application form
2. Netlify captures form submission
3. Netlify triggers webhook to `driver-signup-notification` function
4. **Function sends admin notification to ON_SIGNUP_NOTIFICATION_EMAILS**

## Email Template

Admin notifications use a professional template with:
- Clear badge showing signup type (MEMBER or DRIVER)
- Organized sections for all information
- Direct links for email and phone (mailto: and tel:)
- Next steps recommendations
- Mobile-responsive design

## Troubleshooting

### No notifications received

1. **Check environment variable**: Ensure `ON_SIGNUP_NOTIFICATION_EMAILS` is set in Netlify
2. **Check Resend API**: Verify `RESEND_API_KEY` and `FROM_EMAIL` are configured
3. **Check function logs**:
   - Netlify Dashboard > Functions > driver-signup-notification > Logs
   - Look for errors or "skipped" messages
4. **Check webhook**: Ensure webhook is properly configured for driver-signup form

### Member notifications work but driver notifications don't

- This indicates the Netlify webhook is not configured correctly
- Follow the "Driver Signup Notifications" setup steps above
- Check that the webhook URL matches your deployed site URL

### Notifications marked as "skipped"

- Check that `ON_SIGNUP_NOTIFICATION_EMAILS` contains valid email addresses
- Verify emails are comma-separated without spaces: `email1@domain.com,email2@domain.com`

## Disabling Notifications

To disable admin notifications:
- Remove or comment out `ON_SIGNUP_NOTIFICATION_EMAILS` from environment variables
- Notifications will be skipped gracefully without errors

## Testing Locally

Local testing of driver signup notifications requires:
1. Running Netlify Dev: `netlify dev`
2. Using a tool like ngrok to expose your local server
3. Configuring the webhook to point to your ngrok URL

For simpler local testing, you can manually call the notification function from your code.
