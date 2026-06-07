import { describe, expect, it } from "vitest";
import {
	findAssistantInlineLinkMatches,
	MISSING_INFORMATION_MESSAGE,
	parseAssistantFetchResponse,
	type ResumeSnippet,
	UNRELATED_QUESTION_MESSAGE,
} from "./resume-assistant";

const paymentsSnippet: ResumeSnippet = {
	id: "project:payments",
	category: "project",
	title: "Payments Project",
	text: "Built payment guardrails and platform workflows.",
	keywords: ["payments", "guardrails"],
	url: "/projects/payments/",
};

function buildAssistantResponse(
	content: {
		status: "answered" | "missing" | "rejected";
		answer: string;
		citations: string[];
	},
	headers: Record<string, string> = {},
) {
	return new Response(
		JSON.stringify({
			choices: [
				{
					message: {
						content: JSON.stringify(content),
					},
				},
			],
		}),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
		},
	);
}

describe("assistant response parsing", () => {
	it("parses rate-limit and provider headers", async () => {
		const response = await parseAssistantFetchResponse(
			buildAssistantResponse(
				{
					status: "missing",
					answer: MISSING_INFORMATION_MESSAGE,
					citations: [],
				},
				{
					"X-Assistant-Provider": "rate-limit-fallback",
					"X-Assistant-Providers": JSON.stringify([
						{ provider: "groq", status: 429, error: "rate limited" },
						{ provider: "github-models", status: 200 },
						{ provider: 123, status: "bad" },
					]),
					"X-Assistant-Rate-Limited": "true",
				},
			),
			[paymentsSnippet],
		);

		expect(response).toEqual({
			status: "missing",
			answer: MISSING_INFORMATION_MESSAGE,
			citations: [],
			rateLimited: true,
			provider: "rate-limit-fallback",
			providerContext: [
				{ provider: "groq", status: 429, error: "rate limited" },
				{ provider: "github-models", status: 200, error: null },
			],
		});
	});

	it("filters unknown citations and replaces inline citation IDs with titles", async () => {
		const response = await parseAssistantFetchResponse(
			buildAssistantResponse({
				status: "answered",
				answer: "He built guardrails for [project:payments].",
				citations: ["project:payments", "project:missing"],
			}),
			[paymentsSnippet],
		);

		expect(response).toMatchObject({
			status: "answered",
			answer: "He built guardrails for Payments Project.",
			citations: ["project:payments"],
			rateLimited: false,
		});
	});

	it("canonicalizes missing and rejected answers", async () => {
		await expect(
			parseAssistantFetchResponse(
				buildAssistantResponse({
					status: "answered",
					answer: UNRELATED_QUESTION_MESSAGE,
					citations: ["project:payments"],
				}),
				[paymentsSnippet],
			),
		).resolves.toMatchObject({
			status: "rejected",
			answer: UNRELATED_QUESTION_MESSAGE,
			citations: [],
		});

		await expect(
			parseAssistantFetchResponse(
				buildAssistantResponse({
					status: "answered",
					answer: "N/A",
					citations: [],
				}),
				[paymentsSnippet],
			),
		).resolves.toMatchObject({
			status: "missing",
			answer: MISSING_INFORMATION_MESSAGE,
			citations: [],
		});
	});

	it("throws readable worker errors", async () => {
		await expect(
			parseAssistantFetchResponse(
				new Response(JSON.stringify({ error: "Worker unavailable" }), {
					status: 503,
					headers: { "Content-Type": "application/json" },
				}),
				[paymentsSnippet],
			),
		).rejects.toThrow("Worker unavailable");
	});
});

describe("assistant inline link matching", () => {
	it("auto-links citation titles in rendered text", () => {
		expect(
			findAssistantInlineLinkMatches({
				content: "The Payments Project improved platform reliability.",
				citations: [paymentsSnippet],
			}),
		).toEqual([
			{
				start: 4,
				end: 20,
				text: "Payments Project",
				href: "/projects/payments/",
				external: false,
			},
		]);
	});
});
