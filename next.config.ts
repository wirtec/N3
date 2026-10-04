import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/fa", permanent: false },
      { source: "/news/:id", destination: "/fa/news/:id", permanent: false },
      { source: "/archive", destination: "/fa/archive", permanent: false },
      { source: "/docs", destination: "/fa/docs", permanent: false },
    ];
  },
};

export default nextConfig;
