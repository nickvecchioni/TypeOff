import type { NextConfig } from "next";
import { resolve } from "path";

// prettier-ignore
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/ranks",
        destination: "/about",
        permanent: true,
      },
    ];
  },
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
