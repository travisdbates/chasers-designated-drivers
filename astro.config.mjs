// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://chasersdd.com',
  output: 'server', // Server-side rendering for API routes
  adapter: netlify({
    edgeMiddleware: false // Disable Edge Functions for local development
  }),
  integrations: [react(), tailwind()],
  server: {
    host: true,
    port: 4321
  }
});