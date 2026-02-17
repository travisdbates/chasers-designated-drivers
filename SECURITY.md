# Security Documentation - Admin Panel

## 🛡️ Implemented Security Measures

### 1. **Brute Force Protection** ✅

**Rate Limiting:**
- Maximum **5 failed login attempts** per IP address
- Tracked within a **1-hour rolling window**
- After 5 failed attempts: **15-minute lockout**
- Automatic cleanup of old attempt records

**Implementation:**
- IP-based tracking (uses `x-forwarded-for`, `x-real-ip`, or `cf-connecting-ip` headers)
- In-memory storage (resets on serverless cold start - acceptable for basic protection)
- Failed attempts are logged to console for monitoring
- Client-side countdown timer shows lockout duration

**Limitations:**
- In-memory storage means cold starts reset the counter
- Shared IPs (corporate networks, VPNs) share the same limit
- Advanced attackers can rotate IPs to bypass

### 2. **Authentication Security** ✅

**JWT Implementation:**
- Tokens stored in **httpOnly cookies** (JavaScript cannot access)
- **Secure flag** (HTTPS only)
- **SameSite=Strict** (CSRF protection)
- **8-hour expiration** (auto-logout)
- Tokens signed with JWT_SECRET

**Password Storage:**
- Admin password stored in **environment variable** (not in code)
- Never exposed to client
- Should be cryptographically strong (20+ characters, mixed case, numbers, symbols)

### 3. **Authorization** ✅

**Protected Endpoints:**
- All `/api/admin/*` routes verify JWT token
- Unauthorized requests return `401 Unauthorized`
- No sensitive data exposed without valid token

### 4. **GitHub Token Security** ✅

**Scoped Permissions:**
- Fine-grained personal access token
- **Repository-scoped** (only this repo)
- **Contents: Read/Write** only (minimal permissions)
- Stored in environment variable
- Never exposed to client

### 5. **Logging & Monitoring** ✅

**What's Logged:**
- Failed login attempts (with IP address)
- Rate limit violations
- Successful logins
- GitHub API errors

**View Logs:**
- Netlify Functions logs: `Netlify Dashboard → Functions → View logs`
- Look for suspicious patterns (many failed attempts from same IP)

## ⚠️ Known Limitations & Considerations

### 1. **In-Memory Rate Limiting**

**Current State:**
- Rate limit data stored in memory
- Resets on serverless function cold start (~every 15-30 minutes of inactivity)

**Implication:**
- Attacker could wait for cold start to reset attempts
- Still provides basic protection against naive brute force

**Upgrade Path (if needed):**
- Use Redis (Upstash Redis - free tier available)
- Use Netlify Blobs or KV storage
- Use a dedicated rate limiting service (Arcjet, Unkey)

### 2. **IP-Based Tracking**

**Limitations:**
- Corporate networks/VPNs share IPs (legitimate users may be blocked)
- Attackers can rotate IPs to bypass
- IPv6 can have multiple IPs per user

**Mitigations:**
- 15-minute lockout is short enough to not severely impact legitimate users
- Cookie-based tracking could be added as secondary check

### 3. **Single Admin User**

**Current Design:**
- One password for all admin access
- No user accounts or email-based auth
- No password reset flow

**Considerations:**
- Fine for single user (Rocky)
- If you need multiple admins, consider:
  - Auth0, Clerk, or NextAuth
  - Email/password auth with password reset
  - Multi-factor authentication

### 4. **Public Admin Endpoint**

**Current State:**
- `/admin` is publicly discoverable
- No obscurity (not hidden at a secret URL)

**Why This Is OK:**
- Security through obscurity is not real security
- Strong password + rate limiting is sufficient
- Changing URL doesn't meaningfully improve security

**Optional Enhancements:**
- Add CAPTCHA (hCaptcha, reCAPTCHA)
- Require email verification
- Use OAuth (Google, GitHub login)

### 5. **GitHub Token Exposure Risk**

