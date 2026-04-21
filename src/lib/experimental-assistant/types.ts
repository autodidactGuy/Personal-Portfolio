export type ExperimentalAssistantCategory =
	| "summary"
	| "about"
	| "experience"
	| "education"
	| "project"
	| "article"
	| "case-study"
	| "recommendation"
	| "contact"
	| "links";

export type ExperimentalAssistantChunk = {
	id: string;
	title: string;
	text: string;
	category: ExperimentalAssistantCategory;
	section: string;
	keywords: string[];
	tags?: string[];
	entities?: string[];
	url?: string;
	date?: string;
	from?: string;
	to?: string;
	isCurrent?: boolean;
};

export type ExperimentalAssistantArtifact = {
	version: string;
	createdAt: string;
	sourceHash: string;
	embeddingModel: string;
	chunks: ExperimentalAssistantChunk[];
	embeddings: number[][];
};

export type ExperimentalAssistantMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
	citations?: string[];
	mode?: "retrieval" | "hf-chat";
};

export type RetrievalScoreBreakdown = {
	semantic: number;
	lexical: number;
	keyword: number;
	intent: number;
	chronology: number;
	topic: number;
	entity: number;
	length: number;
	duplicatePenalty: number;
	total: number;
};

export type RetrievedChunk = {
	chunk: ExperimentalAssistantChunk;
	score: number;
	breakdown: RetrievalScoreBreakdown;
};

export type RetrievalMode = "hybrid" | "keywords";

export type RetrievalResult = {
	query: string;
	mode: RetrievalMode;
	entries: RetrievedChunk[];
};

export const EXPERIMENTAL_ASSISTANT_ARTIFACT_PATH =
	"/experimental-assistant/index.json";

export const CATEGORY_LABELS: Record<ExperimentalAssistantCategory, string> = {
	summary: "Summary",
	about: "About",
	experience: "Experience",
	education: "Education",
	project: "Project",
	article: "Article",
	"case-study": "Case Study",
	recommendation: "Recommendation",
	contact: "Contact",
	links: "Links",
};
