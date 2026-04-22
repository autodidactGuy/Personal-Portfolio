import type { RagConfig, RagEnv } from "./types";

function parseInteger(value: string | undefined, fallback: number) {
	const parsed = Number.parseInt(String(value || ""), 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseFloatValue(value: string | undefined, fallback: number) {
	const parsed = Number.parseFloat(String(value || ""));
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function getRagConfig(env: RagEnv): RagConfig {
	return {
		embeddingModel: env.RAG_EMBED_MODEL || "@cf/baai/bge-small-en-v1.5",
		chatModel: env.RAG_CHAT_MODEL || "@cf/meta/llama-3.1-8b-instruct",
		topK: parseInteger(env.RAG_TOP_K, 6),
		similarityThreshold: parseFloatValue(env.RAG_SIMILARITY_THRESHOLD, 0.72),
		maxContextChunks: parseInteger(env.RAG_MAX_CONTEXT_CHUNKS, 4),
		maxOutputTokens: parseInteger(env.RAG_MAX_OUTPUT_TOKENS, 300),
		allowedOrigins: String(env.RAG_ALLOWED_ORIGINS || "*")
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean),
	};
}
