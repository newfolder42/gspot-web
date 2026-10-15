import type { NextConfig } from 'next';

const config: NextConfig = {
  // `next dev` would otherwise drop an AGENTS.md next to the app.
  agentRules: false,
  experimental: {
    // Item icons go up through a server action; the default 1 MB would reject a larger PNG.
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default config;
