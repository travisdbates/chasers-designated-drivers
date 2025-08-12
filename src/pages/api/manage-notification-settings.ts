import type { APIRoute } from 'astro';

// Ensure this API route is server-rendered
export const prerender = false;

// Notification settings management
// In production, these should be stored in a database
// For now, we'll use environment variables as the source of truth
interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  marketingSms: boolean;
  lastUpdated: Date;
  updatedBy?: string;
}

// In-memory storage for demo purposes
// In production, store in database
let notificationSettings: NotificationSettings = {
  emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  smsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
  marketingEmails: process.env.ENABLE_MARKETING_EMAILS === 'true',
  marketingSms: process.env.ENABLE_MARKETING_SMS === 'true',
  lastUpdated: new Date(),
  updatedBy: 'system'
};

export const GET: APIRoute = async ({ request }) => {
  try {
    // In production, add authentication/authorization here
    const authHeader = request.headers.get('authorization');
    if (!isAuthorized(authHeader)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized access' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        settings: notificationSettings,
        environmentDefaults: {
          emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
          smsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
          marketingEmails: process.env.ENABLE_MARKETING_EMAILS === 'true',
          marketingSms: process.env.ENABLE_MARKETING_SMS === 'true'
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification settings retrieval error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // In production, add authentication/authorization here
    const authHeader = request.headers.get('authorization');
    const user = getUserFromAuth(authHeader);
    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized access' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updateData = await request.json();

    // Validate the update data
    const validKeys = ['emailNotifications', 'smsNotifications', 'marketingEmails', 'marketingSms'];
    const invalidKeys = Object.keys(updateData).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid settings keys: ${invalidKeys.join(', ')}` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate that all values are booleans
    for (const [key, value] of Object.entries(updateData)) {
      if (typeof value !== 'boolean') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Setting '${key}' must be a boolean value` 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update settings
    const previousSettings = { ...notificationSettings };
    notificationSettings = {
      ...notificationSettings,
      ...updateData,
      lastUpdated: new Date(),
      updatedBy: user.username || 'unknown'
    };

    // Log the change
    console.log('Notification settings updated:', {
      previous: previousSettings,
      current: notificationSettings,
      updatedBy: user.username,
      timestamp: notificationSettings.lastUpdated
    });

    // In production, you might want to:
    // 1. Save to database
    // 2. Send notification to other admins about the change
    // 3. Update environment variables dynamically
    // 4. Clear relevant caches

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification settings updated successfully',
        settings: notificationSettings,
        changes: getChanges(previousSettings, notificationSettings)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification settings update error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Helper function to check authorization
// In production, implement proper JWT validation or session management
function isAuthorized(authHeader: string | null): boolean {
  console.log('Auth Debug:', {
    authHeader,
    envTokens: process.env.ADMIN_API_TOKENS,
    allEnvVars: Object.keys(process.env).filter(k => k.includes('ADMIN'))
  });
  
  if (!authHeader) return false;
  
  // Simple demo authorization - replace with proper auth
  const token = authHeader.replace('Bearer ', '');
  const validTokens = process.env.ADMIN_API_TOKENS?.split(',') || ['demo-admin-token'];
  
  console.log('Token check:', { token, validTokens, result: validTokens.includes(token) });
  
  return validTokens.includes(token);
}

// Helper function to get user from auth header
// In production, implement proper user resolution from JWT or session
function getUserFromAuth(authHeader: string | null): { username: string } | null {
  if (!isAuthorized(authHeader)) return null;
  
  // Demo user - replace with proper user resolution
  return { username: 'admin' };
}

// Helper function to identify what changed
function getChanges(previous: NotificationSettings, current: NotificationSettings): Record<string, { from: boolean; to: boolean }> {
  const changes: Record<string, { from: boolean; to: boolean }> = {};
  
  const keys: (keyof NotificationSettings)[] = ['emailNotifications', 'smsNotifications', 'marketingEmails', 'marketingSms'];
  
  for (const key of keys) {
    if (previous[key] !== current[key]) {
      changes[key] = {
        from: previous[key] as boolean,
        to: current[key] as boolean
      };
    }
  }
  
  return changes;
}

// Export the current settings for use by other modules
export function getCurrentNotificationSettings(): NotificationSettings {
  return { ...notificationSettings };
}

// Helper function to check if a specific notification type is enabled
export function isNotificationEnabled(type: 'email' | 'sms' | 'marketing_email' | 'marketing_sms'): boolean {
  switch (type) {
    case 'email':
      return notificationSettings.emailNotifications;
    case 'sms':
      return notificationSettings.smsNotifications;
    case 'marketing_email':
      return notificationSettings.marketingEmails;
    case 'marketing_sms':
      return notificationSettings.marketingSms;
    default:
      return false;
  }
}