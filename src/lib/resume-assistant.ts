import { z } from "zod";
import {
	getAssistantWorkerUrl as getResolvedAssistantWorkerUrl,
	publicEnv,
} from "@/config/public-env";
import { siteConfig, withBasePath } from "@/config/site";

export const GITHUB_MODELS_API_VERSION = "2026-03-10";
export const GITHUB_MODELS_CHAT_URL =
	"https://models.github.ai/inference/chat/completions";
export const GITHUB_MODELS_EMBEDDINGS_URL =
	"https://models.github.ai/inference/embeddings";
export const DEFAULT_EMBEDDING_MODEL =
	publicEnv.NEXT_PUBLIC_GITHUB_MODELS_EMBEDDING_MODEL;
export const RESPONSE_CACHE_PREFIX = "portfolio-assistant-embeddings";
export const EMBEDDINGS_CACHE_VERSION = "v2";
export const EMBEDDINGS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_CONTEXT_CHUNKS = 5;
export const MAX_BROAD_CONTEXT_CHUNKS = 24;
export const MAX_TARGETED_CONTEXT_CHUNKS = 8;
export const MAX_RETRIEVAL_CONTEXT_MESSAGES = 4;

export const MISSING_INFORMATION_MESSAGE =
	"I don't have that information available.";
export const UNRELATED_QUESTION_MESSAGE =
	"I can only answer questions based on the information available on this site.";

function inferAssistantStatusFromAnswer(answer: string) {
	const normalizedAnswer = String(answer || "").trim();

	if (normalizedAnswer === MISSING_INFORMATION_MESSAGE) {
		return "missing" as const;
	}

	if (normalizedAnswer === UNRELATED_QUESTION_MESSAGE) {
		return "rejected" as const;
	}

	return "answered" as const;
}

function isLikelyIncompleteAssistantAnswer(
	answer: string,
	citationCount: number,
) {
	const normalizedAnswer = String(answer || "").trim();

	if (!normalizedAnswer || citationCount > 0) {
		return false;
	}

	const wordCount = normalizedAnswer.split(/\s+/).filter(Boolean).length;

	return (
		wordCount <= 3 &&
		normalizedAnswer.length <= 40 &&
		!/[\n.?!:;]/.test(normalizedAnswer)
	);
}

export const SYSTEM_PROMPT = `You are a AI assistant answering questions about one person's portfolio dataset.

Rules:

* ONLY answer using provided resume data
* All the information revolves around a single person named Hassan Raza.
* If info is missing: ${MISSING_INFORMATION_MESSAGE}
* Do NOT hallucinate or guess
* ONLY answer about the person described in the provided resume data
* Allow small talks and try to understand slangs
* Reject unrelated questions

Tone:

* Professional
* Concise
* Friendly`;

export type ResumeExperience = {
	title: string;
	company: string;
	companyComments?: string;
	location: string;
	from: string;
	to: string;
	highlight: string;
	details?: string[];
	tech?: string[];
};

export type ResumeEducation = {
	degree: string;
	institute: string;
	location: string;
	from: string;
	to: string;
	result?: string;
};

export type ResumeProject = {
	slug: string;
	title: string;
	summary: string;
	tags?: string[];
	featured?: boolean;
	contentType?: string;
	excerpt?: string;
	url?: string;
	date?: string;
};

export type ResumeRecommendation = {
	name: string;
	role: string;
	relationship?: string;
	quote: string;
	highlight?: string;
	featured?: boolean;
	linkedin?: string;
	cta?: string;
};

export type ResumeStat = {
	label: string;
	value: string;
};

export type ResumePayload = {
	name: string;
	title: string;
	headline: string;
	summary: string;
	hero?: {
		eyebrow?: string;
		headline?: string;
		highlightedText?: string;
		supportingText?: string;
		primaryCta?: {
			label?: string;
			href?: string;
			external?: boolean;
		};
		secondaryCta?: {
			label?: string;
			href?: string;
			external?: boolean;
		};
	};
	about?: {
		label?: string;
		title?: string;
		description?: string;
		headline?: string;
		summary?: string;
		body?: string[];
	};
	featuredFocus?: {
		sectionLabel?: string;
		title?: string;
		summary?: string;
		pillars?: string[];
		cta?: {
			label?: string;
			href?: string;
		};
	};
	homeStats?: {
		title?: string;
		badgeLabel?: string;
		items?: ResumeStat[];
	};
	interests?: string[];
	skills?: string[];
	links?: Record<string, string>;
	contact?: {
		title?: string;
		description?: string;
		formHeading?: string;
		scheduleHeading?: string;
		quickLink?: {
			label?: string;
			href?: string;
		};
	};
	recommendations?: {
		title?: string;
		items?: ResumeRecommendation[];
	};
	experience?: ResumeExperience[];
	education?: ResumeEducation[];
	projects?: ResumeProject[];
	articles?: ResumeProject[];
	caseStudies?: ResumeProject[];
};

export type ResumeSnippet = {
	id: string;
	title: string;
	category:
		| "summary"
		| "about"
		| "skills"
		| "links"
		| "contact"
		| "hero"
		| "focus"
		| "stats"
		| "experience"
		| "education"
		| "project"
		| "article"
		| "case-study"
		| "recommendation";
	text: string;
	keywords: string[];
	url?: string;
};

export type GuardrailResult =
	| { allowed: true }
	| { allowed: false; message: string };

export type AssistantResponse = {
	status: "answered" | "missing" | "rejected";
	answer: string;
	citations: string[];
	rateLimited?: boolean;
	provider?: string | null;
	providerContext?: Array<{
		provider: string;
		status: number;
		error: string | null;
	}> | null;
};

export type AssistantDebugProvider =
	| "github-models"
	| "groq"
	| "groq_backup"
	| "huggingface"
	| "cloudflare"
	| "portfolio-rag";

export type AssistantChatRequestMessage = {
	role: "system" | "developer" | "user" | "assistant";
	content: string;
};

export type AssistantChatRequestBody = {
	action: "chat";
	model?: string;
	temperature: number;
	max_tokens: number;
	response_format?: {
		type: "json_schema";
		json_schema: {
			name: string;
			schema: Record<string, unknown>;
		};
	};
	messages: AssistantChatRequestMessage[];
};

export type AssistantInlineLinkMatch = {
	start: number;
	end: number;
	text: string;
	href: string;
	external: boolean;
};

export type RetrievalEntry = {
	snippet: ResumeSnippet;
	score: number;
};

export type RetrievalResult = {
	query: string;
	mode: "embeddings" | "keywords" | "semantic" | "hybrid";
	entries: RetrievalEntry[];
};

type SemanticRetrieveChunk = {
	id: string;
	sourceType: string;
	title: string;
	text: string;
	url?: string;
	slug?: string;
	section: string;
	score: number;
};

type SemanticRetrievePayload = {
	ok: boolean;
	status: "ready" | "no_match" | "insufficient_context" | "error";
	matched: number;
	chunks: SemanticRetrieveChunk[];
	error?: string;
};

const assistantResponseSchema = z.object({
	status: z.enum(["answered", "missing", "rejected"]),
	answer: z.string().trim().min(1),
	citations: z.array(z.string().trim()),
});

const REMOVED_ASSISTANT_CITATION_TOKEN = "__assistant_removed_citation__";

function isWordLikeCharacter(value: string | undefined) {
	return Boolean(value && /[A-Za-z0-9]/.test(value));
}

function cleanAssistantCitationSpacing(value: string) {
	return value
		.replace(
			new RegExp(
				`[ \\t]*\\([ \\t]*${REMOVED_ASSISTANT_CITATION_TOKEN}[ \\t]*\\)[ \\t]*`,
				"g",
			),
			" ",
		)
		.replace(
			new RegExp(`[ \\t]*${REMOVED_ASSISTANT_CITATION_TOKEN}[ \\t]*`, "g"),
			" ",
		)
		.replace(/[ \t]+([,.;:!?])/g, "$1")
		.replace(/([([])[ \t]+/g, "$1")
		.trim();
}

function replaceInlineCitationIdsWithTitles(
	answer: string,
	snippets: ResumeSnippet[],
) {
	if (!answer.trim() || !snippets.length) {
		return answer;
	}

	const snippetTitleById = new Map(
		snippets.map((snippet) => [snippet.id, snippet.title.trim()]),
	);
	const normalizeComparableText = (value: string) =>
		value
			.toLowerCase()
			.replace(/\*\*/g, "")
			.replace(/\*/g, "")
			.replace(/[\u2010-\u2015]/g, "-")
			.replace(/\s+/g, " ")
			.trim();

	return cleanAssistantCitationSpacing(
		answer.replace(
			/\[(rag:[^\]]+|summary|about|skills|links|contact|hero|focus|stats|experience:[^\]]+|education:[^\]]+|project:[^\]]+|article:[^\]]+|case-study:[^\]]+|recommendation:[^\]]+)\]/gi,
			(match, _citationId, offset) => {
				const start = typeof offset === "number" ? offset : 0;
				const citationId = match.slice(1, -1);
				const title = snippetTitleById.get(citationId);
				const previousChar = answer[start - 1];
				const nextChar = answer[start + match.length];

				if (!title) {
					return match;
				}

				const recentContext = answer.slice(Math.max(0, start - 240), start);
				const normalizedRecentContext = normalizeComparableText(recentContext);
				const normalizedTitle = normalizeComparableText(title);

				if (
					normalizedTitle &&
					normalizedRecentContext.includes(normalizedTitle)
				) {
					return REMOVED_ASSISTANT_CITATION_TOKEN;
				}

				return `${isWordLikeCharacter(previousChar) ? " " : ""}${title}${
					isWordLikeCharacter(nextChar) ? " " : ""
				}`;
			},
		),
	);
}

const blockedTopicPatterns = [
	/\bignore (all )?(previous|prior) instructions\b/i,
	/\bsystem prompt\b/i,
	/\bdeveloper message\b/i,
	/\bact as\b/i,
	/\bjailbreak\b/i,
	/\bweather\b/i,
	/\bstock(s)?\b/i,
	/\bbitcoin\b/i,
	/\bcrypto price\b/i,
	/\bsports?\b/i,
	/\brecipe\b/i,
	/\bmovie\b/i,
	/\bpolitic(s|al)?\b/i,
	/\belection\b/i,
	/\bmedical\b/i,
	/\bdiagnos(is|e)\b/i,
	/\blawyer\b/i,
	/\blegal advice\b/i,
	/\bhomework\b/i,
	/\bsolve\b.*\bmath\b/i,
	/\btranslate\b/i,
];

const unsupportedResumeScopePatterns = [
	/\brecent commits?\b/i,
	/\bgithub commits?\b/i,
	/\bpull requests?\b/i,
	/\bprs?\b/i,
	/\bbranches?\b/i,
	/\bissues?\b/i,
	/\bdeploy(ment|ments)?\b/i,
	/\bcommit history\b/i,
	/\brepository activity\b/i,
];

