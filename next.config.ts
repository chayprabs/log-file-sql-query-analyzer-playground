import type { NextConfig } from "next";

const repoBasePath =
  process.env.GITHUB_PAGES === "true"
    ? "/log-file-sql-query-analyzer-playground"
    : "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BASE_PATH: repoBasePath,
  },
  output: "export",
  basePath: repoBasePath,
  assetPrefix: repoBasePath ? `${repoBasePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  turbopack: {},
};

export default nextConfig;