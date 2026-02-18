import type { APIRoute } from 'astro';
import { verifyAdminToken, createUnauthorizedResponse } from './auth-utils';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const GET: APIRoute = async ({ request }) => {
  // Verify admin authentication
  if (!verifyAdminToken(request)) {
    return createUnauthorizedResponse();
  }

  try {
    // Get git log for pricing-overrides.json
    // Format: commit_hash|date|commit_message
    const { stdout: logOutput } = await execAsync(
      'git log --follow --pretty=format:"%H|%ai|%s" -20 -- pricing-overrides.json',
      { cwd: process.cwd() }
    );

    if (!logOutput.trim()) {
      return new Response(
        JSON.stringify({ history: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const commits = logOutput.trim().split('\n');
    const history = [];

    for (const commit of commits) {
      const [hash, date, message] = commit.split('|');

      try {
        // Get the content of pricing-overrides.json at this commit
        const { stdout: fileContent } = await execAsync(
          `git show ${hash}:pricing-overrides.json`,
          { cwd: process.cwd() }
        );

        const pricing = JSON.parse(fileContent);

        // Get the previous version to compare
        let previousPricing = null;
        let changes = null;

        try {
          const { stdout: prevContent } = await execAsync(
            `git show ${hash}~1:pricing-overrides.json`,
            { cwd: process.cwd() }
          );
          previousPricing = JSON.parse(prevContent);

          // Calculate changes
          changes = calculatePricingChanges(previousPricing, pricing);
        } catch (error) {
          // No previous version (initial commit)
          changes = Object.keys(pricing).map(planId => ({
            planId,
            type: 'initial',
            newPrice: pricing[planId].priceNumeric
          }));
        }

        history.push({
          hash: hash.substring(0, 7), // Short hash
          date: new Date(date).toISOString(),
          message,
          changes,
          pricing
        });
      } catch (error) {
        console.error(`Error parsing commit ${hash}:`, error);
        // Skip this commit if we can't parse it
        continue;
      }
    }

    return new Response(
      JSON.stringify({ history }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching pricing history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch pricing history' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Calculate what changed between two pricing versions
 */
function calculatePricingChanges(previous: any, current: any) {
  const changes = [];

  for (const planId in current) {
    const currentPrice = current[planId].priceNumeric;
    const previousPrice = previous?.[planId]?.priceNumeric;

    if (previousPrice === undefined) {
      // New plan added
      changes.push({
        planId,
        type: 'added',
        newPrice: currentPrice
      });
    } else if (currentPrice !== previousPrice) {
      // Price changed
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

  // Check for removed plans
  if (previous) {
    for (const planId in previous) {
      if (!(planId in current)) {
        changes.push({
          planId,
          type: 'removed',
          previousPrice: previous[planId].priceNumeric
        });
      }
    }
  }

  return changes;
}
