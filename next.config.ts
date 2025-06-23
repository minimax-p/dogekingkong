import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    allowedDevOrigins: [
        "https://localhost:3000",
        "http://localhost:3000",
        "https://example.com",
        "http://example.com",
    ],
};

export default nextConfig;
