import type { RagAskResponse, RagCitation, RagConfig } from "./types";

function buildCorsHeaders(origin: string) {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		Vary: "Origin",
	};
}

export function resolveCorsOrigin(request: Request, allowedOrigins: string[]) {
	if (allowedOrigins.includes("*")) {
		return "*";
	}

	const origin = request.headers.get("Origin");
	if (origin && allowedOrigins.includes(origin)) {
		return origin;
	}

	return "";
}

export function jsonResponse(
	body: RagAskResponse | { error: string; fields?: string[] },
	status: number,
	origin: string,
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...buildCorsHeaders(origin || "*"),
		},
	});
}

export function preflightResponse(origin: string) {
	return new Response(null, {
		status: 204,
		headers: buildCorsHeaders(origin || "*"),
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
