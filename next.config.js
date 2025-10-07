/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
};
module.exports = nextConfig;