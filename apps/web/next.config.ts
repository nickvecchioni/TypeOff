import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@typeoff/shared", "@typeoff/db"],
  serverExternalPackages: [
    "jose",
    "@auth/core",
    "preact",
    "preact-render-to-string",
    "socket.io-client",
    "engine.io-client",
  ],
  outputFileTracingRoot: resolve(__dirname, "../../"),
};

export default nextConfig;