const SMALL_TALK_GREETING_PATTERN =
	/^(hi|hey|hello|howdy|greetings|hiya|yo|sup|what'?s up|good (morning|afternoon|evening|day))(?:[!.,?]+)?$/i;
const SMALL_TALK_FAREWELL_PATTERN =
	/^(bye|goodbye|see (you|ya)|take care|farewell|later|cya|catch (you|ya) later|have a (good|great|nice) (day|one))(?:[!.,?]+)?$/i;
const SMALL_TALK_THANKS_PATTERN =
	/^(thank(s| you)( so much| a lot| very much)?|thx|ty|cheers|appreciate (it|that|this)|many thanks)(?:[!.,?]+)?$/i;
const SMALL_TALK_WELLBEING_PATTERN =
	/^(how are (you|you doing|things|it going)|how('?s| is) (it going|everything|life|your day)|what'?s (new|going on|up with you)|how do you do|how have you been)(?:[!.,?]+)?$/i;
const SMALL_TALK_META_PATTERN =
	/^(who (are you|made you|built you|created you)|what are you|are you (a |an )?(ai|bot|robot|assistant|human)|are you real|are you alive|do you (think|feel|have feelings)|can you (think|feel)|you('?re| are) (a |an )?(ai|bot|robot|assistant))(?:[!.,?]+)?$/i;
const SMALL_TALK_CAPABILITY_PATTERN =
	/^(what can you (do|help (with|me)|tell me)|what do you know|what (are you|can you) (good at|capable of)|how can you help( me)?|what('?s| is) your purpose|what (topics|questions) can (i|you)|help( me)?|^\?+$)$/i;
const SMALL_TALK_POSITIVE_FEEDBACK_PATTERN =
	/^(that (was |is )?(helpful|useful|great|good|perfect|exactly what i needed|what i was looking for)|you('?re| are) (helpful|great|amazing|awesome|good)|this is (helpful|useful|great)|very (helpful|useful|clear|informative))(?:[!.,?]+)?$/i;

const smallTalkPatterns = [
	SMALL_TALK_GREETING_PATTERN,
	SMALL_TALK_FAREWELL_PATTERN,
	SMALL_TALK_THANKS_PATTERN,
	SMALL_TALK_WELLBEING_PATTERN,
	SMALL_TALK_META_PATTERN,
	SMALL_TALK_CAPABILITY_PATTERN,
	SMALL_TALK_POSITIVE_FEEDBACK_PATTERN,
	/^(nice|amazing|awesome|great|cool|wow|wonderful|excellent|fantastic|brilliant|perfect|love it|incredible|superb|impressive|good job|well done|that'?s (great|amazing|awesome|cool|nice|good))(?:[!.,?]+)?$/i,
	/^(ok|okay|got it|understood|sure|alright|noted|sounds good|makes sense|i see|i understand)(?:[!.,?]+)?$/i,
	/^(lol|haha|ha|hehe|😄|👍|🙏|❤️)(?:[!.,?]+)?$/i,
	/^(interesting|tell me more|go on|continue|really|no way|seriously|wow really|that'?s (interesting|cool|neat|wild))(?:[!.,?]+)?$/i,
	/^(yes|yeah|yep|yup|nope|no|nah|not really|maybe|possibly|perhaps|i (think|guess|suppose) so)(?:[!.,?]+)?$/i,
];

const builtInAllowedKeywords = [
	"resume",
	"portfolio",
	"link",
	"links",
	"social",
	"public",
	"experience",
	"yoe",
	"year",
	"years",
	"yr",
	"yrs",
	"worked",
	"work",
	"job",
	"career",
	"company",
	"companies",
	"role",
	"roles",
	"skills",
	"stack",
	"tech",
	"technology",
	"education",
	"degree",
	"school",
	"university",
	"project",
	"projects",
	"case study",
	"case studies",
	"blog",
	"blogs",
	"article",
	"articles",
	"writing",
	"recommendation",
	"recommendations",
	"testimonial",
	"testimonials",
	"stats",
	"metrics",
	"focus",
	"featured",
	"contact",
	"email",
	"github",
	"linkedin",
	"calendly",
	"about",
	"background",
	"summary",
	"location",
];

function normalizeText(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function tokenize(value: string) {
	return normalizeText(value)
		.split(/\s+/)
		.filter((token) => token.length > 1);
}

function normalizeSemanticSourceType(
	sourceType: string,
): ResumeSnippet["category"] {
	switch (sourceType) {
		case "summary":
		case "about":
		case "skills":
		case "links":
		case "contact":
		case "hero":
		case "focus":
		case "stats":
		case "experience":
		case "education":
		case "project":
		case "article":
		case "case-study":
		case "recommendation":
			return sourceType;
		default:
			return "about";
	}
}

function toSemanticResumeSnippet(chunk: SemanticRetrieveChunk): ResumeSnippet {
	return {
		id: `rag:${chunk.id}`,
		title: chunk.title,
		category: normalizeSemanticSourceType(chunk.sourceType),
		text: chunk.text,
		keywords: unique([
			...tokenize(chunk.title),
			...tokenize(chunk.text),
			...tokenize(chunk.section),
			...tokenize(chunk.slug || ""),
		]),
		url: chunk.url,
	};
}

function unique<T>(items: T[]) {
	return Array.from(new Set(items));
}

function buildKeywordSet(snippet: ResumeSnippet) {
	return new Set(unique([...snippet.keywords, ...tokenize(snippet.title)]));
}

function scoreKeywordOverlap(questionTokens: string[], snippet: ResumeSnippet) {
	const keywordSet = buildKeywordSet(snippet);

	return questionTokens.reduce((score, token) => {
		if (!keywordSet.has(token)) {
			return score;
		}

		return score + (snippet.title.toLowerCase().includes(token) ? 3 : 1);
	}, 0);
}

function countKeywordOverlap(questionTokens: string[], snippet: ResumeSnippet) {
	const keywordSet = buildKeywordSet(snippet);

	return questionTokens.filter((token) => keywordSet.has(token)).length;
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
		/\bearliest\b.*\b(job|role|work|company|experience)\b/i,
		/\bfirst\b.*\b(role|position|company|experience)\b/i,
		/\b(oldest|initial)\b.*\b(job|role|company|experience)\b/i,
		/\b(work|career|experience)\s+history\b/i,
		/\bprofessional\s+history\b/i,
		/\bearly career\b/i,
		/\bstart of\b.*\bcareer\b/i,
		/\bearliest role\b/i,
		/\bbegan\b.*\bcareer\b/i,
	].some((pattern) => pattern.test(question));
}

function isEducationQuestion(question: string) {
	return [
		/\beducation\b/i,
		/\bstud(y|ied|ies|ying)\b/i,
		/\bdegree\b/i,
		/\buniversity\b/i,
		/\bcollege\b/i,
		/\bschool\b/i,
		/\bacademic\b/i,
		/\bcomputer science\b/i,
	].some((pattern) => pattern.test(question));
}

function isRecommendationQuestion(question: string) {
	return [
		/\brecommendation(s)?\b/i,
		/\btestimonial(s)?\b/i,
		/\bendorsement(s)?\b/i,
		/\breferences?\b/i,
		/\bwhat do .* say about\b/i,
		/\bsay\b/i,
		/\bwho is .*\b/i,
	].some((pattern) => pattern.test(question));
}

function isContactQuestion(question: string) {
	return [
		/\bcontact\b/i,
		/\breach\b/i,
		/\bemail\b/i,
		/\bphone\b/i,
		/\bbook\b/i,
		/\bschedule\b/i,
		/\bcalendly\b/i,
		/\blinkedin\b/i,
		/\bgithub\b/i,
		/\bwebsite\b/i,
	].some((pattern) => pattern.test(question));
}

function prefersLatestCareer(question: string) {
	return /\b(latest|recent|newest|current|present)\b/i.test(question);
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

function isDirectContentListingQuestion(question: string) {
	return [
		/\blist\b.*\b(project|projects|blog|blogs|article|articles|post|posts|case study|case studies)\b/i,
		/\bshow\b.*\b(project|projects|blog|blogs|article|articles|post|posts|case study|case studies)\b/i,
		/\bwhat\b.*\b(project|projects|blog|blogs|article|articles|post|posts|case study|case studies)\b/i,
		/\bwhich\b.*\b(project|projects|blog|blogs|article|articles|post|posts|case study|case studies)\b/i,
		/\bportfolio\b.*\b(work|projects|articles|writing)\b/i,
		/\b(work|things)\b.*\b(built|made|wrote|published)\b/i,
	].some((pattern) => pattern.test(question));
}

function isEnumerativeQuestion(question: string) {
	return [
		/\blist\b/i,
		/\bshow\b/i,
		/\bchronological\b/i,
		/\btimeline\b/i,
		/\bin order\b/i,
		/\bexperience\b.*\border\b/i,
		/\bproject(s)?\b/i,
		/\barticle(s)?\b/i,
		/\bblog(s)?\b/i,
		/\bpost(s)?\b/i,
		/\bcase stud(y|ies)\b/i,
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
			.replace(/\byoe\b/gi, "years experience")
			.replace(/\byrs\b/gi, "years")
			.replace(/\byr\b/gi, "year")
			.replace(/\bsocial links?\b/gi, "github linkedin links")
			.replace(/\bpublic links?\b/gi, "github linkedin resume site links")
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
			.replace(/\bearliest\b/gi, "early")
			.replace(/\bblogs?\b/gi, "article")
			.replace(/\bposts?\b/gi, "article")
			.replace(/\bwriting\b/gi, "article")
			.replace(/\bbuilt\b/gi, "project")
			.replace(/\bmade\b/gi, "project")
			.replace(/\bportfolio\b/gi, "project"),
	);
}

function sentenceCaseJoin(items: string[]) {
	return items.filter(Boolean).join(" ");
}

function formatList(items: string[], maxItems = 6) {
	const visibleItems = unique(items.filter(Boolean)).slice(0, maxItems);

	if (visibleItems.length <= 1) {
		return visibleItems[0] || "";
	}

	if (visibleItems.length === 2) {
		return `${visibleItems[0]} and ${visibleItems[1]}`;
	}

	return `${visibleItems.slice(0, -1).join(", ")}, and ${visibleItems.at(-1)}`;
}

function possessiveName(name: string) {
	return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function takeFirstSentence(value: string) {
	const trimmedValue = value.trim();

	if (!trimmedValue) {
		return "";
	}

	const match = trimmedValue.match(/^[^.!?]+[.!?]?/);

	return (match?.[0] || trimmedValue).trim();
}

function parseMonthYear(value: string) {
	const trimmedValue = value.trim();

	if (!trimmedValue) {
		return null;
	}

	const match = trimmedValue.match(/^([A-Za-z]{3,9}),\s*(\d{4})$/);

	if (!match) {
		return null;
	}

	const monthName = match[1].toLowerCase();
	const year = Number(match[2]);
	const monthMap: Record<string, number> = {
		jan: 0,
		january: 0,
		feb: 1,
		february: 1,
		mar: 2,
		march: 2,
		apr: 3,
		april: 3,
		may: 4,
		jun: 5,
		june: 5,
		jul: 6,
		july: 6,
		aug: 7,
		august: 7,
		sep: 8,
		sept: 8,
		september: 8,
		oct: 9,
		october: 9,
		nov: 10,
		november: 10,
		dec: 11,
		december: 11,
	};
	const month = monthMap[monthName];

	if (month === undefined || Number.isNaN(year)) {
		return null;
	}

	return new Date(Date.UTC(year, month, 1));
}

function extractSnippetStartDate(snippet: ResumeSnippet) {
	const match = snippet.text.match(/([A-Za-z]{3,9},\s*\d{4})\s+to\s+/i);

	if (!match) {
		return null;
	}

	return parseMonthYear(match[1]);
}

function extractSnippetContentDate(snippet: ResumeSnippet) {
	const match = snippet.text.match(
		/Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}(?:T[^.\s]+(?:\.\d+Z)?)?)/i,
	);

	if (!match) {
		return null;
	}

	const date = new Date(match[1]);

	return Number.isNaN(date.getTime()) ? null : date;
}

function sortExperienceByStartDate(experience: ResumeExperience[] = []) {
	return [...experience].sort((a, b) => {
		const aStart = parseMonthYear(a.from);
		const bStart = parseMonthYear(b.from);

		if (aStart && bStart) {
			return aStart.getTime() - bStart.getTime();
		}

		if (aStart) {
			return -1;
		}

		if (bStart) {
			return 1;
		}

		return a.company.localeCompare(b.company);
	});
}

export function isBroadProfileQuestion(question: string) {
	return (
		/\b(who is|tell me more|more about|background|overview|summary|introduce)\b/i.test(
			question,
		) ||
		new RegExp(`\\babout\\b.*\\b(${siteConfig.name}|him|his)\\b`, "i").test(
			question,
		)
	);
}

function applySnippetIntentBoost(question: string, snippet: ResumeSnippet) {
	if (isCareerTimelineQuestion(question) && snippet.category === "experience") {
		return 10;
	}

	if (isEducationQuestion(question) && snippet.category === "education") {
		return 8;
	}

	if (
		isRecommendationQuestion(question) &&
		snippet.category === "recommendation"
	) {
		return 8;
	}

	if (
		isContactQuestion(question) &&
		["links", "contact"].includes(snippet.category)
	) {
		return 8;
	}

	if (
		isContentTimelineQuestion(question) &&
		["project", "article", "case-study"].includes(snippet.category)
	) {
		return 6;
	}

	if (/\bproject(s)?\b/i.test(question) && snippet.category === "project") {
		return 3;
	}

	if (
		/\b(article|articles|blog|blogs|post|posts|writing)\b/i.test(question) &&
		snippet.category === "article"
	) {
		return 3;
	}

	if (
		/\b(case study|case studies)\b/i.test(question) &&
		snippet.category === "case-study"
	) {
		return 3;
	}

	if (isBroadProfileQuestion(question)) {
		if (snippet.category === "about") {
			return 12;
		}

		if (snippet.category === "summary") {
			return 10;
		}

		if (snippet.category === "experience") {
			return 8;
		}

		if (snippet.category === "recommendation") {
			return -3;
		}
	}

	if (
		snippet.category === "recommendation" &&
		!isRecommendationQuestion(question)
	) {
		return -1;
	}

	return 0;
}

function compareSnippetsForQuestion(
	question: string,
	a: { snippet: ResumeSnippet; score: number },
	b: { snippet: ResumeSnippet; score: number },
) {
	if (b.score !== a.score) {
		return b.score - a.score;
	}

	if (isCareerTimelineQuestion(question)) {
		const aIsExperience = a.snippet.category === "experience";
		const bIsExperience = b.snippet.category === "experience";

		if (aIsExperience !== bIsExperience) {
			return aIsExperience ? -1 : 1;
		}

		if (aIsExperience && bIsExperience) {
			const aStart = extractSnippetStartDate(a.snippet);
			const bStart = extractSnippetStartDate(b.snippet);

			if (aStart && bStart) {
				if (prefersLatestCareer(question)) {
					return bStart.getTime() - aStart.getTime();
				}

				return aStart.getTime() - bStart.getTime();
			}
		}
	}

	if (isContentTimelineQuestion(question)) {
		const aIsContent = ["project", "article", "case-study"].includes(
			a.snippet.category,
		);
		const bIsContent = ["project", "article", "case-study"].includes(
			b.snippet.category,
		);

		if (aIsContent !== bIsContent) {
			return aIsContent ? -1 : 1;
		}

		if (aIsContent && bIsContent) {
			const aDate = extractSnippetContentDate(a.snippet);
			const bDate = extractSnippetContentDate(b.snippet);

			if (aDate && bDate) {
				if (prefersEarliestContent(question)) {
					return aDate.getTime() - bDate.getTime();
				}

				if (prefersLatestContent(question)) {
					return bDate.getTime() - aDate.getTime();
				}
			}
		}
	}

	if (!isRecommendationQuestion(question)) {
		const aIsRecommendation = a.snippet.category === "recommendation";
		const bIsRecommendation = b.snippet.category === "recommendation";

		if (aIsRecommendation !== bIsRecommendation) {
			return aIsRecommendation ? 1 : -1;
		}
	}

	return a.snippet.title.localeCompare(b.snippet.title);
}

function topRepeatedValues(items: string[], maxItems = 8) {
	const counts = new Map<string, number>();

	for (const item of items) {
		const trimmedItem = item.trim();

		if (!trimmedItem) {
			continue;
		}

		counts.set(trimmedItem, (counts.get(trimmedItem) || 0) + 1);
	}

	return Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, maxItems)
		.map(([item]) => item);
}

function findSnippetById(snippets: ResumeSnippet[], id: string) {
	return snippets.find((snippet) => snippet.id === id);
}

function findExperienceSnippetByCompany(
	snippets: ResumeSnippet[],
	companyName: string,
) {
	return snippets.find(
		(snippet) =>
			snippet.category === "experience" &&
			normalizeText(snippet.title).includes(normalizeText(companyName)),
	);
}

function hasQuestionMatch(question: string, patterns: RegExp[]) {
	return patterns.some((pattern) => pattern.test(question));
}

function isSmallTalk(question: string) {
	const trimmed = question.trim();
	return smallTalkPatterns.some((pattern) => pattern.test(trimmed));
}

export function buildResumeSnippets(resume: ResumePayload): ResumeSnippet[] {
	const snippets: ResumeSnippet[] = [];

	snippets.push({
		id: "summary",
		title: "Professional Summary",
		category: "summary",
		text: [
			`${resume.name} is a ${resume.title}.`,
			resume.headline,
			resume.summary,
			resume.interests?.length
				? `Core interests: ${resume.interests.join(", ")}.`
				: "",
		]
			.filter(Boolean)
			.join(" "),
		keywords: unique([
			...tokenize(resume.name),
			...tokenize(resume.title),
			...tokenize(resume.headline),
			...tokenize(resume.summary),
			...(resume.interests || []).flatMap((item) => tokenize(item)),
		]),
	});

	if (resume.about) {
		snippets.push({
			id: "about",
			title: resume.about.title || `About ${resume.name || "This Person"}`,
			category: "about",
			text: [
				resume.about.description || "",
				resume.about.headline || "",
				resume.about.summary || "",
				...(resume.about.body || []),
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique([
				...tokenize(resume.about.title || ""),
				...tokenize(resume.about.description || ""),
				...tokenize(resume.about.headline || ""),
				...tokenize(resume.about.summary || ""),
				...(resume.about.body || []).flatMap((item) => tokenize(item)),
			]),
		});
	}

	if (resume.hero) {
		snippets.push({
			id: "hero",
			title: "Homepage Hero",
			category: "hero",
			text: [
				resume.hero.eyebrow || "",
				resume.hero.headline || "",
				resume.hero.highlightedText || "",
				resume.hero.supportingText || "",
				resume.hero.primaryCta?.label
					? `Primary CTA: ${resume.hero.primaryCta.label} (${resume.hero.primaryCta.href || ""}).`
					: "",
				resume.hero.secondaryCta?.label
					? `Secondary CTA: ${resume.hero.secondaryCta.label} (${resume.hero.secondaryCta.href || ""}).`
					: "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique(
				tokenize(
					[
						resume.hero.eyebrow,
						resume.hero.headline,
						resume.hero.highlightedText,
						resume.hero.supportingText,
						resume.hero.primaryCta?.label,
						resume.hero.secondaryCta?.label,
					]
						.filter(Boolean)
						.join(" "),
				),
			),
		});
	}

	if (resume.featuredFocus) {
		snippets.push({
			id: "featured-focus",
			title: resume.featuredFocus.title || "Featured Focus",
			category: "focus",
			text: [
				resume.featuredFocus.sectionLabel || "",
				resume.featuredFocus.summary || "",
				...(resume.featuredFocus.pillars || []),
				resume.featuredFocus.cta?.label
					? `CTA: ${resume.featuredFocus.cta.label} (${resume.featuredFocus.cta.href || ""}).`
					: "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique(
				tokenize(
					[
						resume.featuredFocus.sectionLabel,
						resume.featuredFocus.title,
						resume.featuredFocus.summary,
						...(resume.featuredFocus.pillars || []),
						resume.featuredFocus.cta?.label,
					]
						.filter(Boolean)
						.join(" "),
				),
			),
		});
	}

	if (resume.homeStats?.items?.length) {
		snippets.push({
			id: "home-stats",
			title: resume.homeStats.title || "Homepage Stats",
			category: "stats",
			text: [
				resume.homeStats.badgeLabel || "",
				...(resume.homeStats.items || []).map(
					(item) => `${item.label}: ${item.value}.`,
				),
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique([
				...tokenize(resume.homeStats.title || ""),
				...tokenize(resume.homeStats.badgeLabel || ""),
				...(resume.homeStats.items || []).flatMap((item) =>
					tokenize(`${item.label} ${item.value}`),
				),
			]),
		});
	}

	if (resume.skills?.length) {
		snippets.push({
			id: "skills",
			title: "Skills and Technologies",
			category: "skills",
			text: `Skills: ${resume.skills.join(", ")}.`,
			keywords: unique(resume.skills.flatMap((item) => tokenize(item))),
		});
	}

	if (resume.links) {
		const linkPairs = Object.entries(resume.links).filter(([, value]) =>
			Boolean(value),
		);
		snippets.push({
			id: "links",
			title: "Public Links",
			category: "links",
			text: linkPairs.map(([label, value]) => `${label}: ${value}`).join(". "),
			keywords: unique(
				linkPairs.flatMap(([label, value]) => tokenize(`${label} ${value}`)),
			),
		});
	}

	if (resume.contact) {
		snippets.push({
			id: "contact",
			title: "Contact Information",
			category: "contact",
			text: [
				resume.contact.title || "",
				resume.contact.description || "",
				resume.contact.formHeading || "",
				resume.contact.scheduleHeading || "",
				resume.contact.quickLink?.label
					? `${resume.contact.quickLink.label}: ${resume.contact.quickLink.href || ""}`
					: "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique(
				tokenize(
					[
						resume.contact.title,
						resume.contact.description,
						resume.contact.formHeading,
						resume.contact.scheduleHeading,
						resume.contact.quickLink?.label,
						resume.contact.quickLink?.href,
					]
						.filter(Boolean)
						.join(" "),
				),
			),
		});
	}

	for (const item of resume.experience || []) {
		snippets.push({
			id: `experience:${item.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
			title: `${item.title} at ${item.company}`,
			category: "experience",
			text: [
				`${item.title} at ${item.company}${item.companyComments ? ` (${item.companyComments})` : ""}.`,
				`${item.from} to ${item.to}.`,
				item.location,
				item.highlight,
				...(item.details || []),
				item.tech?.length ? `Tech: ${item.tech.join(", ")}.` : "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique([
				...tokenize(item.title),
				...tokenize(item.company),
				...tokenize(item.companyComments || ""),
				...tokenize(item.location),
				...tokenize(item.from),
				...tokenize(item.to),
				...tokenize(item.highlight),
				...(item.details || []).flatMap((detail) => tokenize(detail)),
				...(item.tech || []).flatMap((tech) => tokenize(tech)),
				"experience",
				"work",
				"worked",
				"working",
				"job",
				"jobs",
				"role",
				"career",
				"employment",
				"professional",
				"professionally",
				"timeline",
				"start",
				"started",
				"began",
			]),
		});
	}

	for (const item of resume.education || []) {
		snippets.push({
			id: `education:${item.institute.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
			title: `${item.degree} at ${item.institute}`,
			category: "education",
			text: [
				`${item.degree} at ${item.institute}.`,
				`${item.from} to ${item.to}.`,
				item.location,
				item.result ? `Result: ${item.result}.` : "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique([
				...tokenize(item.degree),
				...tokenize(item.institute),
				...tokenize(item.location),
				...tokenize(item.result || ""),
			]),
		});
	}

	for (const item of resume.projects || []) {
		snippets.push({
			id: `project:${item.slug}`,
			title: item.title,
			category: "project",
			text: [
				item.title,
				item.summary,
				item.excerpt || "",
				item.tags?.length ? `Tags: ${item.tags.join(", ")}.` : "",
				item.date ? `Date: ${item.date}.` : "",
				item.url ? `URL: ${item.url}` : "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique([
				...tokenize(item.title),
				...tokenize(item.summary),
				...tokenize(item.excerpt || ""),
				...(item.tags || []).flatMap((tag) => tokenize(tag)),
				...tokenize(item.date || ""),
				"project",
				"projects",
				"portfolio",
				"work",
				"early",
				"recent",
				"latest",
				"first",
			]),
			url: item.url,
		});
	}

	for (const item of resume.caseStudies || []) {
		snippets.push({
			id: `case-study:${item.slug}`,
			title: item.title,
			category: "case-study",
			text: [
				item.title,
				item.summary,
				item.excerpt || "",
				item.tags?.length ? `Tags: ${item.tags.join(", ")}.` : "",
				item.date ? `Date: ${item.date}.` : "",
				item.url ? `URL: ${item.url}` : "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique([
				...tokenize(item.title),
				...tokenize(item.summary),
				...tokenize(item.excerpt || ""),
				...(item.tags || []).flatMap((tag) => tokenize(tag)),
				...tokenize(item.date || ""),
				"case",
				"study",
				"early",
				"recent",
				"latest",
				"first",
			]),
			url: item.url,
		});
	}

	for (const item of resume.articles || []) {
		snippets.push({
			id: `article:${item.slug}`,
			title: item.title,
			category: "article",
			text: [
				item.title,
				item.summary,
				item.excerpt || "",
				item.tags?.length ? `Tags: ${item.tags.join(", ")}.` : "",
				item.date ? `Date: ${item.date}.` : "",
				item.url ? `URL: ${item.url}` : "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique([
				...tokenize(item.title),
				...tokenize(item.summary),
				...tokenize(item.excerpt || ""),
				...(item.tags || []).flatMap((tag) => tokenize(tag)),
				...tokenize(item.date || ""),
				"blog",
				"article",
				"writing",
				"post",
				"posts",
				"early",
				"recent",
				"latest",
				"first",
			]),
			url: item.url,
		});
	}

	for (const item of resume.recommendations?.items || []) {
		snippets.push({
			id: `recommendation:${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
			title: `Recommendation from ${item.name}`,
			category: "recommendation",
			text: [
				item.name,
				item.role,
				item.relationship || "",
				item.highlight || "",
				item.quote,
				item.linkedin ? `LinkedIn: ${item.linkedin}` : "",
				item.cta ? `Link: ${item.cta}` : "",
			]
				.filter(Boolean)
				.join(" "),
			keywords: unique(
				tokenize(
					[item.name, item.role, item.relationship, item.highlight, item.quote]
						.filter(Boolean)
						.join(" "),
				),
			),
		});
	}

	return snippets;
}

export function resolveResumeSnippetCitations(
	citationIds: string[],
	snippets: ResumeSnippet[],
) {
	if (!citationIds.length || !snippets.length) {
		return [];
	}

	const citationIdSet = new Set(citationIds);

	return snippets.filter((snippet) => citationIdSet.has(snippet.id));
}

function isSiteOrigin(url: URL) {
	return url.origin === new URL(siteConfig.siteUrl).origin;
}

export function getSnippetHref(snippet: Pick<ResumeSnippet, "url">) {
	if (!snippet.url) {
		return null;
	}

	try {
		const parsedUrl = new URL(snippet.url);

		if (isSiteOrigin(parsedUrl)) {
			return withBasePath(
				`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
			);
		}

		return parsedUrl.toString();
	} catch {
		return snippet.url.startsWith("/")
			? withBasePath(snippet.url)
			: snippet.url;
	}
}

export function isExternalAssistantLink(href: string) {
	try {
		return !isSiteOrigin(new URL(href, siteConfig.siteUrl));
	} catch {
		return /^https?:\/\//i.test(href);
	}
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function trimTrailingPunctuation(value: string) {
	return value.replace(/[),.;:!?]+$/g, "");
}

function normalizeLinkLabel(value: string) {
	return value.trim().replace(/\s+/g, " ");
}

function createInlineLinkMatch(
	content: string,
	matchText: string,
	href: string,
): AssistantInlineLinkMatch | null {
	const normalizedText = normalizeLinkLabel(matchText);

	if (!normalizedText) {
		return null;
	}

	const pattern = new RegExp(`\\b${escapeRegExp(normalizedText)}\\b`, "i");
	const match = pattern.exec(content);

	if (!match || match.index < 0) {
		return null;
	}

	return {
		start: match.index,
		end: match.index + match[0].length,
		text: match[0],
		href,
		external: isExternalAssistantLink(href),
	};
}

function buildCitationTextCandidates(
	citation: ResumeSnippet,
	resume?: ResumePayload | null,
) {
	const matches = new Map<string, string>();

	const addMatch = (text: string, href: string | null) => {
		const normalizedText = trimTrailingPunctuation(text.trim());

		if (!normalizedText || !href) {
			return;
		}

		matches.set(normalizedText, href);
	};

	const href = getSnippetHref(citation);
	addMatch(citation.title, href);

	if (citation.category === "links" && resume?.links) {
		for (const [label, value] of Object.entries(resume.links)) {
			if (!value) {
				continue;
			}

			const resolvedHref =
				getSnippetHref({ url: value } satisfies Pick<ResumeSnippet, "url">) ||
				value;
			addMatch(label, resolvedHref);
			addMatch(value, resolvedHref);
			addMatch(value.replace(/^https?:\/\//i, ""), resolvedHref);

			try {
				const parsedUrl = new URL(value, siteConfig.siteUrl);
				addMatch(parsedUrl.hostname.replace(/^www\./, ""), resolvedHref);
			} catch {
				// Ignore malformed configured links.
			}
		}
	}

	if (citation.category === "contact" && resume?.contact?.quickLink) {
		const resolvedHref =
			getSnippetHref({
				url: resume.contact.quickLink.href,
			} satisfies Pick<ResumeSnippet, "url">) || resume.contact.quickLink.href;
		addMatch(resume.contact.quickLink.label || "", resolvedHref || null);
		addMatch(resume.contact.quickLink.href || "", resolvedHref || null);
	}

	if (citation.url) {
		addMatch(citation.url, href);
		addMatch(citation.url.replace(/^https?:\/\//i, ""), href);

		try {
			const parsedUrl = new URL(citation.url, siteConfig.siteUrl);
			addMatch(parsedUrl.hostname.replace(/^www\./, ""), href);
		} catch {
			// Ignore malformed citation URLs.
		}
	}

	return Array.from(matches.entries())
		.sort((a, b) => b[0].length - a[0].length)
		.map(([text, resolvedHref]) => ({ text, href: resolvedHref }));
}

export function findAssistantInlineLinkMatches(args: {
	content: string;
	citations?: ResumeSnippet[];
	resume?: ResumePayload | null;
}) {
	const { content, citations = [], resume } = args;
	const matches: AssistantInlineLinkMatch[] = [];
	const usedRanges: Array<{ start: number; end: number }> = [];

	const canUseRange = (start: number, end: number) =>
		usedRanges.every((range) => end <= range.start || start >= range.end);

	const addMatch = (match: AssistantInlineLinkMatch | null) => {
		if (!match || !canUseRange(match.start, match.end)) {
			return;
		}

		matches.push(match);
		usedRanges.push({ start: match.start, end: match.end });
		usedRanges.sort((a, b) => a.start - b.start);
	};

	const urlPattern = /https?:\/\/[^\s)]+/gi;
	let rawMatch: RegExpExecArray | null = urlPattern.exec(content);

	while (rawMatch) {
		const text = trimTrailingPunctuation(rawMatch[0] || "");

		if (!text) {
			rawMatch = urlPattern.exec(content);
			continue;
		}

		const start = rawMatch.index ?? -1;

		if (start < 0) {
			rawMatch = urlPattern.exec(content);
			continue;
		}

		addMatch({
			start,
			end: start + text.length,
			text,
			href: text,
			external: isExternalAssistantLink(text),
		});

		rawMatch = urlPattern.exec(content);
	}

	for (const citation of citations) {
		for (const candidate of buildCitationTextCandidates(citation, resume)) {
			addMatch(createInlineLinkMatch(content, candidate.text, candidate.href));
		}
	}

	return matches.sort((a, b) => a.start - b.start);
}

export function checkQuestionGuardrails(
	question: string,
	snippets: ResumeSnippet[],
	hasConversationContext: boolean,
): GuardrailResult {
	const normalizedQuestion = question.trim();

	if (!normalizedQuestion) {
		return {
			allowed: false,
			message: `Ask a question about ${snippets[0]?.title || "the person"}, including background, experience, skills, projects, case studies, or contact details.`,
		};
	}

	if (
		blockedTopicPatterns.some((pattern) => pattern.test(normalizedQuestion))
	) {
		return {
			allowed: false,
			message: UNRELATED_QUESTION_MESSAGE,
		};
	}

	if (isSmallTalk(normalizedQuestion)) {
		return { allowed: true };
	}

	const tokens = tokenize(normalizedQuestion);
	const allowedKeywords = new Set([
		...builtInAllowedKeywords,
		...snippets.flatMap((snippet) => snippet.keywords),
	]);
	const overlapCount = tokens.filter((token) =>
		allowedKeywords.has(token),
	).length;
	const pronounOnlyQuestion =
		hasConversationContext &&
		tokens.length > 0 &&
		tokens.every((token) =>
			["he", "him", "his", "that", "those", "them", "there"].includes(token),
		);

	if (overlapCount > 0 || pronounOnlyQuestion) {
		return { allowed: true };
	}

	return {
		allowed: false,
		message: UNRELATED_QUESTION_MESSAGE,
	};
}

export function buildRetrievalQuery(args: {
	question: string;
	recentMessages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
}) {
	const { question, recentMessages } = args;
	const trimmedQuestion = question.trim();

	if (!trimmedQuestion) {
		return "";
	}

	const usableRecentMessages = recentMessages
		.filter((message) => message.content.trim())
		.slice(-MAX_RETRIEVAL_CONTEXT_MESSAGES);

	if (
		usableRecentMessages.length === 0 ||
		!isConversationDependentQuestion(trimmedQuestion)
	) {
		return trimmedQuestion;
	}

	const conversationSummary = usableRecentMessages
		.map((message) => `${message.role}: ${message.content}`)
		.join("\n");

	return `Conversation context:\n${conversationSummary}\n\nCurrent question: ${trimmedQuestion}`;
}

function compactRetrievalQuestion(question: string, maxLength = 2000) {
	const trimmedQuestion = question.trim();

	if (trimmedQuestion.length <= maxLength) {
		return trimmedQuestion;
	}

	const normalizedTokens = normalizeQuestionForRetrieval(trimmedQuestion);
	const condensedQuestion = unique(normalizedTokens).join(" ").trim();

	if (condensedQuestion && condensedQuestion.length <= maxLength) {
		return condensedQuestion;
	}

	if (condensedQuestion) {
		return condensedQuestion.slice(0, maxLength).trim();
	}

	return trimmedQuestion.slice(0, maxLength).trim();
}

export function rankSnippetEntriesByKeywords(
	query: string,
	snippets: ResumeSnippet[],
	limit = MAX_CONTEXT_CHUNKS,
) {
	const questionTokens = normalizeQuestionForRetrieval(query);

	return [...snippets]
		.map((snippet) => ({
			snippet,
			score:
				scoreKeywordOverlap(questionTokens, snippet) +
				(normalizeText(snippet.text).includes(normalizeText(query)) ? 8 : 0) +
				applySnippetIntentBoost(query, snippet),
		}))
		.filter((entry) => entry.score > 0)
		.sort((a, b) => compareSnippetsForQuestion(query, a, b))
		.slice(0, limit);
}

export function rankSnippetsByKeywords(
	query: string,
	snippets: ResumeSnippet[],
	limit = MAX_CONTEXT_CHUNKS,
) {
	return rankSnippetEntriesByKeywords(query, snippets, limit).map(
		(entry) => entry.snippet,
	);
}

export function generateLocalResumeAnswer(
	question: string,
	resume: ResumePayload,
	snippets: ResumeSnippet[],
): AssistantResponse | null {
	const normalizedQuestion = question.trim().toLowerCase();
	const personName = resume.name || "This person";
	const personPossessiveName = possessiveName(personName);

	if (!normalizedQuestion) {
		return null;
	}

	if (hasQuestionMatch(normalizedQuestion, unsupportedResumeScopePatterns)) {
		return {
			status: "missing",
			answer: MISSING_INFORMATION_MESSAGE,
			citations: [],
		};
	}

	const smallTalkResponse = generateLocalSmallTalkAnswer(question, resume);

	if (smallTalkResponse) {
		return smallTalkResponse;
	}

	if (
		isBroadProfileQuestion(question) ||
		hasQuestionMatch(normalizedQuestion, [
			/\bwho is\b/i,
			/\bwho's\b/i,
			/\btell me about\b/i,
			/\bwhat does\b.*\bdo\b/i,
			/\bintroduce\b/i,
		])
	) {
		const currentExperience = resume.experience?.find(
			(item) => item.to.toLowerCase() === "present",
		);
		const citedIds = unique([
			"summary",
			"about",
			...(currentExperience
				? [
						findExperienceSnippetByCompany(snippets, currentExperience.company)
							?.id || "",
					]
				: []),
		]).filter(Boolean);

		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`${personName} is ${resume.title}.`,
				resume.headline,
				resume.summary,
				currentExperience
					? `${personName} is currently a ${currentExperience.title} at ${currentExperience.company}.`
					: "",
			]),
			citations: citedIds,
		};
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\bwhere\b.*\bstud(y|ied)\b/i,
			/\beducation\b/i,
			/\bdegree\b/i,
			/\buniversity\b/i,
			/\bcomputer science\b/i,
			/\bschool\b/i,
		]) &&
		resume.education?.length
	) {
		const educationEntries = (resume.education || []).map((item) => {
			const parts = [
				item.degree ? `${item.degree}` : "",
				item.institute ? `from ${item.institute}` : "",
			].filter(Boolean);

			return parts.join(" ");
		});

		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`${personName} studied computer science at ${formatList(
					resume.education.map((item) => item.institute).filter(Boolean),
				)}.`,
				educationEntries.length
					? `${personPossessiveName} education includes ${formatList(
							educationEntries,
							resume.education.length,
						)}.`
					: "",
			]),
			citations: snippets
				.filter((snippet) => snippet.category === "education")
				.map((snippet) => snippet.id),
		};
	}

	const experienceByStartDate = sortExperienceByStartDate(
		resume.experience || [],
	);

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\bearliest\b.*\b(job|role|company|experience)\b/i,
			/\bfirst\b.*\b(job|role|company|experience)\b/i,
			/\bstart of\b.*\bcareer\b/i,
			/\bearly career\b/i,
			/\bwork history\b/i,
		]) &&
		experienceByStartDate.length
	) {
		const earliestExperience = experienceByStartDate[0];
		const earliestSnippet = findExperienceSnippetByCompany(
			snippets,
			earliestExperience.company,
		);

		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`${personName}'s earliest listed role was ${earliestExperience.title} at ${earliestExperience.company} from ${earliestExperience.from} to ${earliestExperience.to}.`,
				earliestExperience.highlight,
			]),
			citations: unique([earliestSnippet?.id || "", "summary", "about"]).filter(
				Boolean,
			),
		};
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\blatest\b.*\b(job|role|company|experience)\b/i,
			/\bmost recent\b.*\b(job|role|company|experience)\b/i,
			/\bcurrent\b.*\b(job|role|company|experience)\b/i,
		]) &&
		experienceByStartDate.length
	) {
		const currentExperience =
			(resume.experience || []).find(
				(item) => item.to.toLowerCase() === "present",
			) || experienceByStartDate[experienceByStartDate.length - 1];
		const currentSnippet = findExperienceSnippetByCompany(
			snippets,
			currentExperience.company,
		);

		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`${personName}'s most recent listed role is ${currentExperience.title} at ${currentExperience.company} from ${currentExperience.from} to ${currentExperience.to}.`,
				currentExperience.highlight,
			]),
			citations: unique([currentSnippet?.id || "", "summary", "about"]).filter(
				Boolean,
			),
		};
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\btechnolog(y|ies)\b/i,
			/\bskills?\b/i,
			/\btech stack\b/i,
			/\btools?\b/i,
			/\buse most\b/i,
			/\buses most\b/i,
		])
	) {
		const topTechnologies = topRepeatedValues(
			(resume.experience || []).flatMap((experience) => experience.tech || []),
			8,
		);

		if (!topTechnologies.length && resume.skills?.length) {
			return {
				status: "answered",
				answer: `${personPossessiveName} experience lists skills including ${formatList(
					resume.skills,
					8,
				)}.`,
				citations: ["skills"],
			};
		}

		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`Across ${personPossessiveName} experience, the technologies that appear most often are ${formatList(
					topTechnologies,
					8,
				)}.`,
				resume.skills?.length
					? `His broader skills list also includes ${formatList(
							resume.skills,
							8,
						)}.`
					: "",
			]),
			citations: unique([
				"skills",
				...(resume.experience || [])
					.map(
						(item) =>
							findExperienceSnippetByCompany(snippets, item.company)?.id || "",
					)
					.filter(Boolean),
			]),
		};
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\bpayments?\b/i,
			/\bfinancial\b/i,
			/\bdonations?\b/i,
			/\badyen\b/i,
			/\bach\b/i,
			/\bcards?\b/i,
			/\bcrypto\b/i,
		])
	) {
		const overflowExperience = resume.experience?.find((item) =>
			normalizeText(item.company).includes("overflow"),
		);
		const overflowSnippet = overflowExperience
			? findExperienceSnippetByCompany(snippets, overflowExperience.company)
			: null;

		if (overflowExperience && overflowSnippet) {
			const paymentDetails = (overflowExperience.details || [])
				.filter((detail) =>
					/payments?|financial|donation|ach|cards?|stock|crypto|fund/i.test(
						detail,
					),
				)
				.slice(0, 2)
				.map((detail) => takeFirstSentence(detail));
			return {
				status: "answered",
				answer: sentenceCaseJoin([
					overflowExperience.highlight,
					...paymentDetails,
				]),
				citations: unique(["summary", "about", overflowSnippet.id]),
			};
		}
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\boverflow\b/i,
			/\bcurrent role\b/i,
			/\bcurrent job\b/i,
			/\bcurrently\b/i,
			/\bwhat does\b/i,
			/\bwhat is\b/i,
		])
	) {
		const currentExperience = resume.experience?.find(
			(item) => item.to.toLowerCase() === "present",
		);
		const currentSnippet = currentExperience
			? findExperienceSnippetByCompany(snippets, currentExperience.company)
			: null;

		if (currentExperience && currentSnippet) {
			return {
				status: "answered",
				answer: sentenceCaseJoin([
					`${personName} is currently a ${currentExperience.title} at ${currentExperience.company}.`,
					currentExperience.highlight,
					...(currentExperience.details || [])
						.slice(0, 1)
						.map((detail) => takeFirstSentence(detail)),
				]),
				citations: [currentSnippet.id],
			};
		}
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\blist\b.*\bprojects?\b/i,
			/\bprojects?\b.*\bworked on\b/i,
			/\bwhat projects?\b/i,
			/\bshow\b.*\bprojects?\b/i,
			/\bportfolio projects?\b/i,
			/\bportfolio\b.*\bwork\b/i,
			/\bwhat\b.*\bbuild\b/i,
			/\bwhat\b.*\bbuilt\b/i,
			/\bwhat\b.*\bmade\b/i,
			/\bthings\b.*\b(built|made)\b/i,
		]) &&
		resume.projects?.length
	) {
		const projectSnippets = (resume.projects || [])
			.map((project) => findSnippetById(snippets, `project:${project.slug}`))
			.filter((snippet): snippet is ResumeSnippet => Boolean(snippet));

		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`${personName}'s listed projects include ${formatList(
					resume.projects.map((project) => project.title),
					resume.projects.length,
				)}.`,
				resume.projects[0]?.summary
					? `${resume.projects[0].title}: ${takeFirstSentence(
							resume.projects[0].summary,
						)}`
					: "",
			]),
			citations: projectSnippets.map((snippet) => snippet.id),
		};
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\blist\b.*\b(blog|blogs|article|articles|post|posts|writing)\b/i,
			/\bshow\b.*\b(blog|blogs|article|articles|post|posts|writing)\b/i,
			/\bwhat\b.*\b(blog|blogs|article|articles|post|posts|writing)\b/i,
			/\bwhich\b.*\b(blog|blogs|article|articles|post|posts|writing)\b/i,
		]) &&
		resume.articles?.length
	) {
		const articleSnippets = (resume.articles || [])
			.map((article) => findSnippetById(snippets, `article:${article.slug}`))
			.filter((snippet): snippet is ResumeSnippet => Boolean(snippet));

		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`${personName}'s listed articles include ${formatList(
					resume.articles.map((article) => article.title),
					resume.articles.length,
				)}.`,
				resume.articles[0]?.summary
					? `${resume.articles[0].title}: ${takeFirstSentence(
							resume.articles[0].summary,
						)}`
					: "",
			]),
			citations: articleSnippets.map((snippet) => snippet.id),
		};
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\blist\b.*\b(case study|case studies)\b/i,
			/\bshow\b.*\b(case study|case studies)\b/i,
			/\bwhat\b.*\b(case study|case studies)\b/i,
		]) &&
		resume.caseStudies?.length
	) {
		const caseStudySnippets = (resume.caseStudies || [])
			.map((item) => findSnippetById(snippets, `case-study:${item.slug}`))
			.filter((snippet): snippet is ResumeSnippet => Boolean(snippet));

		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`${personName}'s listed case studies include ${formatList(
					resume.caseStudies.map((item) => item.title),
					resume.caseStudies.length,
				)}.`,
				resume.caseStudies[0]?.summary
					? `${resume.caseStudies[0].title}: ${takeFirstSentence(
							resume.caseStudies[0].summary,
						)}`
					: "",
			]),
			citations: caseStudySnippets.map((snippet) => snippet.id),
		};
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\blinks?\b/i,
			/\bsocial links?\b/i,
			/\bpublic links?\b/i,
			/\bgithub\b/i,
			/\blinkedin\b/i,
			/\bresume\b/i,
			/\bcalendly\b/i,
			/\bcontact\b/i,
			/\bsite\b/i,
		]) &&
		resume.links
	) {
		const parts: string[] = [];

		if (/social|public|links?/i.test(normalizedQuestion) && resume.links) {
			if (resume.links.github) {
				parts.push(`GitHub: ${resume.links.github}.`);
			}

			if (resume.links.linkedin) {
				parts.push(`LinkedIn: ${resume.links.linkedin}.`);
			}

			if (resume.links.resume) {
				parts.push(`Resume: ${resume.links.resume}.`);
			}

			if (resume.links.site) {
				parts.push(`Website: ${resume.links.site}.`);
			}

			if (resume.links.calendly) {
				parts.push(`Calendly: ${resume.links.calendly}.`);
			}
		}

		if (/github/i.test(normalizedQuestion) && resume.links.github) {
			parts.push(`GitHub: ${resume.links.github}.`);
		}

		if (/linkedin/i.test(normalizedQuestion) && resume.links.linkedin) {
			parts.push(`LinkedIn: ${resume.links.linkedin}.`);
		}

		if (/resume/i.test(normalizedQuestion) && resume.links.resume) {
			parts.push(`Resume: ${resume.links.resume}.`);
		}

		if (/calendly|contact/i.test(normalizedQuestion) && resume.links.calendly) {
			parts.push(`Calendly: ${resume.links.calendly}.`);
		}

		if (/site/i.test(normalizedQuestion) && resume.links.site) {
			parts.push(`Website: ${resume.links.site}.`);
		}

		if (parts.length) {
			return {
				status: "answered",
				answer: parts.join(" "),
				citations: ["links", "contact"].filter((id) =>
					Boolean(findSnippetById(snippets, id)),
				),
			};
		}
	}

	if (
		hasQuestionMatch(normalizedQuestion, [
			/\byoe\b/i,
			/\byears?\s+of\s+experience\b/i,
			/\bhow much experience\b/i,
			/\bexperience level\b/i,
		])
	) {
		return {
			status: "answered",
			answer: sentenceCaseJoin([
				`${personName} has 8+ years of experience building distributed systems, financial infrastructure, and AI-driven data platforms.`,
			]),
			citations: ["summary"].filter((id) =>
				Boolean(findSnippetById(snippets, id)),
			),
		};
	}

	return null;
}

