# Quick Setup Guide for Admin Panel

## What Was Built

✅ Git-backed pricing management system
✅ `/admin` page with password-protected login
✅ Pricing editor that commits directly to GitHub
✅ Automatic site rebuild on Netlify after pricing changes

## Next Steps to Make It Live

### 1. Create GitHub Personal Access Token (5 minutes)

1. Go to: https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Fill in:
   - **Token name**: `Chasers DD Admin Panel`
   - **Expiration**: 1 year (or custom)
   - **Repository access**: Only select repositories → `chasers-designated-drivers`
   - **Repository permissions**:
     - Contents: **Read and write** ✓
4. Click "Generate token"
5. **Copy the token** (starts with `github_pat_` or `ghp_`)

### 2. Generate Secure Secrets (2 minutes)

Run these commands in your terminal to generate cryptographically secure secrets:

```bash
# Generate admin password (copy the output)
openssl rand -base64 32

# Generate JWT secret (copy the output)
openssl rand -base64 64
```

Save these outputs - you'll need them in the next step!

### 3. Add Environment Variables to Netlify (3 minutes)

1. Go to: https://app.netlify.com/sites/[your-site]/settings/env
2. Add these 4 variables:

```
ADMIN_PASSWORD = [paste the password from step 2]
JWT_SECRET = [paste the JWT secret from step 2]
GITHUB_TOKEN = [paste the token from step 1]
GITHUB_BRANCH = main
```

**IMPORTANT:** Use the generated secrets from step 2, not simple passwords!

**Optional (already defaults):**
```
GITHUB_OWNER = travisdbates
GITHUB_REPO = chasers-designated-drivers
```

3. Click "Save"
4. **Trigger a redeploy** (Deploys → Trigger deploy → Deploy site)

### 4. Test It Out

1. Visit `https://chasersdd.com/admin`
2. Enter the password you set in `ADMIN_PASSWORD`
3. You should see the pricing editor!
4. Try changing a price and clicking "Save"
5. Check GitHub - you should see a new commit: "Update pricing via admin panel"
6. Wait ~1-2 minutes - Netlify will rebuild and the new price will be live

## Security Notes

✅ Password is stored as environment variable (not in code)
✅ Login uses JWT with httpOnly cookies (can't be stolen by JavaScript)
✅ Token expires after 8 hours
✅ GitHub token only has access to this one repo
✅ All API routes verify authentication

## How Rocky Uses It

1. Go to `chasersdd.com/admin`
2. Log in with password
3. Edit prices
4. Click save
5. Wait 1-2 minutes for site to rebuild
6. Done!

## Files Created

- `pricing-overrides.json` - Pricing data (committed to git)
- `src/pages/admin.astro` - Admin UI
- `src/pages/api/admin/login.ts` - Login endpoint
- `src/pages/api/admin/logout.ts` - Logout endpoint
- `src/pages/api/admin/get-pricing.ts` - Fetch pricing
- `src/pages/api/admin/update-pricing.ts` - Update & commit pricing
- `src/pages/api/admin/auth-utils.ts` - Auth helpers
- `src/config/plans.ts` - Updated to read from pricing-overrides.json

## Need Help?

If you get stuck:
1. Check Netlify deploy logs for errors
2. Verify all environment variables are set
3. Make sure GitHub token has "Contents: Read and write" permission
4. Ensure you triggered a redeploy after adding env variables
