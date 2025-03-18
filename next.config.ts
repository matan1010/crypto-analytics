import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    
    // Add a rule for .mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
  // Enable transpilePackages
  transpilePackages: ['lightweight-charts', '@tanstack/react-query'],
};

export default nextConfig;
