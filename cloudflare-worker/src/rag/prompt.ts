import type { RagChunkRecord } from "./types";

export const RAG_SYSTEM_PROMPT = `You are a portfolio assistant answering questions about one person's portfolio dataset.

Rules:
- Answer only from the retrieved context.
- If the retrieved context is insufficient, say so clearly.
- Do not invent projects, roles, employers, dates, claims, or links.
- Prefer concise, factual answers.
- If the answer is partial, say what is supported and what is missing.`;

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

Retrieved context:
${context}

User question:
${question}

Answer using only the retrieved context.`;
}
