import type { APIRoute } from 'astro';
import { verifyAdminToken, createUnauthorizedResponse } from './auth-utils';

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.GITHUB_OWNER || 'travisdbates';
const GITHUB_REPO = import.meta.env.GITHUB_REPO || 'chasers-designated-drivers';

export const GET: APIRoute = async ({ request }) => {
  // Verify admin authentication
  if (!verifyAdminToken(request)) {
    return createUnauthorizedResponse();
  }

  try {
    // Fetch current pricing from GitHub
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/pricing-overrides.json`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Decode base64 content
    const content = JSON.parse(
      Buffer.from(data.content, 'base64').toString('utf-8')
    );

    return new Response(
      JSON.stringify({
        pricing: content,
        sha: data.sha // We'll need this SHA for updating
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch pricing data' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
