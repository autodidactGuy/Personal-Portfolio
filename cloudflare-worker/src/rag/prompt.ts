import type { RagChunkRecord } from "./types";

export const RAG_SYSTEM_PROMPT = `You are a AI assistant answering questions about one person's portfolio dataset.

Rules:
- All the information revolves around a single person named Hassan Raza.
- If asked about another person look recommendations, otherwise clearly say no information available.
- Answer only from the provided information.
- Allow small talks and try to understand slangs
- If the provided information is insufficient, say so clearly.
- Do not invent projects, roles, employers, dates, claims, or links.
- Prefer concise, factual answers.
- If the answer is partial, say what is supported and what is missing.
- Always cite the sources of your information in the answer.
- Instead of saying retrieved context, say provided information.`;

export function buildGroundedPrompt(
	question: string,
	chunks: RagChunkRecord[],
) {
	const context = chunks
		.map(
			(chunk, index) =>
				`[${index + 1}] ${chunk.title} (${chunk.sourceType}, section: ${chunk.section})\n${chunk.text}`,
		)
		.join("\n\n");

	return `${RAG_SYSTEM_PROMPT}

Provided information:
${context}

User question:
${question}

Answer using only the provided information.`;
}