export function shouldIncludeRecentConversationContext(question: string) {
	return (
		isConversationDependentQuestion(question) &&
		!isDirectContentListingQuestion(question)
	);
}

export function generateLocalSmallTalkAnswer(
	question: string,
	resume: ResumePayload,
): AssistantResponse | null {
	const normalizedQuestion = question.trim().toLowerCase();
	const personName = resume.name || "This person";
	const personPossessiveName = possessiveName(personName);

	if (!normalizedQuestion || !isSmallTalk(normalizedQuestion)) {
		return null;
	}

	if (isSmallTalk(normalizedQuestion)) {
		if (SMALL_TALK_FAREWELL_PATTERN.test(normalizedQuestion)) {
			return {
				status: "answered",
				answer: `Goodbye! Feel free to come back if you have more questions about ${personName}.`,
				citations: [],
			};
		}

		if (SMALL_TALK_THANKS_PATTERN.test(normalizedQuestion)) {
			return {
				status: "answered",
				answer: `You're welcome! Let me know if there's anything else you'd like to know about ${personName}.`,
				citations: [],
			};
		}

		if (SMALL_TALK_GREETING_PATTERN.test(normalizedQuestion)) {
			return {
				status: "answered",
				answer: `Hello! Feel free to ask me anything about ${personPossessiveName} experience, projects, skills, or background.`,
				citations: [],
			};
		}

		if (SMALL_TALK_WELLBEING_PATTERN.test(normalizedQuestion)) {
			return {
				status: "answered",
				answer: `I'm doing great, thanks for asking! Ready to help you learn about ${personName}. What would you like to know?`,
				citations: [],
			};
		}

		if (SMALL_TALK_META_PATTERN.test(normalizedQuestion)) {
			return {
				status: "answered",
				answer: `I'm an AI assistant embedded on ${personPossessiveName} site. I can answer questions about ${personPossessiveName} experience, skills, projects, education, and more. What would you like to know?`,
				citations: [],
			};
		}

		if (SMALL_TALK_CAPABILITY_PATTERN.test(normalizedQuestion)) {
			return {
				status: "answered",
				answer: `I can answer questions about ${personPossessiveName} professional background — things like work experience, skills, projects, case studies, education, recommendations, and contact details. What would you like to know?`,
				citations: [],
			};
		}

		if (SMALL_TALK_POSITIVE_FEEDBACK_PATTERN.test(normalizedQuestion)) {
			return {
				status: "answered",
				answer: `Glad I could help! Feel free to ask anything else about ${personName}.`,
				citations: [],
			};
		}

		return {
			status: "answered",
			answer: `Got it! Is there anything you'd like to know about ${personName}?`,
			citations: [],
		};
	}

	return null;
}

