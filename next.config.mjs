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
    return config;
  },
  // Modern handling of images and other static assets
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'], // Add any domains you need for images
    unoptimized: process.env.NODE_ENV === 'development',
  }
};

export default nextConfig;