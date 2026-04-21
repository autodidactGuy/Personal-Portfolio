import type { ExperimentalAssistantCategory } from "./types";

export const CATEGORY_DESCRIPTIONS: Record<
	ExperimentalAssistantCategory,
	string
> = {
	summary: "High-level profile and positioning.",
	about: "About-page narrative and personal context.",
	experience: "Career history, roles, highlights, and technologies.",
	education: "Education background and academic history.",
	project: "Project and portfolio work.",
	article: "Blog posts and written content.",
	"case-study": "Detailed case studies and delivery stories.",
	recommendation: "Testimonials and references.",
	contact: "Ways to get in touch.",
	links: "Direct profile and portfolio links.",
};

export function isChronologyQuery(query: string) {
	return /\b(latest|recent|currently|current|present|now|earlier|early|first|before|after|timeline|chronology|most recent|previous)\b/i.test(
		query,
	);
}

export function isContactQuery(query: string) {
	return /\b(contact|email|reach|schedule|calendly|linkedin|github|resume|website|site)\b/i.test(
		query,
	);
}
