/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  useFileSystemPublicRoutes: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint checking during builds
    dirs: ['src'] // Directories to apply ESLint
  }
};

module.exports = nextConfig; 