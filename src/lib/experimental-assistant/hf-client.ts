import { experimentalAssistantConfig } from "@/config/experimental-assistant";

type EmbeddingsResponse = {
	data?: Array<{
		embedding?: number[];
		index?: number;
	}>;
	model?: string;
};

type ChatCompletionResponse = {
	choices?: Array<{
		message?: {
			content?: string | null;
		};
	}>;
};

export function getExperimentalAssistantProxyUrl() {
	return (
		process.env.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_PROXY_URL ||
		experimentalAssistantConfig.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_PROXY_URL
	);
}

export async function fetchExperimentalQueryEmbedding({
	model,
	query,
}: {
	model: string;
	query: string;
}) {
	const response = await fetch(
		`${getExperimentalAssistantProxyUrl()}/v1/embeddings`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model,
				input: query,
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Embedding request failed: ${response.status}`);
	}

	const payload = (await response.json()) as EmbeddingsResponse;
	const embedding = payload.data?.[0]?.embedding;

	if (!embedding?.length) {
		throw new Error("Embedding response did not include a vector.");
	}

	return embedding;
}

export async function fetchExperimentalChatAnswer({
	model,
	question,
	context,
}: {
	model: string;
	question: string;
	context: Array<{ id: string; title: string; text: string; url?: string }>;
}) {
	const response = await fetch(
		`${getExperimentalAssistantProxyUrl()}/v1/chat/completions`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model,
				temperature: 0.2,
				max_tokens: 500,
				response_format: {
					type: "json_object",
				},
				messages: [
					{
						role: "system",
						content:
							"You answer only from the provided portfolio context. Return strict JSON with keys answer and citations. citations must be an array of context ids. If the context is weak, say so plainly.",
					},
					{
						role: "user",
						content: JSON.stringify({
							question,
							context,
						}),
					},
				],
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Chat request failed: ${response.status}`);
	}

	const payload = (await response.json()) as ChatCompletionResponse;
	const rawContent = payload.choices?.[0]?.message?.content;

	if (!rawContent) {
		throw new Error("Chat response did not include content.");
	}

	const parsed = JSON.parse(rawContent) as {
		answer?: string;
		citations?: string[];
	};

	if (!parsed.answer || !Array.isArray(parsed.citations)) {
		throw new Error("Chat response JSON was missing answer or citations.");
	}

	return {
		answer: parsed.answer,
		citations: parsed.citations,
	};
}
