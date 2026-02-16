import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@typeoff/shared", "@typeoff/db"],
  outputFileTracingRoot: resolve(__dirname, "../../"),
};

export default nextConfig;