export function cosineSimilarity(a: number[], b: number[]) {
	if (a.length !== b.length || a.length === 0) {
		return 0;
	}

	let dotProduct = 0;
	let aMagnitude = 0;
	let bMagnitude = 0;

	for (let index = 0; index < a.length; index += 1) {
		dotProduct += a[index] * b[index];
		aMagnitude += a[index] * a[index];
		bMagnitude += b[index] * b[index];
	}

	if (aMagnitude === 0 || bMagnitude === 0) {
		return 0;
	}

	return dotProduct / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

export function rankSnippetEntriesByEmbeddings(
	query: string,
	questionEmbedding: number[],
	snippets: ResumeSnippet[],
	snippetEmbeddings: number[][],
	limit = MAX_CONTEXT_CHUNKS,
) {
	return snippets
		.map((snippet, index) => ({
			snippet,
			score:
				cosineSimilarity(questionEmbedding, snippetEmbeddings[index] || []) +
				applySnippetIntentBoost(query, snippet),
		}))
		.sort((a, b) => compareSnippetsForQuestion(query, a, b))
		.slice(0, limit);
}

export function rankSnippetsByEmbeddings(
	query: string,
	questionEmbedding: number[],
	snippets: ResumeSnippet[],
	snippetEmbeddings: number[][],
	limit = MAX_CONTEXT_CHUNKS,
) {
	return rankSnippetEntriesByEmbeddings(
		query,
		questionEmbedding,
		snippets,
		snippetEmbeddings,
		limit,
	).map((entry) => entry.snippet);
}

const BROAD_ASSISTANT_CATEGORY_ORDER: ResumeSnippet["category"][] = [
	"summary",
	"about",
	"hero",
	"focus",
	"skills",
	"experience",
	"education",
	"recommendation",
	"links",
	"contact",
	"stats",
	"project",
	"case-study",
	"article",
];

const ALWAYS_INCLUDED_ROUTED_CATEGORIES: ResumeSnippet["category"][] = [
	"summary",
	"hero",
	"focus",
	"stats",
	"about",
	"experience",
	"education",
	"contact",
	"recommendation",
];

function collectSnippetContext(args: {
	allSnippets: ResumeSnippet[];
	limit: number;
	prioritizedSnippets?: ResumeSnippet[];
}) {
	const { allSnippets, limit, prioritizedSnippets = [] } = args;
	const selectedSnippets: ResumeSnippet[] = [];
	const selectedIds = new Set<string>();

	const addSnippet = (snippet: ResumeSnippet | undefined) => {
		if (!snippet || selectedIds.has(snippet.id)) {
			return;
		}

		selectedSnippets.push(snippet);
		selectedIds.add(snippet.id);
	};

	for (const snippet of prioritizedSnippets) {
		addSnippet(snippet);

		if (selectedSnippets.length >= limit) {
			return selectedSnippets.slice(0, limit);
		}
	}

	for (const category of BROAD_ASSISTANT_CATEGORY_ORDER) {
		for (const snippet of allSnippets) {
			if (snippet.category === category) {
				addSnippet(snippet);
			}

			if (selectedSnippets.length >= limit) {
				return selectedSnippets.slice(0, limit);
			}
		}
	}

	for (const snippet of allSnippets) {
		addSnippet(snippet);

		if (selectedSnippets.length >= limit) {
			return selectedSnippets.slice(0, limit);
		}
	}

	return selectedSnippets.slice(0, limit);
}

function getFoundationalAssistantSnippets(allSnippets: ResumeSnippet[]) {
	const foundationalCategories: ResumeSnippet["category"][] = [
		"summary",
		"about",
		"hero",
		"focus",
		"stats",
		"skills",
		"experience",
		"education",
		"recommendation",
		"links",
		"contact",
	];

	return allSnippets.filter((snippet) =>
		foundationalCategories.includes(snippet.category),
	);
}

function getAlwaysIncludedRoutedSnippets(allSnippets: ResumeSnippet[]) {
	return allSnippets.filter((snippet) =>
		ALWAYS_INCLUDED_ROUTED_CATEGORIES.includes(snippet.category),
	);
}

function getQuestionAwareSupportSnippets(
	question: string,
	allSnippets: ResumeSnippet[],
) {
	const preferredCategories: ResumeSnippet["category"][] = [];

	if (isCareerTimelineQuestion(question)) {
		preferredCategories.push("experience", "summary", "about");
	}

	if (isEducationQuestion(question)) {
		preferredCategories.push("education", "summary", "about");
	}

	if (isRecommendationQuestion(question)) {
		preferredCategories.push("recommendation", "about", "summary");
	}

	if (isContactQuestion(question)) {
		preferredCategories.push("links", "contact");
	}

	if (/\b(article|articles|blog|blogs|post|posts|writing)\b/i.test(question)) {
		preferredCategories.push("article", "summary", "about");
	}

	if (
		/\bprojects?\b|\bportfolio\b.*\bwork\b|\bwork\b.*\b(built|made)\b/i.test(
			question,
		)
	) {
		preferredCategories.push("project", "summary", "about");
	}

	if (/\b(case study|case studies)\b/i.test(question)) {
		preferredCategories.push("case-study", "summary", "about");
	}

	if (!preferredCategories.length) {
		return [];
	}

	return allSnippets.filter((snippet) =>
		preferredCategories.includes(snippet.category),
	);
}

function getTargetedContextLimit(args: {
	question: string;
	alwaysIncludedSnippets: ResumeSnippet[];
	questionAwareSnippets: ResumeSnippet[];
	retrievedSnippets?: ResumeSnippet[];
}) {
	const {
		question,
		alwaysIncludedSnippets,
		questionAwareSnippets,
		retrievedSnippets = [],
	} = args;
	const isBroadQuestion = isBroadProfileQuestion(question);

	if (isBroadQuestion) {
		return Math.max(MAX_BROAD_CONTEXT_CHUNKS, alwaysIncludedSnippets.length);
	}

	const bonusSlots =
		Math.min(questionAwareSnippets.length, MAX_TARGETED_CONTEXT_CHUNKS) +
		Math.min(retrievedSnippets.length, MAX_TARGETED_CONTEXT_CHUNKS);

	return Math.max(
		MAX_TARGETED_CONTEXT_CHUNKS,
		alwaysIncludedSnippets.length + bonusSlots,
	);
}

export function buildInitialAssistantContextSnippets(
	question: string,
	allSnippets: ResumeSnippet[],
) {
	const alwaysIncludedSnippets = getAlwaysIncludedRoutedSnippets(allSnippets);
	const questionAwareSupportSnippets = getQuestionAwareSupportSnippets(
		question,
		allSnippets,
	);
	const keywordSnippets = rankSnippetsByKeywords(
		question,
		allSnippets,
		MAX_TARGETED_CONTEXT_CHUNKS,
	);
	const contextLimit = getTargetedContextLimit({
		question,
		alwaysIncludedSnippets,
		questionAwareSnippets: questionAwareSupportSnippets,
		retrievedSnippets: keywordSnippets,
	});
	const prioritizedSnippets = isBroadProfileQuestion(question)
		? [
				...alwaysIncludedSnippets,
				...getFoundationalAssistantSnippets(allSnippets),
			]
		: [
				...keywordSnippets,
				...questionAwareSupportSnippets,
				...alwaysIncludedSnippets,
				...getFoundationalAssistantSnippets(allSnippets),
			];

	return collectSnippetContext({
		allSnippets,
		limit: contextLimit,
		prioritizedSnippets,
	});
}

export function buildAssistantContextSnippets(args: {
	question: string;
	result: RetrievalResult;
	allSnippets: ResumeSnippet[];
}) {
	const { question, result, allSnippets } = args;
	const alwaysIncludedSnippets = getAlwaysIncludedRoutedSnippets(allSnippets);
	const questionAwareSupportSnippets = getQuestionAwareSupportSnippets(
		question,
		allSnippets,
	);
	const contextLimit = getTargetedContextLimit({
		question,
		alwaysIncludedSnippets,
		questionAwareSnippets: questionAwareSupportSnippets,
		retrievedSnippets: result.entries.map((entry) => entry.snippet),
	});
	const prioritizedSnippets = isBroadProfileQuestion(question)
		? [
				...alwaysIncludedSnippets,
				...result.entries.map((entry) => entry.snippet),
				...getFoundationalAssistantSnippets(allSnippets),
			]
		: [
				...result.entries.map((entry) => entry.snippet),
				...questionAwareSupportSnippets,
				...alwaysIncludedSnippets,
				...getFoundationalAssistantSnippets(allSnippets),
			];

	return collectSnippetContext({
		allSnippets,
		limit: contextLimit,
		prioritizedSnippets,
	});
}

export function shouldUseClosestMatchFallback(args: {
	query: string;
	result: RetrievalResult;
}) {
	const { query, result } = args;
	const topEntry = result.entries[0];

	if (!topEntry) {
		return false;
	}

	const topOverlapCount = countKeywordOverlap(
		normalizeQuestionForRetrieval(query),
		topEntry.snippet,
	);
	const secondScore = result.entries[1]?.score || 0;
	const hasStrongScoreGap = topEntry.score - secondScore >= 2;
	const hasStrongKeywordSignal = topOverlapCount >= 2;
	const hasStrongEmbeddingSignal =
		result.mode !== "keywords" && topEntry.score >= 0.55;

	return (
		hasStrongKeywordSignal || hasStrongScoreGap || hasStrongEmbeddingSignal
	);
}

export function buildClosestMatchFallbackAnswer(args: {
	result: RetrievalResult;
}) {
	const topEntry = args.result.entries[0];

	if (!topEntry) {
		return null;
	}

	return {
		status: "answered",
		answer: `I couldn't complete a full answer right now, but the closest relevant reference I found is ${topEntry.snippet.title}.`,
		citations: [topEntry.snippet.id],
	} satisfies AssistantResponse;
}

export function buildRateLimitedLocalAssistantResponse(args: {
	question: string;
	resume: ResumePayload;
	snippets: ResumeSnippet[];
	retrievalResult?: RetrievalResult | null;
}) {
	const { question, resume, retrievalResult, snippets } = args;
	const localResponse = generateLocalResumeAnswer(question, resume, snippets);

	if (localResponse) {
		return {
			response: localResponse,
			usedClosestMatchFallback: false,
			fallbackReason: "rate_limited_fell_back_to_local_match",
		};
	}

	const closestMatchFallback =
		retrievalResult &&
		shouldUseClosestMatchFallback({
			query: retrievalResult.query,
			result: retrievalResult,
		})
			? buildClosestMatchFallbackAnswer({ result: retrievalResult })
			: null;

	if (closestMatchFallback) {
		return {
			response: closestMatchFallback,
			usedClosestMatchFallback: true,
			fallbackReason: "rate_limited_fell_back_to_closest_match",
		};
	}

	return null;
}

export async function hashResumePayload(resume: ResumePayload) {
	const encoded = new TextEncoder().encode(JSON.stringify(resume));
	const digest = await crypto.subtle.digest("SHA-256", encoded);

	return Array.from(new Uint8Array(digest))
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
}

export function getEmbeddingsCacheKey(hash: string, model: string) {
	return `${RESPONSE_CACHE_PREFIX}:${EMBEDDINGS_CACHE_VERSION}:${model}:${hash}`;
}

export function getAssistantWorkerUrl() {
	return getResolvedAssistantWorkerUrl();
}

async function parseAssistantJsonPayload(response: Response) {
	const contentType = response.headers.get("Content-Type") || "";

	if (contentType.toLowerCase().includes("application/json")) {
		return response.json();
	}

	const rawText = await response.text();

	try {
		return JSON.parse(rawText);
	} catch {
		throw new Error(
			rawText.trim()
				? `Assistant returned a non-JSON response: ${rawText.trim()}`
				: "Assistant returned an empty non-JSON response.",
		);
	}
}

async function parseUnknownAssistantPayload(response: Response) {
	const rawText = await response.text();

	if (!rawText.trim()) {
		return {
			rawText,
			payload: null as unknown,
		};
	}

	try {
		return {
			rawText,
			payload: JSON.parse(rawText) as unknown,
		};
	} catch {
		return {
			rawText,
			payload: rawText,
		};
	}
}

export function buildAssistantChatRequestBody(args: {
	model?: string;
	question: string;
	recentMessages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	snippets: ResumeSnippet[];
	temperature?: number;
	maxTokens?: number;
	structuredOutput?: boolean;
}) {
	const {
		model,
		question,
		recentMessages,
		snippets,
		temperature = 0,
		maxTokens,
		structuredOutput = true,
	} = args;
	const broadProfileQuestion = isBroadProfileQuestion(question);
	const enumerativeQuestion = isEnumerativeQuestion(question);
	const snippetList = snippets
		.map((snippet) => `[${snippet.id}] ${snippet.title}\n${snippet.text}`)
		.join("\n\n");
	const recentContext = recentMessages.length
		? recentMessages
				.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
				.join("\n")
		: "None";

	return {
		action: "chat",
		...(model ? { model } : {}),
		temperature,
		max_tokens:
			maxTokens ?? (broadProfileQuestion || enumerativeQuestion ? 700 : 500),
		response_format: structuredOutput
			? {
					type: "json_schema" as const,
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							additionalProperties: false,
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
									maxItems: MAX_CONTEXT_CHUNKS,
								},
							},
							required: ["status", "answer", "citations"],
						},
					},
				}
			: undefined,
		messages: [
			{
				role: "system" as const,
				content: SYSTEM_PROMPT,
			},
			{
				role: "developer" as const,
				content: [
					"Use only the SUPPORTING_RESUME_SNIPPETS below.",
					`If the snippets do not contain the answer, respond with status "missing" and answer exactly: ${MISSING_INFORMATION_MESSAGE}`,
					`If the question is unrelated to the person described in the resume or recommendations, respond with status "rejected" and answer exactly: ${UNRELATED_QUESTION_MESSAGE}`,
					"If the snippets do contain the answer, do not respond with a missing or rejected message.",
					"Do not say you can only answer based on this site unless the question is truly unrelated to the person described in the snippets.",
					"If an experience, education, recommendation, contact, or profile snippet directly answers the question, answer from that snippet instead of refusing.",
					"Do not infer, invent, generalize, or use outside knowledge.",
					"Every factual answer must be grounded in the snippet IDs you cite.",
					"When structured output is enabled, keep the answer human-readable and do not include snippet IDs like [summary] or [project:example-slug] inside the answer text.",
					"When responding without structured output, include supporting snippet IDs inline in square brackets, for example [summary] or [project:example-slug].",
					"If the question is about timing, chronology, first roles, or when work started, use the dates in the provided experience snippets to determine the answer. Otherwise match with the most relevant information from the snippets.",
					"If the question is about early, first, recent, or latest projects, articles, posts, or case studies, use the Date fields in the provided content snippets to determine ordering. Otherwise match with the most relevant information from the snippets.",
					"If the question is broad or asks for an overview, synthesize a fuller profile using summary, about, experience, education, recommendations, and relevant content snippets instead of giving a minimal generic summary.",
					"For broad profile questions, prioritize profile/background/experience details before testimonials.",
					"Keep the answer concise and friendly.",
					"",
					`RECENT_CHAT_CONTEXT:\n${recentContext}`,
					"",
					`SUPPORTING_RESUME_SNIPPETS:\n${snippetList}`,
				].join("\n"),
			},
			{
				role: "user" as const,
				content: question,
			},
		],
	} satisfies AssistantChatRequestBody;
}

