/**
 * Simple rate limiting for login attempts
 * Stores failed attempts in memory (resets on serverless function cold start)
 * For production, consider using Redis or a persistent store
 */

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// In-memory store (resets on cold start, which is acceptable for basic protection)
const attempts = new Map<string, LoginAttempt>();

const MAX_ATTEMPTS = 5; // Max failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour window to track attempts

/**
 * Get client identifier (IP address)
 */
export function getClientId(request: Request): string {
  // Try to get real IP from various headers (Netlify, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return (
    cfConnectingIp ||
    realIp ||
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
    'unknown'
  );
}

/**
 * Check if client is rate limited
 * Returns { allowed: boolean, retryAfter?: number }
 */
export function checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number; attemptsLeft?: number } {
  const now = Date.now();
  const attempt = attempts.get(clientId);

  if (!attempt) {
    return { allowed: true, attemptsLeft: MAX_ATTEMPTS };
  }

  // Check if currently locked out
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    const retryAfter = Math.ceil((attempt.lockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Reset if outside the attempt window
  if (now - attempt.firstAttempt > ATTEMPT_WINDOW) {
    attempts.delete(clientId);
    return { allowed: true, attemptsLeft: MAX_ATTEMPTS };
  }

  // Check if too many attempts
  if (attempt.count >= MAX_ATTEMPTS) {
    // Lock the account
    attempt.lockedUntil = now + LOCKOUT_DURATION;
    const retryAfter = Math.ceil(LOCKOUT_DURATION / 1000);
    return { allowed: false, retryAfter };
  }

  const attemptsLeft = MAX_ATTEMPTS - attempt.count;
  return { allowed: true, attemptsLeft };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(clientId: string): void {
  const now = Date.now();
  const attempt = attempts.get(clientId);

  if (!attempt) {
    attempts.set(clientId, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now
    });
  } else {
    // Reset if outside the window
    if (now - attempt.firstAttempt > ATTEMPT_WINDOW) {
      attempts.set(clientId, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      attempt.count++;
      attempt.lastAttempt = now;

      // Lock if max attempts reached
      if (attempt.count >= MAX_ATTEMPTS) {
        attempt.lockedUntil = now + LOCKOUT_DURATION;
      }
    }
  }

  // Log the failed attempt
  console.warn(`Failed login attempt from ${clientId}. Total attempts: ${attempts.get(clientId)?.count}`);
}

/**
 * Clear attempts on successful login
 */
export function clearAttempts(clientId: string): void {
  attempts.delete(clientId);
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanup(): void {
  const now = Date.now();
  for (const [clientId, attempt] of attempts.entries()) {
    if (now - attempt.firstAttempt > ATTEMPT_WINDOW && (!attempt.lockedUntil || now > attempt.lockedUntil)) {
      attempts.delete(clientId);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanup, 10 * 60 * 1000);
