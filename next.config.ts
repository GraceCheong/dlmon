import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client'],
  allowedDevOrigins: ['127.0.0.1', 'localhost:3000'],
};

export default nextConfig;