export async function fetchEmbeddings(
	workerUrl: string,
	model: string,
	input: string | string[],
) {
	const response = await fetch(new URL("/assistant", workerUrl).toString(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			action: "embeddings",
			model,
			input,
		}),
	});

	if (!response.ok) {
		throw new Error(
			`Embeddings request failed with status ${response.status}.`,
		);
	}

	const payload = (await parseAssistantJsonPayload(response)) as {
		data?: Array<{
			embedding?: number[];
		}>;
	};

	const embeddings = payload.data?.map((item) => item.embedding || []) || [];

	if (!embeddings.length) {
		throw new Error("Embeddings response did not include vectors.");
	}

	return embeddings;
}

export function mergeUniqueSnippets(snippets: ResumeSnippet[]) {
	const merged: ResumeSnippet[] = [];
	const seenIds = new Set<string>();

	for (const snippet of snippets) {
		if (seenIds.has(snippet.id)) {
			continue;
		}

		seenIds.add(snippet.id);
		merged.push(snippet);
	}

	return merged;
}

export function mergeRetrievalResults(args: {
	query: string;
	keywordEntries: RetrievalEntry[];
	semanticEntries: RetrievalEntry[];
	limit?: number;
}) {
	const {
		query,
		keywordEntries,
		semanticEntries,
		limit = MAX_BROAD_CONTEXT_CHUNKS,
	} = args;
	const mergedEntries = new Map<string, RetrievalEntry>();

	for (const entry of [...keywordEntries, ...semanticEntries]) {
		const existing = mergedEntries.get(entry.snippet.id);

		if (!existing || entry.score > existing.score) {
			mergedEntries.set(entry.snippet.id, entry);
		}
	}

	return {
		query,
		mode:
			keywordEntries.length && semanticEntries.length
				? ("hybrid" as const)
				: semanticEntries.length
					? ("semantic" as const)
					: ("keywords" as const),
		entries: Array.from(mergedEntries.values())
			.sort((a, b) => compareSnippetsForQuestion(query, a, b))
			.slice(0, limit),
	} satisfies RetrievalResult;
}

