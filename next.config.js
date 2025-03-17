/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    // Add externals for canvas and other problematic packages
    config.externals = [
      ...(config.externals || []), 
      { canvas: 'canvas' },
      // Ignore any mentions of mise or go
      { mise: 'commonjs mise' },
      { go: 'commonjs go' }
    ];
    
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
  // Disable SWC minify if causing problems
  experimental: {
    // esmExternals: true
  }
};

module.exports = nextConfig; 