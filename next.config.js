/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow external packages
  serverExternalPackages: ['@prisma/client', 'bcryptjs']
}

module.exports = nextConfig


