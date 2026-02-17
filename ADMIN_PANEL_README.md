# Admin Panel - Git-Backed Pricing Management

## Overview

This admin panel allows Rocky to update pricing for all membership plans directly from the website. Changes are automatically committed to GitHub and trigger a site rebuild on Netlify.

## How It Works

1. **Pricing Storage**: All pricing is stored in `pricing-overrides.json` at the root of the repo
2. **Admin Interface**: Rocky visits `/admin` on the website
3. **Authentication**: Simple password-based login (JWT stored in httpOnly cookie)
4. **Update Flow**: When Rocky saves changes:
   - The API calls GitHub's Contents API to update `pricing-overrides.json`
   - GitHub creates a new commit with message "Update pricing via admin panel"
   - Netlify detects the commit and rebuilds the site (~1-2 minutes)
   - New pricing goes live automatically

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Configure:
   - **Token name**: "Chasers DD Admin Panel"
   - **Repository access**: Select "Only select repositories" → choose `chasers-designated-drivers`
   - **Permissions**:
     - Repository permissions → Contents: **Read and write**
4. Generate the token and copy it (you won't see it again!)

### 2. Add Environment Variables

Add these to your Netlify environment variables:

```env
ADMIN_PASSWORD=choose-a-secure-password
JWT_SECRET=generate-a-random-secret-key
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=travisdbates
GITHUB_REPO=chasers-designated-drivers
GITHUB_BRANCH=main
```

**To set in Netlify:**
1. Go to your site in Netlify
2. Site settings → Environment variables
3. Add each variable above
4. Redeploy the site

### 3. Test Locally (Optional)

Add the same variables to your local `.env` file:

```bash
# In .env
ADMIN_PASSWORD=test123
JWT_SECRET=local-dev-secret
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=travisdbates
GITHUB_REPO=chasers-designated-drivers
GITHUB_BRANCH=main
```

Then run:
```bash
npm run dev
```

Visit `http://localhost:4321/admin`

## Usage

### For Rocky (Admin User)

1. Visit `https://chasersdd.com/admin`
2. Enter the admin password
3. Edit any pricing fields:
   - **Monthly Price**: The subscription price per month
   - **Trip Fee**: The per-ride fee charged to members
4. Click "Save Pricing & Commit to GitHub"
5. Wait 1-2 minutes for the site to rebuild
6. New pricing is live!

### Security Notes

- The admin password is stored as an environment variable (not in the code)
- Login creates a JWT token stored in an httpOnly cookie (JavaScript can't access it)
- Token expires after 8 hours
- GitHub token is scoped to only this repository with minimal permissions
- All admin API routes verify the JWT before allowing access

## File Structure

```
pricing-overrides.json              # Pricing data (committed to git)
src/config/plans.ts                 # Plan definitions (reads pricing-overrides.json)
src/pages/admin.astro               # Admin panel UI
src/pages/api/admin/
  ├── login.ts                      # Login endpoint
  ├── logout.ts                     # Logout endpoint
  ├── auth-utils.ts                 # JWT verification utilities
  ├── get-pricing.ts                # Fetch current pricing from GitHub
  └── update-pricing.ts             # Update pricing and commit to GitHub
```

## Troubleshooting

### "Invalid password" error
- Check that `ADMIN_PASSWORD` environment variable is set correctly in Netlify
- Make sure you redeploy after adding the env variable

### "Unauthorized" when trying to save
- Your session may have expired (8-hour timeout)
- Refresh the page and log in again

### Pricing not updating on site
- Check Netlify deploy logs to see if the build succeeded
- Verify the commit was created in GitHub (check commit history)
- It takes 1-2 minutes for the site to rebuild

### GitHub API errors
- Verify `GITHUB_TOKEN` is valid and has Contents write permission
- Check that `GITHUB_OWNER` and `GITHUB_REPO` match your repository
- Ensure the token hasn't expired

## Future Enhancements

Possible improvements:
- Add ability to edit plan features and descriptions
- Preview changes before committing
- View commit history
- Revert to previous pricing
- Add more admin users with email-based auth
