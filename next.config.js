/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["replicate.delivery", "api.magicapi.dev"],
  },
};

module.exports = nextConfig;
