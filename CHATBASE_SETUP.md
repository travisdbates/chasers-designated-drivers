# Chatbase AI Chatbot Setup Guide

This guide explains how to configure and use the Chatbase AI chatbot on your site with identity verification.

## Prerequisites

1. **Chatbase Account**: Create a chatbot at [Chatbase.co](https://www.chatbase.co)
2. **Chatbot Created**: Have your chatbot trained and ready for embedding

## Configuration Steps

### 1. Get Your Credentials

From your Chatbase dashboard:

1. Navigate to **Deploy** → **Chat widget** → **Embed** tab
2. Copy your **Chatbot ID** (looks like: `abc123xyz`)
3. Copy your **Secret Key** (for identity verification)

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Chatbase Configuration
CHATBASE_CHATBOT_ID=your_chatbot_id_here
CHATBASE_SECRET_KEY=your_secret_key_here
PUBLIC_CHATBASE_CHATBOT_ID=your_chatbot_id_here
```

**Important**:
- Replace `your_chatbot_id_here` with your actual chatbot ID
- Replace `your_secret_key_here` with your secret key
- `PUBLIC_CHATBASE_CHATBOT_ID` is accessible in the browser (for the widget)
- `CHATBASE_SECRET_KEY` is server-side only (for JWT signing)

### 3. Deploy to Netlify

Add the same environment variables to your Netlify deployment:

1. Go to Netlify Dashboard → Your Site → **Site settings** → **Environment variables**
2. Add the three variables above
3. Redeploy your site

## How It Works

### Basic Setup (No Authentication)

The chatbot will automatically appear on all pages once configured. No additional code needed!

### With User Authentication (Identity Verification)

For logged-in users, you can identify them to the chatbot for personalized experiences:

```javascript
// After user logs in or signs up
window.identifyChatbaseUser({
  user_id: "user_12345",           // Required: Unique user identifier
  email: "user@example.com",       // Optional: User email
  name: "John Doe",                // Optional: User full name
  custom_attributes: {             // Optional: Custom data
    plan: "premium",
    signup_date: "2025-01-01"
  }
});
```

### Example: Identify User After Payment

```javascript
// In your payment success handler
async function handlePaymentSuccess(paymentData) {
  // ... payment processing ...

  // Identify user to chatbot
  await window.identifyChatbaseUser({
    user_id: paymentData.customer.email,
    email: paymentData.customer.email,
    name: `${paymentData.customer.firstName} ${paymentData.customer.lastName}`,
    custom_attributes: {
      plan: paymentData.planId,
      membership_active: true
    }
  });
}
```

### User Logout

When a user logs out, reset their chatbot session:

```javascript
// On user logout
window.resetChatbaseUser();
```

## Security

### JWT Token Generation

The system uses secure JWT tokens for identity verification:

1. **Client** requests identification with user data
2. **Backend API** (`/api/chatbase-token`) generates a signed JWT token
3. **Client** receives token and identifies user to chatbot
4. **Chatbase** validates the token signature

### Security Best Practices

✅ **DO**:
- Keep `CHATBASE_SECRET_KEY` private (server-side only)
- Use unique user IDs
- Include expiration times (default: 1 hour)
- Reset user session on logout

❌ **DON'T**:
- Expose secret key in client-side code
- Include sensitive data in custom attributes
- Skip token validation
- Hardcode user credentials

## API Endpoint

### POST `/api/chatbase-token`

Generates a JWT token for user identification.

**Request Body**:
```json
{
  "user_id": "user_12345",        // Required
  "email": "user@example.com",    // Optional
  "name": "John Doe",             // Optional
  "custom_attributes": {          // Optional
    "plan": "premium"
  }
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Features

### What You Can Do

- **Personalized Conversations**: Chatbot knows user's name and details
- **Context Aware**: Access user's plan, membership status, etc.
- **Persistent History**: Conversations linked to user account
- **Custom Data**: Add any custom attributes relevant to your business

### Use Cases

1. **Customer Support**: "What's my current plan?" → Bot can access user's plan info
2. **Personalized Help**: Greet returning users by name
3. **Account Management**: Help users with account-specific questions
4. **Sales**: Recommend upgrades based on current plan

## Troubleshooting

### Chatbot Not Appearing

1. Check `PUBLIC_CHATBASE_CHATBOT_ID` is set correctly
2. Verify chatbot ID matches your Chatbase dashboard
3. Check browser console for errors
4. Ensure you've redeployed after adding env variables

### Identity Verification Failing

1. Verify `CHATBASE_SECRET_KEY` matches Chatbase dashboard
2. Check `/api/chatbase-token` endpoint is accessible
3. Look for errors in server logs
4. Ensure `user_id` is provided when calling `identifyChatbaseUser()`

### Token Errors

```javascript
// Check if token generation succeeds
const response = await fetch('/api/chatbase-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: 'test_user' })
});

const result = await response.json();
console.log('Token result:', result);
```

## Advanced Configuration

### Custom Widget Styling

You can customize the chatbot appearance in your Chatbase dashboard:
- Navigate to **Deploy** → **Chat widget** → **Appearance**
- Customize colors, position, greeting message, etc.

### Custom Trigger

Hide the default widget and trigger it programmatically:

```javascript
// Show chatbot
window.chatbase('open');

// Hide chatbot
window.chatbase('close');
```

### Prefill Message

Start conversation with a specific message:

```javascript
window.chatbase('open', {
  message: 'I need help with my membership'
});
```

## Testing

### Test Without Authentication

1. Visit any page on your site
2. Chatbot widget should appear in bottom-right corner
3. Start a conversation

### Test With Authentication

1. Open browser console
2. Run:
```javascript
await window.identifyChatbaseUser({
  user_id: 'test_user_123',
  email: 'test@example.com',
  name: 'Test User'
});
```
3. Start a conversation
4. Check Chatbase dashboard to see user identified

## Support

- **Chatbase Documentation**: [docs.chatbase.co](https://docs.chatbase.co)
- **Identity Verification Guide**: [Chatbase Identity Verification](https://www.chatbase.co/docs/developer-guides/identity-verification)
- **API Reference**: Check `/api/chatbase-token` endpoint code for implementation details
