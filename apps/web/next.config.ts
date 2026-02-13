import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@typeoff/shared", "@typeoff/db"],
};

export default nextConfig;
