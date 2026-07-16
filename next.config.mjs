/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets CI/verification builds target a different dir than a running dev server
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
