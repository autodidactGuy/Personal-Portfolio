import type {
	ExperimentalAssistantChunk,
	ExperimentalAssistantMessage,
	RetrievalResult,
	RetrievedChunk,
} from "./types";

const MAX_CONTEXT_MESSAGES = 4;
const MAX_RESULTS = 6;

function normalizeText(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s]+/g, " ")
		.trim();
}

function tokenize(value: string) {
	return normalizeText(value).split(/\s+/).filter(Boolean);
}

function unique<T>(values: T[]) {
	return Array.from(new Set(values));
}

function clamp(value: number, min = 0, max = 1) {
	return Math.min(max, Math.max(min, value));
}

function buildKeywordSet(chunk: ExperimentalAssistantChunk) {
	return new Set(
		unique([
			...chunk.keywords,
			...tokenize(chunk.title),
			...(chunk.entities || []).flatMap((item) => tokenize(item)),
			...(chunk.tags || []).flatMap((item) => tokenize(item)),
		]),
	);
}

function cosineSimilarity(a: number[], b: number[]) {
	if (!a.length || !b.length || a.length !== b.length) {
		return 0;
	}

	let dot = 0;
	let magnitudeA = 0;
	let magnitudeB = 0;

	for (let index = 0; index < a.length; index += 1) {
		dot += a[index] * b[index];
		magnitudeA += a[index] * a[index];
		magnitudeB += b[index] * b[index];
	}

	if (!magnitudeA || !magnitudeB) {
		return 0;
	}

	return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

function buildTopicTags(query: string) {
	const normalized = normalizeText(query);
	const tags = new Set<string>();

	if (
		/\b(payment|payments|donation|ach|card|cards|crypto|stock|fintech|adyen)\b/.test(
			normalized,
		)
	) {
		tags.add("payments");
	}

	if (
		/\b(migration|migrate|etl|ingestion|records|deduplication)\b/.test(
			normalized,
		)
	) {
		tags.add("migration");
	}

	if (
		/\b(ai|llm|llms|prompt|prompts|model|evaluation|analytics|natural language)\b/.test(
			normalized,
		)
	) {
		tags.add("ai");
	}

	if (
		/\b(architecture|architected|service|services|microservices|distributed|event driven|design)\b/.test(
			normalized,
		)
	) {
		tags.add("architecture");
	}

	if (
		/\b(reliability|observability|retry|retries|fault tolerant|monitoring|logging)\b/.test(
			normalized,
		)
	) {
		tags.add("reliability");
	}

	if (
		/\b(data|dataset|datasets|pipeline|pipelines|query|queries)\b/.test(
			normalized,
		)
	) {
		tags.add("data");
	}

	if (
		/\b(aws|ecs|s3|lambda|dynamodb|ec2|kinesis|sqs|docker|cloudformation)\b/.test(
			normalized,
		)
	) {
		tags.add("cloud");
	}

	return tags;
}

function isConversationDependentQuestion(question: string) {
	const questionTokens = tokenize(question);

	return (
		questionTokens.length <= 4 ||
		questionTokens.every((token) =>
			[
				"he",
				"him",
				"his",
				"it",
				"its",
				"that",
				"those",
				"them",
				"there",
				"one",
				"ones",
				"this",
				"these",
			].includes(token),
		) ||
		/\b(it|that|those|them|one|ones|this|these)\b/i.test(question)
	);
}

function isCareerTimelineQuestion(question: string) {
	return [
		/\bwhen\b.*\bstart(ed|ing)?\b.*\bwork(ing)?\b/i,
		/\bwhen\b.*\bstart(ed|ing)?\b.*\bcareer\b/i,
		/\bwhen\b.*\bprofessional(ly)?\b/i,
		/\bfirst job\b/i,
		/\bearliest role\b/i,
		/\bbegan\b.*\bcareer\b/i,
	].some((pattern) => pattern.test(question));
}

function isContentTimelineQuestion(question: string) {
	return [
		/\bearly\b.*\b(project|projects|work|article|articles|post|posts|case study|case studies)\b/i,
		/\brecent\b.*\b(project|projects|work|article|articles|post|posts|case study|case studies)\b/i,
		/\blatest\b.*\b(project|projects|work|article|articles|post|posts|case study|case studies)\b/i,
		/\bnewest\b.*\b(project|projects|work|article|articles|post|posts|case study|case studies)\b/i,
		/\bfirst\b.*\b(project|projects|article|articles|post|posts|case study|case studies)\b/i,
		/\bearliest\b.*\b(project|projects|article|articles|post|posts|case study|case studies)\b/i,
	].some((pattern) => pattern.test(question));
}

function prefersEarliestContent(question: string) {
	return /\b(early|earlier|earliest|first)\b/i.test(question);
}

function prefersLatestContent(question: string) {
	return /\b(recent|latest|newest|current)\b/i.test(question);
}

function normalizeQuestionForRetrieval(question: string) {
	return tokenize(
		question
			.replace(/\bstarted\b/gi, "start")
			.replace(/\bstarting\b/gi, "start")
			.replace(/\bworked\b/gi, "work")
			.replace(/\bworking\b/gi, "work")
			.replace(/\bprofessionally\b/gi, "professional")
			.replace(/\bprofessionaly\b/gi, "professional")
			.replace(/\bbegan\b/gi, "start")
			.replace(/\brecent\b/gi, "latest")
			.replace(/\bnewest\b/gi, "latest")
			.replace(/\bearlier\b/gi, "early")
			.replace(/\bearliest\b/gi, "early"),
	);
}

function getChronologyPreference(query: string) {
	const normalized = normalizeText(query);

	if (
		/\b(latest|recent|most recent|current|currently|present|now)\b/.test(
			normalized,
		)
	) {
		return "recent";
	}

	if (
		/\b(first|early|earlier|oldest|before|previous|initial)\b/.test(normalized)
	) {
		return "early";
	}

	return "neutral";
}

function getChunkTimestamp(chunk: ExperimentalAssistantChunk) {
	const candidates = [chunk.date, chunk.to, chunk.from].filter(Boolean);

	for (const value of candidates) {
		const timestamp = Date.parse(value as string);

		if (!Number.isNaN(timestamp)) {
			return timestamp;
		}
	}

	return null;
}

function scoreChronology(
	query: string,
	chunk: ExperimentalAssistantChunk,
	allTimestamps: number[],
) {
	const preference = getChronologyPreference(query);

	if (preference === "neutral") {
		return chunk.isCurrent ? 0.2 : 0;
	}

	const chunkTimestamp = getChunkTimestamp(chunk);

	if (chunk.isCurrent && preference === "recent") {
		return 1;
	}

	if (chunkTimestamp === null || allTimestamps.length === 0) {
		return 0;
	}

	const min = Math.min(...allTimestamps);
	const max = Math.max(...allTimestamps);

	if (min === max) {
		return 0.5;
	}

	const normalized = (chunkTimestamp - min) / (max - min);

	return preference === "recent" ? normalized : 1 - normalized;
}

function scoreLexical(
	queryTokens: string[],
	chunk: ExperimentalAssistantChunk,
) {
	if (!queryTokens.length) {
		return 0;
	}

	const haystack = normalizeText(
		`${chunk.title} ${chunk.text} ${chunk.keywords.join(" ")}`,
	);
	const haystackTokens = new Set(tokenize(haystack));
	const overlapCount = queryTokens.filter((token) =>
		haystackTokens.has(token),
	).length;
	const exactPhraseBonus = haystack.includes(queryTokens.join(" ")) ? 0.15 : 0;

	return Math.min(1, overlapCount / queryTokens.length + exactPhraseBonus);
}

function scoreKeywordOverlap(
	queryTokens: string[],
	chunk: ExperimentalAssistantChunk,
) {
	const keywordSet = buildKeywordSet(chunk);

	return queryTokens.reduce((score, token) => {
		if (!keywordSet.has(token)) {
			return score;
		}

		return score + (chunk.title.toLowerCase().includes(token) ? 3 : 1);
	}, 0);
}

function countKeywordOverlap(
	queryTokens: string[],
	chunk: ExperimentalAssistantChunk,
) {
	const keywordSet = buildKeywordSet(chunk);
	return queryTokens.filter((token) => keywordSet.has(token)).length;
}

function scoreKeywords(
	queryTokens: string[],
	chunk: ExperimentalAssistantChunk,
) {
	if (!queryTokens.length || !chunk.keywords.length) {
		return 0;
	}

	const keywordSet = new Set(chunk.keywords.map((item) => normalizeText(item)));
	const overlapCount = queryTokens.filter((token) =>
		keywordSet.has(token),
	).length;

	return (
		overlapCount / Math.max(1, Math.min(queryTokens.length, keywordSet.size))
	);
}

function applyChunkIntentBoost(
	question: string,
	chunk: ExperimentalAssistantChunk,
) {
	if (isCareerTimelineQuestion(question) && chunk.category === "experience") {
		return 6;
	}

	if (
		isContentTimelineQuestion(question) &&
		["project", "article", "case-study"].includes(chunk.category)
	) {
		return 6;
	}

	if (/\bproject(s)?\b/i.test(question) && chunk.category === "project") {
		return 3;
	}

	if (
		/\b(article|articles|blog|blogs|post|posts|writing)\b/i.test(question) &&
		chunk.category === "article"
	) {
		return 3;
	}

	if (
		/\b(case study|case studies)\b/i.test(question) &&
		chunk.category === "case-study"
	) {
		return 3;
	}

	if (
		/\b(payment|payments|donation|ach|card|cards|crypto|stock|fintech|adyen)\b/i.test(
			question,
		) &&
		chunk.category === "experience"
	) {
		return 2;
	}

	if (
		/\b(contact|email|resume|github|linkedin|calendly)\b/i.test(question) &&
		(chunk.category === "contact" || chunk.category === "links")
	) {
		return 4;
	}

	if (
		/\b(summary|overview|background|who is|headline|strengths)\b/i.test(
			question,
		) &&
		(chunk.category === "summary" || chunk.category === "about")
	) {
		return 3;
	}

	if (
		/\b(company|role|work|experience|career|current|currently|overflow|amazon|scale)\b/i.test(
			question,
		) &&
		chunk.category === "experience"
	) {
		return 2;
	}

	if (
		(chunk.category === "summary" || chunk.category === "about") &&
		/\b(project|article|blog|case study|payment|payments|migration|ai|architecture|amazon|overflow|scale)\b/i.test(
			question,
		)
	) {
		return -2;
	}

	return 0;
}

function scoreTopics(
	queryTags: Set<string>,
	chunk: ExperimentalAssistantChunk,
) {
	if (!queryTags.size || !chunk.tags?.length) {
		return 0;
	}

	const chunkTags = new Set(chunk.tags.map((tag) => normalizeText(tag)));
	const overlapCount = Array.from(queryTags).filter((tag) =>
		chunkTags.has(normalizeText(tag)),
	).length;

	return overlapCount / Math.max(1, queryTags.size);
}

function scoreEntities(
	query: string,
	queryTokens: string[],
	chunk: ExperimentalAssistantChunk,
) {
	const normalizedQuery = normalizeText(query);
	const title = normalizeText(chunk.title);
	const entities = (chunk.entities || []).map((value) => normalizeText(value));

	let score = 0;

	for (const entity of [title, ...entities]) {
		if (!entity || entity.length < 3) {
			continue;
		}

		if (normalizedQuery.includes(entity)) {
			score = Math.max(score, entity === title ? 1 : 0.85);
			continue;
		}

		const entityTokens = entity.split(/\s+/).filter(Boolean);
		const matchedTokenCount = entityTokens.filter((token) =>
			queryTokens.includes(token),
		).length;

		if (entityTokens.length > 0) {
			score = Math.max(score, matchedTokenCount / entityTokens.length);
		}
	}

	return clamp(score);
}

function scoreLength(chunk: ExperimentalAssistantChunk) {
	const tokenCount = tokenize(chunk.text).length;

	if (!tokenCount) {
		return 0;
	}

	if (tokenCount <= 24) {
		return 1;
	}

	if (tokenCount <= 60) {
		return 0.8;
	}

	if (tokenCount <= 120) {
		return 0.5;
	}

	return 0.2;
}

function compareChunksForQuestion(
	question: string,
	a: { chunk: ExperimentalAssistantChunk; score: number },
	b: { chunk: ExperimentalAssistantChunk; score: number },
) {
	if (b.score !== a.score) {
		return b.score - a.score;
	}

	if (isCareerTimelineQuestion(question)) {
		const aIsExperience = a.chunk.category === "experience";
		const bIsExperience = b.chunk.category === "experience";

		if (aIsExperience !== bIsExperience) {
			return aIsExperience ? -1 : 1;
		}

		if (aIsExperience && bIsExperience) {
			const aStart = getChunkTimestamp({ ...a.chunk, date: a.chunk.from });
			const bStart = getChunkTimestamp({ ...b.chunk, date: b.chunk.from });

			if (aStart !== null && bStart !== null) {
				return aStart - bStart;
			}
		}
	}

	if (isContentTimelineQuestion(question)) {
		const aIsContent = ["project", "article", "case-study"].includes(
			a.chunk.category,
		);
		const bIsContent = ["project", "article", "case-study"].includes(
			b.chunk.category,
		);

		if (aIsContent !== bIsContent) {
			return aIsContent ? -1 : 1;
		}

		if (aIsContent && bIsContent) {
			const aDate = getChunkTimestamp(a.chunk);
			const bDate = getChunkTimestamp(b.chunk);

			if (aDate !== null && bDate !== null) {
				if (prefersEarliestContent(question)) {
					return aDate - bDate;
				}

				if (prefersLatestContent(question)) {
					return bDate - aDate;
				}
			}
		}
	}

	return a.chunk.title.localeCompare(b.chunk.title);
}

function applyDiversityPenalty(
	entries: RetrievedChunk[],
	candidate: RetrievedChunk,
	embeddings: number[][],
	chunks: ExperimentalAssistantChunk[],
) {
	let penalty = 0;

	for (const existing of entries) {
		const existingIndex = chunks.findIndex(
			(chunk) => chunk.id === existing.chunk.id,
		);
		const candidateIndex = chunks.findIndex(
			(chunk) => chunk.id === candidate.chunk.id,
		);

		if (existingIndex === -1 || candidateIndex === -1) {
			continue;
		}

		const similarity = cosineSimilarity(
			embeddings[existingIndex] || [],
			embeddings[candidateIndex] || [],
		);

		if (similarity > 0.92) {
			penalty = Math.max(penalty, 0.08);
		}
	}

	return penalty;
}

export function buildExperimentalRetrievalQuery(
	question: string,
	messages: ExperimentalAssistantMessage[],
) {
	const trimmedQuestion = question.trim();

	if (!trimmedQuestion) {
		return "";
	}

	const recentContext = messages
		.slice(-MAX_CONTEXT_MESSAGES)
		.map((message) => `${message.role}: ${message.content}`)
		.join("\n");

	if (!recentContext || !isConversationDependentQuestion(trimmedQuestion)) {
		return trimmedQuestion;
	}

	return `Conversation context:\n${recentContext}\n\nCurrent question: ${trimmedQuestion}`;
}

export function buildLocalGroundedAnswer(entries: RetrievedChunk[]) {
	if (!entries.length) {
		return {
			answer:
				"I couldn’t find a strong match in the generated portfolio corpus for that question.",
			citations: [] as string[],
		};
	}

	const topEntries = entries.slice(0, 3);
	const lines = topEntries.map(
		(entry) => `${entry.chunk.title}: ${entry.chunk.text}`,
	);

	return {
		answer: lines.join("\n\n"),
		citations: topEntries.map((entry) => entry.chunk.id),
	};
}

export function rankExperimentalChunks({
	query,
	chunks,
	embeddings,
	queryEmbedding,
}: {
	query: string;
	chunks: ExperimentalAssistantChunk[];
	embeddings: number[][];
	queryEmbedding?: number[] | null;
}): RetrievalResult {
	const queryTokens = unique(tokenize(query));
	const preferredTopics = buildTopicTags(query);
	const allTimestamps = chunks
		.map((chunk) => getChunkTimestamp(chunk))
		.filter((value): value is number => value !== null);
	const normalizedQuestionTokens = normalizeQuestionForRetrieval(query);

	const scored = chunks.map((chunk, index) => {
		const semantic = queryEmbedding
			? Math.max(0, cosineSimilarity(queryEmbedding, embeddings[index] || []))
			: 0;
		const lexical = scoreLexical(queryTokens, chunk);
		const keyword = scoreKeywords(queryTokens, chunk);
		const keywordOverlapScore = scoreKeywordOverlap(
			normalizedQuestionTokens,
			chunk,
		);
		const intent = applyChunkIntentBoost(query, chunk);
		const chronology = scoreChronology(query, chunk, allTimestamps);
		const topic = scoreTopics(preferredTopics, chunk);
		const entity = scoreEntities(query, queryTokens, chunk);
		const length = scoreLength(chunk);
		const exactQueryBoost = normalizeText(chunk.text).includes(
			normalizeText(query),
		)
			? 8
			: 0;
		const total =
			(queryEmbedding ? semantic : 0) +
			keywordOverlapScore +
			exactQueryBoost +
			intent +
			lexical +
			keyword +
			topic +
			entity +
			chronology * 0.5 +
			length * 0.25;

		return {
			chunk,
			score: total,
			breakdown: {
				semantic,
				lexical,
				keyword: keywordOverlapScore + keyword,
				intent,
				chronology,
				topic,
				entity,
				length,
				duplicatePenalty: 0,
				total,
			},
		};
	});

	const ranked = scored
		.filter((entry) =>
			queryEmbedding
				? entry.score > 0
				: entry.score > 0 ||
					countKeywordOverlap(normalizedQuestionTokens, entry.chunk) > 0,
		)
		.sort((a, b) => compareChunksForQuestion(query, a, b));
	const diversified: RetrievedChunk[] = [];

	for (const candidate of ranked) {
		if (diversified.length >= MAX_RESULTS) {
			break;
		}

		const duplicatePenalty = queryEmbedding
			? applyDiversityPenalty(diversified, candidate, embeddings, chunks)
			: 0;
		const adjustedScore = candidate.score - duplicatePenalty;

		diversified.push({
			...candidate,
			score: adjustedScore,
			breakdown: {
				...candidate.breakdown,
				duplicatePenalty,
				total: adjustedScore,
			},
		});
	}

	return {
		query,
		mode: queryEmbedding ? "hybrid" : "keywords",
		entries: diversified.sort((a, b) => b.score - a.score),
	};
}
