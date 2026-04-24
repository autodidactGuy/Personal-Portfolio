import {
	buildGroundedMessages,
	RAG_MISSING_MESSAGE,
	RAG_REJECTED_MESSAGE,
} from "./prompt";
import type { RagChunkRecord, RagCitation, RagConfig, RagEnv } from "./types";

function asEmbeddingVector(value: unknown) {
	const data = (value as { data?: number[][] })?.data;
	if (!Array.isArray(data) || !Array.isArray(data[0])) {
		throw new Error("Embedding model did not return vector data.");
	}

	return data[0];
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

function inferStructuredStatus(answer: string) {
	const normalizedAnswer = answer.trim();

	if (normalizedAnswer === RAG_MISSING_MESSAGE) {
		return "missing" as const;
	}

	if (normalizedAnswer === RAG_REJECTED_MESSAGE) {
		return "rejected" as const;
	}

	return "answered" as const;
}

function tryParseStructuredAnswer(value: unknown) {
	if (!value) {
		return null;
	}

	if (
		typeof value === "object" &&
		value !== null &&
		"status" in value &&
		"answer" in value &&
		"citations" in value &&
		typeof value.status === "string" &&
		typeof value.answer === "string" &&
		Array.isArray(value.citations)
	) {
		return {
			status: value.status,
			answer: value.answer.trim(),
			citations: value.citations.filter(
				(citation): citation is string => typeof citation === "string",
			),
		};
	}

	if (typeof value === "string") {
		try {
			return tryParseStructuredAnswer(JSON.parse(value));
		} catch {
			const answer = value.trim();

			if (!answer) {
				return null;
			}

			return {
				status: inferStructuredStatus(answer),
				answer,
				citations: [] as string[],
			};
		}
	}

	return null;
}

function parseStructuredLlmAnswer(result: unknown) {
	if (typeof result === "string") {
		return tryParseStructuredAnswer(result);
	}

	const response = result as {
		response?: unknown;
		result?: { response?: unknown };
		choices?: Array<{ message?: { content?: unknown } }>;
	};

	return (
		tryParseStructuredAnswer(response.response) ||
		tryParseStructuredAnswer(response.result?.response) ||
		tryParseStructuredAnswer(response.choices?.[0]?.message?.content)
	);
}

function getChunkObjectKey(metadata: Record<string, unknown> | undefined) {
	const objectKey = metadata?.objectKey;
	return typeof objectKey === "string" && objectKey.trim()
		? objectKey.trim()
		: null;
}

async function loadChunkRecordFromR2(objectKey: string, env: RagEnv) {
	const object = await env.RAG_CHUNKS_BUCKET.get(objectKey);

	if (!object) {
		return null;
	}

	return parseChunkRecord(await object.text());
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
		returnMetadata: "all",
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

	const loadedMatches = await Promise.all(
		matches.map(async (match) => {
			const objectKey = getChunkObjectKey(match.metadata);

			if (!objectKey) {
				return null;
			}

			const chunk = await loadChunkRecordFromR2(objectKey, env);

			if (!chunk) {
				return null;
			}

			return {
				chunk,
				score: Number(match.score || 0),
			};
		}),
	);
	const records = loadedMatches.filter(Boolean) as Array<{
		chunk: RagChunkRecord;
		score: number;
	}>;

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
	recentContext = "None",
) {
	const { messages, responseFormat } = buildGroundedMessages(
		question,
		chunks,
		config.maxContextChunks,
		recentContext,
	);
	const result = await env.AI.run(config.chatModel, {
		messages,
		response_format: responseFormat,
		max_tokens: config.maxOutputTokens,
		temperature: 0,
	});

	return parseStructuredLlmAnswer(result);
}
