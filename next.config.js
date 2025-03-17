/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
  // Disable SWC minify if causing problems
  experimental: {
    // esmExternals: true
  }
};

module.exports = nextConfig; 