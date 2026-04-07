import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mongoose", "node-cron"],
};

export default nextConfig;