export async function fetchSemanticRelevantSnippets(args: {
	workerUrl: string;
	question: string;
	query: string;
}) {
	const retrievalQuestion = compactRetrievalQuestion(
		args.query || args.question,
	);
	const response = await fetch(
		new URL("/assistant-retrieve", args.workerUrl).toString(),
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				question: retrievalQuestion,
				query: args.query,
			}),
		},
	);

	if (!response.ok) {
		throw new Error(
			`Semantic retrieval request failed with status ${response.status}.`,
		);
	}

	const payload = (await parseAssistantJsonPayload(
		response,
	)) as SemanticRetrievePayload;

	if (
		!payload?.ok ||
		payload.status !== "ready" ||
		!Array.isArray(payload.chunks)
	) {
		return {
			matched: payload?.matched || 0,
			entries: [] as RetrievalEntry[],
			snippets: [] as ResumeSnippet[],
		};
	}

	const snippets = payload.chunks.map(toSemanticResumeSnippet);
	return {
		matched: payload.matched,
		snippets,
		entries: payload.chunks.map((chunk, index) => ({
			snippet: snippets[index],
			score: Number(chunk.score || 0),
		})),
	};
}

function parseAssistantProviderContextHeader(header: string | null) {
	if (!header) {
		return null;
	}

	try {
		const parsedProviderContext = JSON.parse(header) as Array<{
			provider?: unknown;
			status?: unknown;
			error?: unknown;
		}>;

		return Array.isArray(parsedProviderContext)
			? parsedProviderContext
					.filter(
						(entry) =>
							entry &&
							typeof entry.provider === "string" &&
							typeof entry.status === "number",
					)
					.map((entry) => ({
						provider: entry.provider as string,
						status: entry.status as number,
						error: typeof entry.error === "string" ? entry.error : null,
					}))
			: null;
	} catch {
		return null;
	}
}

