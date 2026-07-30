/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Remote asset hosts (CDN, media library) are added here in later phases.
    remotePatterns: [],
  },
  experimental: {
    // App Router is stable in Next 14; future server actions / streaming AI
    // responses are enabled from here as the platform grows.
  },
};

export default nextConfig;
