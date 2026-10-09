import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  version: string;
};

/**
 * GitHub Pages serves project sites from https://USERNAME.github.io/REPOSITORY/,
 * so every asset URL must be prefixed with "/REPOSITORY". The prefix is passed in
 * via NEXT_PUBLIC_BASE_PATH (the deploy workflow takes it from actions/configure-pages).
 * Leave it empty for local development, a custom domain or a USERNAME.github.io repo.
 */
function normalizeBasePath(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value || value === "/") return "";
  return value.startsWith("/") ? value : `/${value}`;
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
