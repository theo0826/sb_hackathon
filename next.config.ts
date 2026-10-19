import type { NextConfig } from "next";

const staticSite = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
const nextConfig: NextConfig = {
  ...(staticSite ? { output: "export", trailingSlash: true, basePath: process.env.NEXT_PUBLIC_BASE_PATH || "", images: { unoptimized: true } } : {}),
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  ...(staticSite ? {} : { async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws://127.0.0.1:* ws://localhost:* http://localhost:11434 http://127.0.0.1:11434; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
    ] }];
  } }),
};
export default nextConfig;
