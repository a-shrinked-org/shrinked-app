/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@reactflow/core'],
  env: {
    NEXT_PUBLIC_R2_ACCOUNT_ID: process.env.NEXT_PUBLIC_R2_ACCOUNT_ID,
    NEXT_PUBLIC_R2_BUCKET_NAME: process.env.NEXT_PUBLIC_R2_BUCKET_NAME,
    NEXT_PUBLIC_R2_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID,
    NEXT_PUBLIC_R2_SECRET_ACCESS_KEY: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY,
  },
  webpack: (config) => {
    // Required for ReactFlow in production
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Enable WebAssembly for FFmpeg
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Add rule for handling .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
  // Modern handling of images and other static assets
  images: {
    domains: [
      'avatars.githubusercontent.com', 
      'lh3.googleusercontent.com',
      'refine.ams3.cdn.digitaloceanspaces.com'
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Add CORS headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;