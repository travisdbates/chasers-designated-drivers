# Payment Integration Setup Guide

This guide covers the AcceptBlue payment processing integration for Chasers DD membership subscriptions.

## Overview

The payment system is built with:
- **AcceptBlue** for payment processing via Micamp Solutions
- **Hosted Tokenization Fields** for PCI compliance
- **Reusable Components** for consistent checkout experience
- **Server-side Processing** for secure transaction handling

## Getting Started

### 1. AcceptBlue Credentials

Contact Micamp Solutions at [micampblue.com](https://micampblue.com) to obtain:
- API Key
- PIN
- Tokenization Key

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your AcceptBlue credentials:

```bash
cp .env.example .env
```

Required environment variables:
```env
ACCEPTBLUE_API_KEY=your_api_key_here
ACCEPTBLUE_PIN=your_pin_here
ACCEPTBLUE_TOKENIZATION_KEY=your_tokenization_key_here
ACCEPTBLUE_ENVIRONMENT=sandbox  # or 'production'
```

### 3. Update PaymentForm Component

In `src/components/PaymentForm.astro`, replace the placeholder tokenization key:

```javascript
// Line 225
const TOKENIZATION_KEY = process.env.ACCEPTBLUE_TOKENIZATION_KEY || 'your_tokenization_key_here';
```

## Architecture

### Components

1. **PaymentForm.astro**
   - Handles customer information collection
   - Integrates AcceptBlue hosted payment fields
   - Performs client-side tokenization
   - Validates form data before submission

2. **MembershipCheckout.astro**
   - Displays plan details and pricing
   - Integrates payment form
   - Handles payment processing flow
   - Shows success/error states

3. **checkout.astro**
   - Main checkout page
   - Handles URL parameters for plan selection
   - Routes to appropriate checkout flow

### API Endpoints

1. **`/api/process-payment.ts`**
   - Processes payment transactions
   - Handles AcceptBlue API communication
   - Validates payment data
   - Returns transaction results

### Payment Flow

1. **Customer selects plan** → Navigation cards or membership page
2. **Redirected to checkout** → `/checkout?plan=individual`
3. **Form completion** → Customer fills payment form
4. **Client-side tokenization** → AcceptBlue creates secure token
5. **Server processing** → API endpoint processes payment
6. **Transaction result** → Success/failure feedback

## AcceptBlue Integration Details

### Hosted Fields Initialization

```javascript
acceptBlueFields = Accept.hostedFields({
  environment: 'sandbox', // or 'production'
  tokenizationKey: TOKENIZATION_KEY,
  fields: {
    cardNumber: { selector: '#card-number-container' },
    expirationDate: { selector: '#card-expiry-container' },
    cvv: { selector: '#card-cvv-container' }
  }
});
```

### Transaction Processing

```javascript
const transactionRequest = {
  source: paymentToken, // From hosted fields
  amount: planAmount * 100, // In cents
  customer: customerData,
  metadata: { plan_id, subscription_type: 'monthly' }
};
```

## Security Features

- **PCI Compliance**: Hosted payment fields handle sensitive data
- **Tokenization**: Card data never touches your servers
- **SSL Encryption**: All communication encrypted
- **Input Validation**: Client and server-side validation
- **Error Handling**: Secure error messages

## Testing

### Sandbox Mode
- Set `ACCEPTBLUE_ENVIRONMENT=sandbox`
- Use AcceptBlue test card numbers
- Test all membership plans
- Verify error handling

### Production Checklist
- [ ] Update environment to `production`
- [ ] Update API keys to production values
- [ ] Test with real card (small amount)
- [ ] Verify webhook endpoints (if implemented)
- [ ] Monitor transaction logs

## Membership Plans

| Plan | Monthly Price | Description |
|------|---------------|-------------|
| Individual | $89 | Single person membership |
| Joint | $149 | Two person membership |
| Family | $249 | Up to 6 members |
| Corporate | $399 | Multi-employee coverage |
| Business | Custom | Partner program |

## Error Handling

Common error scenarios handled:
- Invalid payment information
- Declined transactions
- Network connectivity issues
- API rate limiting
- Missing required fields

## Monitoring & Logging

Transaction data logged includes:
- Customer information
- Plan selection
- Payment status
- Error details
- Processing time

## Support

For payment integration issues:
1. Check AcceptBlue dashboard for transaction details
2. Review server logs for API errors
3. Contact Micamp Solutions support
4. Reference AcceptBlue API documentation

## Next Steps

After basic integration:
- [ ] Implement recurring billing
- [ ] Add webhook handling for payment notifications
- [ ] Set up customer dashboard
- [ ] Implement subscription management
- [ ] Add email notifications
- [ ] Database integration for customer records

## Development Notes

The integration includes fallback placeholder fields for development when AcceptBlue SDK is not available. This allows for UI development and testing without requiring immediate payment gateway setup.