export async function parseAssistantFetchResponse(
	response: Response,
	snippets: ResumeSnippet[],
) {
	const rateLimited =
		response.headers.get("X-Assistant-Rate-Limited")?.toLowerCase() === "true";

	if (!response.ok) {
		const errorPayload = await parseAssistantJsonPayload(response).catch(
			() => null,
		);
		const errorMessage =
			errorPayload &&
			typeof errorPayload === "object" &&
			"error" in errorPayload &&
			typeof errorPayload.error === "string"
				? errorPayload.error
				: `Assistant request failed with status ${response.status}.`;
		throw new Error(errorMessage);
	}

	const payload = (await parseAssistantJsonPayload(response)) as {
		choices?: Array<{
			message?: {
				content?: string;
			};
		}>;
	};
	const provider = response.headers.get("X-Assistant-Provider");
	const providerContext = parseAssistantProviderContextHeader(
		response.headers.get("X-Assistant-Providers"),
	);
	const rawContent = payload.choices?.[0]?.message?.content;

	if (!rawContent) {
		throw new Error("Assistant response was empty.");
	}

	const parsed = assistantResponseSchema.parse(JSON.parse(rawContent));
	const normalizedAnswer = replaceInlineCitationIdsWithTitles(
		parsed.answer,
		snippets,
	);
	const normalizedStatus = inferAssistantStatusFromAnswer(normalizedAnswer);
	const validCitationIds = new Set(snippets.map((snippet) => snippet.id));
	const filteredCitations = parsed.citations
		.filter((citation) => validCitationIds.has(citation))
		.slice(0, MAX_CONTEXT_CHUNKS);
	const incompleteAnsweredResponse =
		normalizedStatus === "answered" &&
		isLikelyIncompleteAssistantAnswer(
			normalizedAnswer,
			filteredCitations.length,
		);

	if (incompleteAnsweredResponse) {
		return {
			status: "missing",
			answer: MISSING_INFORMATION_MESSAGE,
			citations: [],
			rateLimited,
			provider,
			providerContext,
		} satisfies AssistantResponse;
	}

	if (normalizedStatus === "answered" && filteredCitations.length === 0) {
		return {
			status: "answered",
			answer: normalizedAnswer,
			citations: [],
			rateLimited,
			provider,
			providerContext,
		} satisfies AssistantResponse;
	}

	if (normalizedStatus === "missing" || parsed.status === "missing") {
		return {
			status: "missing",
			answer: MISSING_INFORMATION_MESSAGE,
			citations: [],
			rateLimited,
			provider,
			providerContext,
		} satisfies AssistantResponse;
	}

	if (normalizedStatus === "rejected" || parsed.status === "rejected") {
		return {
			status: "rejected",
			answer: UNRELATED_QUESTION_MESSAGE,
			citations: [],
			rateLimited,
			provider,
			providerContext,
		} satisfies AssistantResponse;
	}

	return {
		status: "answered",
		answer: normalizedAnswer,
		citations: filteredCitations,
		rateLimited,
		provider,
		providerContext,
	} satisfies AssistantResponse;
}

