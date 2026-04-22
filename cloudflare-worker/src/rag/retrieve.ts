import { buildGroundedPrompt } from "./prompt";
import type { RagChunkRecord, RagCitation, RagConfig, RagEnv } from "./types";

function asEmbeddingVector(value: unknown) {
	const data = (value as { data?: number[][] })?.data;
	if (!Array.isArray(data) || !Array.isArray(data[0])) {
		throw new Error("Embedding model did not return vector data.");
	}

	return data[0];
}

function asMap(value: string | null | Map<string, string | null>) {
	if (value instanceof Map) {
		return value;
	}

	return new Map<string, string | null>();
}

function parseChunkRecord(rawValue: string | null) {
	if (!rawValue) {
		return null;
	}

	try {
		return JSON.parse(rawValue) as RagChunkRecord;
	} catch {
		return null;
	}
}

function parseLlmAnswer(result: unknown) {
	if (typeof result === "string") {
		return result.trim();
	}

	const response = result as {
		response?: string;
		result?: { response?: string };
		choices?: Array<{ message?: { content?: string } }>;
	};

	if (typeof response.response === "string") {
		return response.response.trim();
	}

	if (typeof response.result?.response === "string") {
		return response.result.response.trim();
	}

	const choiceContent = response.choices?.[0]?.message?.content;
	return typeof choiceContent === "string" ? choiceContent.trim() : "";
}

export async function retrieveChunks(
	question: string,
	env: RagEnv,
	config: RagConfig,
) {
	const embedding = await env.AI.run(config.embeddingModel, {
		text: [question],
		pooling: "cls",
	});

	const vector = asEmbeddingVector(embedding);
	const queryResult = await env.VECTOR_INDEX.query(vector, {
		topK: config.topK,
		returnMetadata: "indexed",
	});

	const matches = (queryResult.matches || []).filter(
		(match) => Number(match.score || 0) >= config.similarityThreshold,
	);

	if (matches.length === 0) {
		return {
			status: "no_match" as const,
			chunks: [],
			citations: [],
			matched: 0,
		};
	}

	const kvMap = asMap(
		await env.RAG_KV.get(
			matches.map((match) => match.id),
			"text",
		),
	);
	const records = matches
		.map((match) => {
			const chunk = parseChunkRecord(kvMap.get(match.id) || null);
			if (!chunk) {
				return null;
			}

			return {
				chunk,
				score: Number(match.score || 0),
			};
		})
		.filter(Boolean) as Array<{ chunk: RagChunkRecord; score: number }>;

	if (records.length === 0) {
		return {
			status: "insufficient_context" as const,
			chunks: [],
			citations: [],
			matched: matches.length,
		};
	}

	const limited = records.slice(0, config.maxContextChunks);
	const citations: RagCitation[] = limited.map((entry) => ({
		id: entry.chunk.id,
		sourceType: entry.chunk.sourceType,
		title: entry.chunk.title,
		url: entry.chunk.url,
		slug: entry.chunk.slug,
		section: entry.chunk.section,
		score: entry.score,
	}));

	return {
		status: "ready" as const,
		chunks: limited.map((entry) => entry.chunk),
		citations,
		matched: matches.length,
	};
}

export async function generateAnswer(
	question: string,
	chunks: RagChunkRecord[],
	env: RagEnv,
	config: RagConfig,
) {
	const prompt = buildGroundedPrompt(question, chunks);
	const result = await env.AI.run(config.chatModel, {
		prompt,
		max_tokens: config.maxOutputTokens,
		temperature: 0,
	});

	return parseLlmAnswer(result);
}
