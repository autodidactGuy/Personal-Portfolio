export type RagChunkRecord = {
	vectorId: string;
	id: string;
	text: string;
	sourceType: string;
	title: string;
	url?: string;
	slug?: string;
	tags?: string[];
	section: string;
	priority?: number;
};

export type RagCitation = {
	id: string;
	sourceType: string;
	title: string;
	url?: string;
	slug?: string;
	section: string;
	score: number;
};

export type RagAskResponse = {
	ok: boolean;
	status: "answered" | "insufficient_context" | "no_match" | "error";
	answer: string;
	citations: RagCitation[];
	retrieval: {
		topK: number;
		matched: number;
		threshold: number;
	};
	model: {
		embedding: string;
		generation: string | null;
	};
	error?: string;
};

export type RagRetrieveChunk = {
	id: string;
	sourceType: string;
	title: string;
	text: string;
	url?: string;
	slug?: string;
	section: string;
	score: number;
};

export type RagRetrieveResponse = {
	ok: boolean;
	status: "ready" | "no_match" | "insufficient_context" | "error";
	matched: number;
	chunks: RagRetrieveChunk[];
	error?: string;
};

export type RagEnv = {
	AI: {
		run(model: string, input: Record<string, unknown>): Promise<unknown>;
	};
	VECTOR_INDEX: {
		query(
			vector: number[] | Float32Array,
			options?: {
				topK?: number;
				returnValues?: boolean;
				returnMetadata?: "none" | "indexed" | "all";
			},
		): Promise<{
			count?: number;
			matches?: Array<{
				id: string;
				score?: number;
				metadata?: Record<string, unknown>;
			}>;
		}>;
	};
	RAG_KV: {
		get(
			keys: string | string[],
			type?: "text",
		): Promise<string | null | Map<string, string | null>>;
	};
	RAG_EMBED_MODEL?: string;
	RAG_CHAT_MODEL?: string;
	RAG_TOP_K?: string;
	RAG_SIMILARITY_THRESHOLD?: string;
	RAG_MAX_CONTEXT_CHUNKS?: string;
	RAG_MAX_OUTPUT_TOKENS?: string;
	ALLOWED_ORIGINS?: string;
	ORIGIN?: string;
};

export type RagConfig = {
	embeddingModel: string;
	chatModel: string;
	topK: number;
	similarityThreshold: number;
	maxContextChunks: number;
	maxOutputTokens: number;
};
