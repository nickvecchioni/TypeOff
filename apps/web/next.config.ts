import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@typeoff/shared", "@typeoff/db"],
};

export default nextConfig;
