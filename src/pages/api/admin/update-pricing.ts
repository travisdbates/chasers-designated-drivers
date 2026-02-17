import type { APIRoute } from 'astro';
import { verifyAdminToken, createUnauthorizedResponse } from './auth-utils';

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.GITHUB_OWNER || 'travisdbates';
const GITHUB_REPO = import.meta.env.GITHUB_REPO || 'chasers-designated-drivers';
const GITHUB_BRANCH = import.meta.env.GITHUB_BRANCH || 'main';

export const POST: APIRoute = async ({ request }) => {
  // Verify admin authentication
  if (!verifyAdminToken(request)) {
    return createUnauthorizedResponse();
  }

  try {
    const { pricing, sha } = await request.json();

    if (!pricing || !sha) {
      return new Response(
        JSON.stringify({ error: 'Missing pricing data or SHA' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Convert pricing object to formatted JSON string
    const content = JSON.stringify(pricing, null, 2);

    // Base64 encode the content
    const encodedContent = Buffer.from(content).toString('base64');

    // Update file on GitHub
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/pricing-overrides.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          message: 'Update pricing via admin panel',
          content: encodedContent,
          sha: sha, // Required to prevent conflicts
          branch: GITHUB_BRANCH
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', errorData);
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        commit: result.commit
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating pricing:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to update pricing',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
