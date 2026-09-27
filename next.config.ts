import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // The tower is the whole site now. It lives at /tower so the plain site
    // (dogekingkong.com) can link straight to it; the root just sends you up.
    async redirects() {
        return [{ source: "/", destination: "/tower", permanent: false }];
    },
};

export default nextConfig;
