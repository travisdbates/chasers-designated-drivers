# Chat Widget Setup Instructions

## Tidio Chat Widget Integration

The chat widget has been integrated into the BaseLayout and is ready for activation. Follow these steps to complete the setup:

### 1. Get Your Tidio Account
1. Sign up at [tidio.com](https://tidio.com)
2. Create a new project for "Chasers DD"
3. Navigate to Settings > Developer in your Tidio dashboard
4. Copy your Public Key

### 2. Update the Integration
Replace `YOUR_PUBLIC_KEY` in `/src/layouts/BaseLayout.astro` line 179:
```html
<script src="//code.tidio.co/YOUR_ACTUAL_PUBLIC_KEY.js" async></script>
```

### 3. Customize Chat Settings in Tidio Dashboard

#### Chat Appearance
- **Widget Color**: Set to #c69214 (gold) to match brand
- **Widget Position**: Bottom right (already configured in CSS)
- **Widget Style**: Round button (already configured in CSS)

#### Welcome Message
Set up a professional greeting:
```
Welcome to Chasers DD! 🏆

We're Arizona's premier luxury designated driver service. How can we assist you with your transportation needs today?

• Membership inquiries
• Service bookings  
• General questions

Our team is here to help 24/7!
```

#### Auto-responses
Configure these automated responses:

**"membership" trigger:**
"Great! We offer 4 premium membership tiers:
• Individual Premiere
• Joint Premiere  
• Friends & Family Premiere
• Corporate Premiere

Would you like to learn more about a specific plan? You can also view details at /membership"

**"booking" trigger:**
"We'd be happy to help with your booking! As a premium service, we provide:
• 24/7 availability
• Professional licensed drivers
• Luxury vehicle fleet
• Full insurance coverage

Are you an existing member or interested in joining?"

**"pricing" trigger:**
"Our membership-based pricing offers excellent value and predictability. Pricing varies by membership tier and service level. Would you like to speak with someone about a quote tailored to your needs?"

#### Operating Hours
- Set to 24/7 to match your service availability
- Configure auto-responses for after-hours if needed

#### Team Settings
- Add team member photos and bios
- Set professional titles (Customer Service, Membership Specialist, etc.)
- Configure routing rules for different inquiry types

### 4. Custom Styling Applied

The integration includes custom CSS that:
- Matches your gold (#c69214) brand colors
- Uses luxury dark theme for chat window
- Positions widget professionally 
- Adds subtle gold glow effect
- Integrates seamlessly with existing design

### 5. Advanced Configuration Options

#### Visitor Tracking
The widget automatically tracks:
- Page visited when chat initiated
- Source marking as "Website - Chasers DD"
- User journey through site

#### Integration with Forms
Consider connecting Tidio with:
- Your contact form on /contact
- Membership inquiry workflows
- Booking request processes

### 6. Alternative: Intercom Setup

If you prefer Intercom instead of Tidio:

1. Replace the Tidio script with:
```html
<script>
  window.intercomSettings = {
    api_base: "https://widget.intercom.io",
    app_id: "YOUR_INTERCOM_APP_ID",
    custom_launcher_selector: '.intercom-launcher'
  };
</script>
<script>(function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/YOUR_INTERCOM_APP_ID';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();</script>
```

2. Update the CSS selectors from `.tidio-` to `.intercom-`

### 7. Testing Checklist

Before going live, test:
- [ ] Chat widget appears on all pages
- [ ] Widget matches brand styling (gold colors)
- [ ] Welcome message displays correctly
- [ ] Auto-responses work for key triggers
- [ ] Chat window opens properly on mobile
- [ ] Team routing works correctly
- [ ] Visitor data tracking functions

### 8. Analytics Integration

Consider connecting your chat data with:
- Google Analytics events for chat interactions
- Conversion tracking for membership inquiries
- Lead scoring based on chat engagement

---

## Next Steps

1. Replace `YOUR_PUBLIC_KEY` with actual Tidio key
2. Configure welcome messages and auto-responses
3. Set up team members and routing
4. Test thoroughly across devices
5. Monitor chat performance and optimize

The chat widget will be live on all pages once you activate it with your Tidio public key!