import { getRagConfig } from "./config";
import { generateAnswer, retrieveChunks } from "./retrieve";
import type { RagEnv } from "./types";

export const PORTFOLIO_RAG_MISSING_MESSAGE =
	"I don't have that information available.";

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

export async function runRagQuestion(question: string, env: RagEnv) {
	const config = getRagConfig(env);
	const retrieval = await retrieveChunks(question, env, config);

	if (retrieval.status !== "ready") {
		return {
			status: "missing",
			answer: PORTFOLIO_RAG_MISSING_MESSAGE,
			citations: [] as string[],
		};
	}

	const rawAnswer = await generateAnswer(
		question,
		retrieval.chunks,
		env,
		config,
	);
	let answer = rawAnswer;
	let citations = retrieval.citations.map((citation) => citation.id);

	if (typeof rawAnswer === "string") {
		try {
			const parsed = JSON.parse(rawAnswer) as {
				answer?: string;
				citations?: string[];
			};

			if (typeof parsed.answer === "string" && parsed.answer.trim()) {
				answer = parsed.answer.trim();
			}

			if (Array.isArray(parsed.citations)) {
				citations = parsed.citations.filter(
					(citation): citation is string => typeof citation === "string",
				);
			}
		} catch {
			answer = rawAnswer;
		}
	}

	return {
		status: answer ? "answered" : "missing",
		answer: answer || PORTFOLIO_RAG_MISSING_MESSAGE,
		citations,
	};
}
