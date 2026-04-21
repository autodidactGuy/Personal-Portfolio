import experimentalAssistantDefaults from "../../config/experimental-assistant.defaults.json";

type ExperimentalAssistantConfigKey =
	keyof typeof experimentalAssistantDefaults;

function resolveExperimentalAssistantConfigValue(
	key: ExperimentalAssistantConfigKey,
) {
	const runtimeValue = process.env[key];

	if (runtimeValue !== undefined && runtimeValue !== "") {
		return runtimeValue;
	}

	return String(experimentalAssistantDefaults[key]);
}

export const experimentalAssistantConfig = {
	NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_PROXY_URL:
		resolveExperimentalAssistantConfigValue(
			"NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_PROXY_URL",
		),
	NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_CHAT_MODEL:
		resolveExperimentalAssistantConfigValue(
			"NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_CHAT_MODEL",
		),
	NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_EMBEDDING_MODEL:
		resolveExperimentalAssistantConfigValue(
			"NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_EMBEDDING_MODEL",
		),
} as const;