export async function fetchAssistantResponse(args: {
	workerUrl: string;
	question: string;
	recentMessages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	snippets: ResumeSnippet[];
}) {
	const { question, recentMessages, snippets, workerUrl } = args;
	const requestBody = buildAssistantChatRequestBody({
		question,
		recentMessages,
		snippets,
	});

	const response = await fetch(
		new URL("/assistant-routed", workerUrl).toString(),
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		},
	);

	return parseAssistantFetchResponse(response, snippets);
}

export async function fetchAssistantRawProviderResponse(args: {
	workerUrl: string;
	provider: AssistantDebugProvider;
	question: string;
	recentMessages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	snippets: ResumeSnippet[];
	model?: string;
	temperature?: number;
	maxTokens?: number;
	structuredOutput?: boolean;
}) {
	const {
		workerUrl,
		provider,
		question,
		recentMessages,
		snippets,
		model,
		temperature = 0,
		maxTokens,
		structuredOutput = true,
	} = args;
	const response = await fetch(
		new URL("/assistant-provider-raw", workerUrl).toString(),
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				provider,
				request: buildAssistantChatRequestBody({
					model: model?.trim() || undefined,
					question,
					recentMessages,
					snippets,
					temperature,
					maxTokens,
					structuredOutput,
				}),
			}),
		},
	);
	const { rawText, payload } = await parseUnknownAssistantPayload(response);

	return {
		ok: response.ok,
		status: response.status,
		provider: response.headers.get("X-Assistant-Provider"),
		rawText,
		payload,
	};
}
