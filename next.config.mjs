/** @type {import('next').NextConfig} */

const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ||
  process.env.NEXT_PUBLIC_REPOSITORY_NAME ||
  "Personal-Portfolio";

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  process.env.BASE_PATH ??
  "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_REPOSITORY_NAME: repositoryName,
    NEXT_PUBLIC_CONTACT_WORKER_URL: process.env.NEXT_PUBLIC_CONTACT_WORKER_URL || "https://personal-portfolio.hassanraza632.workers.dev",
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