**What If Token Leaks:**
- Attacker could commit malicious code
- Limited to this repo only (scoped token)
- Can't access other repos or account settings

**Mitigation:**
- Use fine-grained token (not classic PAT)
- Set expiration date (1 year max)
- Rotate token periodically
- Monitor repo for unexpected commits

**Best Practice:**
- Create a dedicated GitHub bot account
- Give it minimal permissions
- Easier to revoke if compromised

## 🔒 Recommended Security Best Practices

### 1. **Strong Credentials**

**ADMIN_PASSWORD:**
```bash
# BAD
ADMIN_PASSWORD=password123

# GOOD
ADMIN_PASSWORD=Xk9$mP2@vL5#nQ8!wR3^jT7&hY4*bN6
```

Generate strong password:
```bash
openssl rand -base64 32
```

**JWT_SECRET:**
```bash
# Generate a cryptographically secure secret
openssl rand -base64 64
```

### 2. **Monitor Netlify Logs**

Check weekly for:
- Unusual number of failed login attempts
- Logins from unexpected IP addresses
- Multiple rate limit violations

**Set up alerts (optional):**
- Use Netlify Build Hooks + monitoring service
- Log aggregation (Datadog, Sentry, LogDNA)

### 3. **Rotate GitHub Token Annually**

1. Create new fine-grained token
2. Update `GITHUB_TOKEN` in Netlify
3. Revoke old token in GitHub
4. Test admin panel still works

### 4. **Audit Commits**

Periodically check GitHub commit history:
- Look for unexpected "Update pricing via admin panel" commits
- Verify commit timestamps match when Rocky made changes
- Check if pricing changes are legitimate

### 5. **Backup Pricing Data**

```bash
# Manually back up pricing before major changes
cp pricing-overrides.json pricing-overrides.backup.json
git add pricing-overrides.backup.json
git commit -m "Backup pricing before update"
```

## 🚨 Incident Response

### If You Suspect Unauthorized Access:

1. **Immediately:**
   - Change `ADMIN_PASSWORD` in Netlify
   - Redeploy site
   - Revoke GitHub token and create new one

2. **Investigate:**
   - Check Netlify function logs for unauthorized logins
   - Review GitHub commit history for unauthorized changes
   - Check if pricing was modified maliciously

3. **Restore (if needed):**
   ```bash
   # Revert pricing to previous version
   git revert <commit-hash>
   git push
   ```

4. **Prevent Future Issues:**
   - Review how credentials may have leaked
   - Consider adding CAPTCHA
   - Enable GitHub notification for pushes
   - Use stronger password

## 📊 Security Comparison

| Security Measure | Current Implementation | Enterprise Alternative |
|-----------------|------------------------|------------------------|
| **Brute Force** | ✅ IP-based rate limiting (in-memory) | Redis-based rate limiting |
| **Authentication** | ✅ JWT + httpOnly cookies | OAuth2 + MFA |
| **User Management** | ✅ Single password | Multi-user with roles |
| **Monitoring** | ✅ Console logs | Datadog, Sentry, alerts |
| **Rate Limit Storage** | ⚠️ In-memory (resets) | Redis, KV store |
| **Password Reset** | ❌ Manual (env var) | Email-based reset flow |
| **Audit Logs** | ⚠️ Function logs only | Dedicated audit log DB |
| **CAPTCHA** | ❌ None | hCaptcha, reCAPTCHA |

## ✅ Conclusion

**For a single-admin use case (Rocky), the current security is sufficient:**

✅ Strong password protection
✅ Rate limiting prevents brute force
✅ JWT tokens prevent session hijacking
✅ Scoped GitHub token limits damage
✅ All changes are tracked in git history

**This is appropriate for:**
- Single admin user
- Low-value target (pricing data, not financial info)
- Changes are auditable (git history)
- Downtime risk is low (can revert via git)

**Consider upgrading to enterprise auth if:**
- Multiple admin users needed
- Handling sensitive PII or financial data
- Compliance requirements (SOC2, HIPAA, etc.)
- High-value target (likely to be attacked)
