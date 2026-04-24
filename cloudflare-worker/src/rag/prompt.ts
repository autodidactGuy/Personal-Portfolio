import type { RagChunkRecord } from "./types";

export const RAG_MISSING_MESSAGE = "I don't have that information available.";
export const RAG_REJECTED_MESSAGE =
	"I can only answer questions based on the information available on this site.";

export const RAG_SYSTEM_PROMPT = `You are a AI assistant answering questions about one person's portfolio dataset.

Rules:
- ONLY answer using provided resume data
- All the information revolves around a single person named Hassan Raza.
- If info is missing: "${RAG_MISSING_MESSAGE}"
- Do NOT hallucinate or guess
- ONLY answer about the person described in the provided resume data
- Allow small talks and try to understand slangs
- Reject unrelated questions

Tone:
- Professional
- Concise
- Friendly`;

export function buildGroundedMessages(
	question: string,
	chunks: RagChunkRecord[],
	maxContextChunks: number,
	recentContext = "None",
) {
	const snippetList = chunks
		.map(
			(chunk) =>
				`[${chunk.id}] ${chunk.title} (${chunk.sourceType}, section: ${chunk.section})\n${chunk.text}`,
		)
		.join("\n\n");

	return {
		messages: [
			{
				role: "system" as const,
				content: RAG_SYSTEM_PROMPT,
			},
			{
				role: "developer" as const,
				content: [
					"Use only the SUPPORTING_RESUME_SNIPPETS below.",
					`If the snippets do not contain the answer, respond with status "missing" and answer exactly: ${RAG_MISSING_MESSAGE}`,
					`If the question is unrelated to the person described in the resume or recommendations, respond with status "rejected" and answer exactly: ${RAG_REJECTED_MESSAGE}`,
					"If the snippets do contain the answer, do not respond with a missing or rejected message.",
					"Do not say you can only answer based on this site unless the question is truly unrelated to the person described in the snippets.",
					"If a snippet directly answers the question, answer from that snippet instead of refusing.",
					"Do not infer, invent, generalize, or use outside knowledge.",
					"Every factual answer must be grounded in the snippet IDs you cite.",
					"If the question is about timing, chronology, first roles, or when work started, use the dates in the provided snippets when they are available. Otherwise match with the most relevant information from the snippets.",
					"If the question is about early, first, recent, or latest projects, articles, posts, or case studies, use the Date fields in the provided snippets when they are available to determine ordering.",
					"If the question is broad or asks for an overview, synthesize a fuller profile using the relevant snippets instead of giving a minimal generic summary.",
					"Keep the answer concise and friendly.",
					"",
					`RECENT_CHAT_CONTEXT:\n${recentContext || "None"}`,
					"",
					`SUPPORTING_RESUME_SNIPPETS:\n${snippetList}`,
				].join("\n"),
			},
			{
				role: "user" as const,
				content: question,
			},
		],
		responseFormat: {
			type: "json_schema" as const,
			json_schema: {
				type: "object",
				properties: {
					status: {
						type: "string",
						enum: ["answered", "missing", "rejected"],
					},
					answer: {
						type: "string",
					},
					citations: {
						type: "array",
						items: {
							type: "string",
						},
						maxItems: maxContextChunks,
					},
				},
				required: ["status", "answer", "citations"],
			},
		},
	};
}
