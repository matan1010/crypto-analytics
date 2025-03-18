/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remove swcMinify as it's deprecated in Next.js 15
  // swcMinify: true,
  
  // Disable ESLint during build
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['pages', 'components', 'app', 'utils', 'hooks', 'src'],
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
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
  // Experimental features
  experimental: {
    // esmExternals: true
  }
};

module.exports = nextConfig; 