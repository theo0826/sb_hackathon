import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH
  ?? (process.env.NODE_ENV === "production" ? "/sb_hackathon" : "");
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
};
export default nextConfig;
