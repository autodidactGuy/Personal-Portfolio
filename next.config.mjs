/** @type {import('next').NextConfig} */
import publicEnvDefaults from "./config/public-env.defaults.json" with { type: "json" };
import experimentalAssistantDefaults from "./config/experimental-assistant.defaults.json" with { type: "json" };

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

const experimentalAssistantProxyUrl =
  process.env.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_PROXY_URL ||
  experimentalAssistantDefaults.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_PROXY_URL;

const experimentalAssistantChatModel =
  process.env.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_CHAT_MODEL ||
  experimentalAssistantDefaults.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_CHAT_MODEL;

const experimentalAssistantEmbeddingModel =
  process.env.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_EMBEDDING_MODEL ||
  experimentalAssistantDefaults.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_EMBEDDING_MODEL;

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
    NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_PROXY_URL: experimentalAssistantProxyUrl,
    NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_CHAT_MODEL: experimentalAssistantChatModel,
    NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_EMBEDDING_MODEL:
      experimentalAssistantEmbeddingModel,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
