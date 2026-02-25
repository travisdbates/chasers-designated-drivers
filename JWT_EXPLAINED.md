# JWT_SECRET Explained

## What is JWT_SECRET?

**JWT** = **J**SON **W**eb **T**oken

**JWT_SECRET** is the cryptographic key used to sign and verify authentication tokens.

## How Admin Authentication Works

### Step 1: Login
```
Rocky visits /admin
  ↓
Enters password
  ↓
Server checks: password === ADMIN_PASSWORD?
  ✅ Match!
  ↓
Server creates a JWT token containing:
  {
    "admin": true,
    "timestamp": 1234567890,
    "exp": 1234596690  // expires in 8 hours
  }
  ↓
Server signs the token with JWT_SECRET
  ↓
Token stored in httpOnly cookie
  ↓
Rocky is logged in!
```

### Step 2: Making Admin Requests
```
Rocky clicks "Save Pricing"
  ↓
Browser sends request with cookie
  ↓
Server extracts JWT from cookie
  ↓
Server verifies JWT using JWT_SECRET
  ✅ Valid signature!
  ✅ Not expired!
  ✅ Has admin: true!
  ↓
Allow the request
  ↓
Pricing updated!
```

## Why We Need Both Secrets

| Secret | Purpose | When Used |
|--------|---------|-----------|
| **ADMIN_PASSWORD** | Proves you're Rocky | At login |
| **JWT_SECRET** | Proves subsequent requests are from the same authenticated session | Every admin API call |

## Real-World Analogy

Think of going to a concert:

1. **ADMIN_PASSWORD** = Your ticket at the entrance
   - Shows ID, they check your ticket
   - You prove you're allowed in

2. **JWT_SECRET** = The wristband they give you
   - No need to show ID again
   - Flash your wristband to buy drinks, go backstage, etc.
   - If someone tries to fake a wristband, security knows (wrong signature)

## What Happens If JWT_SECRET Leaks?

**Without JWT_SECRET, attackers cannot:**
- Create valid tokens (even if they steal a cookie)
- Forge admin sessions
- Bypass authentication

**But if JWT_SECRET leaks, attackers could:**
- Create their own valid tokens
- Bypass the password check entirely
- Gain admin access

**Solution if compromised:**
1. Change JWT_SECRET in Netlify env variables
2. Redeploy the site
3. All existing sessions invalidate immediately
4. Rocky has to log in again (but that's it!)

## Security Properties

### httpOnly Cookie
- JavaScript **cannot** read the token
- Protects against XSS attacks
- Even if your site has a vulnerability, the token is safe

### Secure Flag
- Token only sent over HTTPS
- Can't be intercepted on unencrypted connections

### SameSite=Strict
- Token not sent with cross-site requests
- Protects against CSRF attacks

### 8-Hour Expiration
- Even if someone steals a token, it expires
- Forces re-authentication periodically

## Best Practices

### Generate Strong JWT_SECRET

```bash
# GOOD - Cryptographically secure random string
openssl rand -base64 64
# Output: xK9mP2vL5nQ8wR3jT7hY4bN6pS1fD0gH3zX8cV5mK2lQ9...

# BAD - Simple string
JWT_SECRET=mysecret123
```

### Never Commit to Git

```bash
# .gitignore should include:
.env
.env.local
```

### Rotate Periodically

- Change JWT_SECRET every 6-12 months
- Or if you suspect it was compromised
- All users must re-login (but that's fine for a single admin)

## Common Questions

### Q: Do I need different secrets for development and production?
**A:** Yes! Use different secrets for:
- Local development (.env)
- Production (Netlify environment variables)

### Q: What if I forget the JWT_SECRET?
**A:** Just generate a new one. All existing sessions will invalidate and Rocky has to log in again.

### Q: Can I use the same secret for multiple sites?
**A:** No! Each site should have its own unique JWT_SECRET.

### Q: How long should JWT_SECRET be?
**A:** At least 32 bytes (256 bits). The `openssl rand -base64 64` command generates a 512-bit key, which is excellent.

### Q: Do I need to remember JWT_SECRET?
**A:** No! It's stored in environment variables. You never need to type it manually.

## Summary

**ADMIN_PASSWORD:**
- What Rocky types to log in
- Should be memorable (but still strong)
- Used once per session

**JWT_SECRET:**
- Cryptographic signing key
- Never typed by humans
- Used for every authenticated request
- Proves "this session is legitimate"
