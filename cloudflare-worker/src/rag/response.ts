import type {
	RagAskResponse,
	RagCitation,
	RagConfig,
	RagRetrieveResponse,
} from "./types";

function buildCorsHeaders(origin: string | null) {
	return {
		"Access-Control-Allow-Origin": origin || "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		Vary: "Origin",
	};
}

export function jsonResponse(
	body:
		| RagAskResponse
		| RagRetrieveResponse
		| { error: string; fields?: string[] },
	status: number,
	origin: string | null,
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...buildCorsHeaders(origin),
		},
	});
}

export function preflightResponse(origin: string | null) {
	return new Response(null, {
		status: 204,
		headers: buildCorsHeaders(origin),
	});
}

export function createAskResponse(input: {
	status: RagAskResponse["status"];
	answer: string;
	citations: RagCitation[];
	retrievalMatched: number;
	config: RagConfig;
	error?: string;
}) {
	return {
		ok: input.status !== "error",
		status: input.status,
		answer: input.answer,
		citations: input.citations,
		retrieval: {
			topK: input.config.topK,
			matched: input.retrievalMatched,
			threshold: input.config.similarityThreshold,
		},
		model: {
			embedding: input.config.embeddingModel,
			generation: input.status === "answered" ? input.config.chatModel : null,
		},
		...(input.error ? { error: input.error } : {}),
	} satisfies RagAskResponse;
}
