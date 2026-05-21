import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disambiguate workspace root — the parent directory has another lockfile,
  // and Next would otherwise climb up and try to compile files from there.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
