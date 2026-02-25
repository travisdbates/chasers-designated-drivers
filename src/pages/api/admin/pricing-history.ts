import type { APIRoute } from 'astro';
import { verifyAdminToken, createUnauthorizedResponse } from './auth-utils';

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.GITHUB_OWNER || 'travisdbates';
const GITHUB_REPO = import.meta.env.GITHUB_REPO || 'chasers-designated-drivers';
const GITHUB_BRANCH = import.meta.env.GITHUB_BRANCH || 'main';

const GH_HEADERS = {
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

export const GET: APIRoute = async ({ request }) => {
  if (!verifyAdminToken(request)) {
    return createUnauthorizedResponse();
  }

  try {
    // Step 1: Get commits that touched pricing-overrides.json
    const commitsRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?path=pricing-overrides.json&sha=${GITHUB_BRANCH}&per_page=20`,
      { headers: GH_HEADERS }
    );

    if (!commitsRes.ok) {
      throw new Error(`GitHub commits API error: ${commitsRes.statusText}`);
    }

    const commits = await commitsRes.json();

    if (!commits.length) {
      return new Response(JSON.stringify({ history: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 2: For each commit, fetch the file content at that SHA
    const fileAtCommit = async (sha: string): Promise<Record<string, { priceNumeric: number }> | null> => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/pricing-overrides.json?ref=${sha}`,
          { headers: GH_HEADERS }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
      } catch {
        return null;
      }
    };

    // Fetch all versions in parallel
    const versions = await Promise.all(
      commits.map((c: any) => fileAtCommit(c.sha))
    );

    // Step 3: Build history by comparing each version to the one before it
    const history = commits
      .map((commit: any, index: number) => {
        const current = versions[index];
        const previous = versions[index + 1] ?? null; // next in array = older commit

        if (!current) return null;

        const changes = calculateChanges(previous, current);

        return {
          hash: commit.sha.substring(0, 7),
          date: commit.commit.author.date,
          message: commit.commit.message,
          changes
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ history }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching pricing history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch pricing history' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function calculateChanges(
  previous: Record<string, { priceNumeric: number }> | null,
  current: Record<string, { priceNumeric: number }>
) {
  const changes = [];

  for (const planId in current) {
    const currentPrice = current[planId].priceNumeric;
    const previousPrice = previous?.[planId]?.priceNumeric;

    if (previousPrice === undefined) {
      changes.push({ planId, type: 'initial', newPrice: currentPrice });
    } else if (currentPrice !== previousPrice) {
      const dollarChange = currentPrice - previousPrice;
      const percentChange = ((dollarChange / previousPrice) * 100).toFixed(1);
      changes.push({
        planId,
        type: 'changed',
        previousPrice,
        newPrice: currentPrice,
        dollarChange,
        percentChange
      });
    }
  }

  for (const planId in previous ?? {}) {
    if (!(planId in current)) {
      changes.push({ planId, type: 'removed', previousPrice: previous![planId].priceNumeric });
    }
  }

  return changes;
}
