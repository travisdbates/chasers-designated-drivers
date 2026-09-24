import type { APIRoute } from 'astro';
import { verifyAdminToken, createUnauthorizedResponse } from './auth-utils';
import {
  approvePendingChange,
  getApprovedBaseline,
  getPendingChange,
} from '../../../lib/checkout-integrity';

export const prerender = false;

// Status of checkout page change detection, for the admin panel
export const GET: APIRoute = async ({ request }) => {
  if (!verifyAdminToken(request)) {
    return createUnauthorizedResponse();
  }

  try {
    const [approved, pending] = await Promise.all([
      getApprovedBaseline(),
      getPendingChange(),
    ]);

    return new Response(
      JSON.stringify({
        approved: approved && {
          approvedAt: approved.approvedAt,
          approvedBy: approved.approvedBy,
          capturedAt: approved.snapshot.capturedAt,
          pages: approved.snapshot.pages.length,
        },
        pending: pending && {
          fingerprint: pending.fingerprint,
          detectedAt: pending.detectedAt,
          changes: pending.changes,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error reading checkout integrity status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to read checkout integrity status' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Approve the pending change as authorized; it becomes the new baseline
export const POST: APIRoute = async ({ request }) => {
  if (!verifyAdminToken(request)) {
    return createUnauthorizedResponse();
  }

  try {
    const { fingerprint } = await request.json();
    if (typeof fingerprint !== 'string' || !fingerprint) {
      return new Response(
        JSON.stringify({ error: 'fingerprint is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const approved = await approvePendingChange(fingerprint, 'admin panel');
    if (!approved) {
      return new Response(
        JSON.stringify({ error: 'The pending change has changed since it was loaded. Reload and review it again.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checkout integrity change approved:', { fingerprint });
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error approving checkout integrity change:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to approve change' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
