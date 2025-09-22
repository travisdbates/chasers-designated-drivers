// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://chasersdd.com',
  output: 'server', // Server-side rendering for API routes
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [react(), tailwind()],
  server: {
    host: true,
    port: 4321
  }
});