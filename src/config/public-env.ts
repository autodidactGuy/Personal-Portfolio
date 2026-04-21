import defaults from "../../config/public-env.defaults.json";

type PublicEnvKey = keyof typeof defaults;

function resolvePublicEnvValue(key: PublicEnvKey) {
	const runtimeValue = process.env[key];

	if (runtimeValue !== undefined && runtimeValue !== "") {
		return runtimeValue;
	}

	if (
		key === "NEXT_PUBLIC_ASSISTANT_WORKER_URL" &&
		process.env.NEXT_PUBLIC_CONTACT_WORKER_URL
	) {
		return process.env.NEXT_PUBLIC_CONTACT_WORKER_URL;
	}

	return defaults[key];
}

export const publicEnv = {
	NEXT_PUBLIC_BASE_PATH: resolvePublicEnvValue("NEXT_PUBLIC_BASE_PATH"),
	NEXT_PUBLIC_REPOSITORY_NAME: resolvePublicEnvValue(
		"NEXT_PUBLIC_REPOSITORY_NAME",
	),
	NEXT_PUBLIC_CONTACT_WORKER_URL: resolvePublicEnvValue(
		"NEXT_PUBLIC_CONTACT_WORKER_URL",
	),
	NEXT_PUBLIC_ASSISTANT_WORKER_URL: resolvePublicEnvValue(
		"NEXT_PUBLIC_ASSISTANT_WORKER_URL",
	),
	NEXT_PUBLIC_LOCAL_WORKER_URL: resolvePublicEnvValue(
		"NEXT_PUBLIC_LOCAL_WORKER_URL" as PublicEnvKey,
	),
	NEXT_PUBLIC_TURNSTILE_SITE_KEY: resolvePublicEnvValue(
		"NEXT_PUBLIC_TURNSTILE_SITE_KEY",
	),
	NEXT_PUBLIC_GITHUB_MODELS_EMBEDDING_MODEL: resolvePublicEnvValue(
		"NEXT_PUBLIC_GITHUB_MODELS_EMBEDDING_MODEL",
	),
} as const;

export function getPublicEnv() {
	return publicEnv;
}

function isLocalRuntimeHost(hostname: string) {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

function shouldUseLocalWorkerUrl() {
	if (typeof window === "undefined") {
		return false;
	}

	return isLocalRuntimeHost(window.location.hostname);
}

export function getContactWorkerUrl() {
	if (shouldUseLocalWorkerUrl() && publicEnv.NEXT_PUBLIC_LOCAL_WORKER_URL) {
		return publicEnv.NEXT_PUBLIC_LOCAL_WORKER_URL;
	}

	return publicEnv.NEXT_PUBLIC_CONTACT_WORKER_URL;
}

export function getAssistantWorkerUrl() {
	if (shouldUseLocalWorkerUrl() && publicEnv.NEXT_PUBLIC_LOCAL_WORKER_URL) {
		return publicEnv.NEXT_PUBLIC_LOCAL_WORKER_URL;
	}

	return publicEnv.NEXT_PUBLIC_ASSISTANT_WORKER_URL;
}
