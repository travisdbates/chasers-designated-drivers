import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({
      acceptBlueEnv: process.env.ACCEPTBLUE_ENVIRONMENT,
      hasTokenizationKey: !!process.env.ACCEPTBLUE_TOKENIZATION_KEY,
      tokenizationKeyPreview: process.env.ACCEPTBLUE_TOKENIZATION_KEY 
        ? `${process.env.ACCEPTBLUE_TOKENIZATION_KEY.substring(0, 10)}...` 
        : 'not found',
      hasApiKey: !!process.env.ACCEPTBLUE_API_KEY,
      envVarsCount: Object.keys(process.env).length
    }, null, 2),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
};