/** @type {import('next').NextConfig} */
import publicEnvDefaults from "./config/public-env.defaults.json" with { type: "json" };

const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ||
  process.env.NEXT_PUBLIC_REPOSITORY_NAME ||
  publicEnvDefaults.NEXT_PUBLIC_REPOSITORY_NAME;

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  process.env.BASE_PATH ??
  publicEnvDefaults.NEXT_PUBLIC_BASE_PATH;

const contactWorkerUrl =
  process.env.NEXT_PUBLIC_CONTACT_WORKER_URL ||
  publicEnvDefaults.NEXT_PUBLIC_CONTACT_WORKER_URL;

const assistantWorkerUrl =
  process.env.NEXT_PUBLIC_ASSISTANT_WORKER_URL ||
  process.env.NEXT_PUBLIC_CONTACT_WORKER_URL ||
  publicEnvDefaults.NEXT_PUBLIC_ASSISTANT_WORKER_URL ||
  contactWorkerUrl;

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_REPOSITORY_NAME: repositoryName,
    NEXT_PUBLIC_CONTACT_WORKER_URL: contactWorkerUrl,
    NEXT_PUBLIC_ASSISTANT_WORKER_URL: assistantWorkerUrl,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
      publicEnvDefaults.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_GITHUB_MODELS_CHAT_MODEL:
      process.env.NEXT_PUBLIC_GITHUB_MODELS_CHAT_MODEL ||
      publicEnvDefaults.NEXT_PUBLIC_GITHUB_MODELS_CHAT_MODEL,
    NEXT_PUBLIC_GITHUB_MODELS_EMBEDDING_MODEL:
      process.env.NEXT_PUBLIC_GITHUB_MODELS_EMBEDDING_MODEL ||
      publicEnvDefaults.NEXT_PUBLIC_GITHUB_MODELS_EMBEDDING_MODEL,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
