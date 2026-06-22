import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the container
  // image (apps/platform/Dockerfile) stays small and doesn't need node_modules
  // at runtime.
  output: "standalone",
  // This app lives in a pnpm workspace; trace files from the repo root so the
  // standalone bundle picks up the hoisted (symlinked) node_modules and the
  // server is emitted at .next/standalone/apps/platform/server.js.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // The editor ships as untranspiled TS/TSX source; let Next compile it.
  transpilePackages: ["@octo/editor"],
};

export default nextConfig;
