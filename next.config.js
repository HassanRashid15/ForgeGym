/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    domains: [],
  },
  // Use Turbopack (default in Next.js 16)
  turbopack: {},
};

module.exports = nextConfig;
