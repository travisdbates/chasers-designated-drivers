import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import {
  getClientId,
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts
} from './rate-limit';

const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || 'change-me-in-production';
const JWT_SECRET = import.meta.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get client identifier (IP address)
    const clientId = getClientId(request);

    // Check rate limit
    const rateLimit = checkRateLimit(clientId);
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for ${clientId}. Locked until ${rateLimit.retryAfter}s`);
      return new Response(
        JSON.stringify({
          error: `Too many failed attempts. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`,
          retryAfter: rateLimit.retryAfter
        }),
        {
          status: 429, // Too Many Requests
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimit.retryAfter!.toString()
          }
        }
      );
    }

    const { password } = await request.json();

    if (password !== ADMIN_PASSWORD) {
      // Record failed attempt
      recordFailedAttempt(clientId);

      // Get updated rate limit info
      const updatedLimit = checkRateLimit(clientId);
      const attemptsLeft = updatedLimit.attemptsLeft || 0;

      let errorMessage = 'Invalid password';
      if (attemptsLeft > 0) {
        errorMessage += `. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`;
      } else {
        errorMessage = 'Too many failed attempts. Account locked for 15 minutes.';
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Clear failed attempts on successful login
    clearAttempts(clientId);

    // Create JWT token
    const token = jwt.sign(
      { admin: true, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`Successful admin login from ${clientId}`);

    // Set httpOnly cookie
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
        }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
