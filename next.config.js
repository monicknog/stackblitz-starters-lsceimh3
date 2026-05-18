/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'scanini.app',
        pathname: '/og/sticker/**',
      },
    ],
  },
};

module.exports = nextConfig;
