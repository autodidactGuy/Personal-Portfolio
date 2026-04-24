import { getRagConfig } from "./config";
import { RAG_MISSING_MESSAGE, RAG_REJECTED_MESSAGE } from "./prompt";
import { generateAnswer, retrieveChunks } from "./retrieve";
import type { RagChunkRecord, RagEnv } from "./types";

export const PORTFOLIO_RAG_MISSING_MESSAGE = RAG_MISSING_MESSAGE;

export function extractQuestionFromMessages(
	messages: Array<{ role?: string; content?: string }> = [],
) {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message?.role === "user" && typeof message.content === "string") {
			return message.content.trim();
		}
	}

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (typeof message?.content === "string") {
			return message.content.trim();
		}
	}

	return "";
}

type RagSupplementalSnippet = {
	id: string;
	title: string;
	text: string;
	url?: string;
	slug?: string;
	sourceType?: string;
	section?: string;
};

type RagQuestionOptions = {
	messages?: Array<{ role?: string; content?: string }>;
	snippets?: RagSupplementalSnippet[];
	context?: string;
};

function inferChunkTypeFromId(id: string) {
	const [head = "summary", , section = "summary"] = id.split(":");

	switch (head) {
		case "experience":
		case "education":
		case "project":
		case "article":
		case "case-study":
		case "recommendation":
			return {
				sourceType: head,
				section,
			};
		default:
			return {
				sourceType: head,
				section: "summary",
			};
	}
}

function extractRecentContextFromMessages(
	messages: Array<{ role?: string; content?: string }> = [],
) {
	for (const message of messages) {
		if (message.role !== "developer" || typeof message.content !== "string") {
			continue;
		}

		const match = message.content.match(
			/RECENT_CHAT_CONTEXT:\n([\s\S]*?)\n\nSUPPORTING_RESUME_SNIPPETS:/,
		);

		if (match?.[1]?.trim()) {
			return match[1].trim();
		}
	}

	return "None";
}

function extractSupportingSnippetsFromMessages(
	messages: Array<{ role?: string; content?: string }> = [],
) {
	const snippets: RagSupplementalSnippet[] = [];

	for (const message of messages) {
		if (message.role !== "developer" || typeof message.content !== "string") {
			continue;
		}

		const block =
			message.content.match(/SUPPORTING_RESUME_SNIPPETS:\n([\s\S]*)$/)?.[1] ||
			"";

		if (!block.trim()) {
			continue;
		}

		const lines = block.split("\n");
		let current:
			| (RagSupplementalSnippet & {
					buffer: string[];
			  })
			| null = null;

		const flushCurrent = () => {
			if (!current) {
				return;
			}

			const text = current.buffer.join("\n").trim();

			snippets.push({
				id: current.id,
				title: current.title,
				text: text || current.title,
				url: current.url,
				slug: current.slug,
				sourceType: current.sourceType,
				section: current.section,
			});
			current = null;
		};

		for (const rawLine of lines) {
			const line = rawLine.trimEnd();
			const headerMatch = line.match(/^\[([^\]]+)\]\s+(.+)$/);

			if (headerMatch) {
				flushCurrent();
				const id = headerMatch[1].trim();
				const inferred = inferChunkTypeFromId(id);

				current = {
					id,
					title: headerMatch[2].trim(),
					text: "",
					sourceType: inferred.sourceType,
					section: inferred.section,
					buffer: [],
				};
				continue;
			}

			if (current) {
				current.buffer.push(line);
			}
		}

		flushCurrent();
	}

	return snippets;
}

function toSupplementalChunk(snippet: RagSupplementalSnippet): RagChunkRecord {
	const inferred = inferChunkTypeFromId(snippet.id);

	return {
		vectorId: `supplemental:${snippet.id}`,
		id: snippet.id,
		text: snippet.text,
		sourceType: snippet.sourceType || inferred.sourceType,
		title: snippet.title,
		slug: snippet.slug,
		url: snippet.url,
		section: snippet.section || inferred.section,
	};
}

function mergeUniqueChunks(chunks: RagChunkRecord[]) {
	const byId = new Map<string, RagChunkRecord>();

	for (const chunk of chunks) {
		if (!chunk.id || byId.has(chunk.id)) {
			continue;
		}

		byId.set(chunk.id, chunk);
	}

	return Array.from(byId.values());
}

export async function runRagQuestion(
	question: string,
	env: RagEnv,
	options: RagQuestionOptions = {},
) {
	const config = getRagConfig(env);
	const retrieval = await retrieveChunks(question, env, config);
	const supplementalSnippets = mergeUniqueChunks(
		[
			...extractSupportingSnippetsFromMessages(options.messages),
			...(options.snippets || []),
		].map(toSupplementalChunk),
	);
	const recentContext =
		typeof options.context === "string" && options.context.trim()
			? options.context.trim()
			: extractRecentContextFromMessages(options.messages);
	const contextChunks =
		retrieval.status === "ready"
			? mergeUniqueChunks([...supplementalSnippets, ...retrieval.chunks])
			: supplementalSnippets;

	if (!contextChunks.length) {
		return {
			status: "missing",
			answer: PORTFOLIO_RAG_MISSING_MESSAGE,
			citations: [] as string[],
		};
	}

	const generated = await generateAnswer(
		question,
		contextChunks,
		env,
		config,
		recentContext,
	);
	const fallbackCitationIds = contextChunks
		.slice(0, config.maxContextChunks)
		.map((chunk) => chunk.id);
	const validCitationIds = new Set(contextChunks.map((chunk) => chunk.id));
	const citations =
		generated?.citations.filter((citation) => validCitationIds.has(citation)) ||
		[];

	return {
		status:
			generated?.status === "answered" ||
			generated?.status === "rejected" ||
			generated?.status === "missing"
				? generated.status
				: "missing",
		answer:
			generated?.answer ||
			(generated?.status === "rejected"
				? RAG_REJECTED_MESSAGE
				: PORTFOLIO_RAG_MISSING_MESSAGE),
		citations:
			generated?.status === "answered"
				? citations.length
					? citations
					: fallbackCitationIds
				: [],
	};
}
