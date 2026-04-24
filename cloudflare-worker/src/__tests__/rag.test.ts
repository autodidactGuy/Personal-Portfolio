import { describe, expect, it, vi } from "vitest";
import { buildChunks } from "../../scripts/lib/chunking";
import app from "../rag-app";

const baseEnv = {
	ALLOWED_ORIGINS: "https://hassanraza.us",
	ORIGIN: "https://hassanraza.us",
	RAG_EMBED_MODEL: "@cf/baai/bge-small-en-v1.5",
	RAG_CHAT_MODEL: "@cf/meta/llama-3.1-8b-instruct",
	RAG_TOP_K: "10",
	RAG_SIMILARITY_THRESHOLD: "0.50",
	RAG_MAX_CONTEXT_CHUNKS: "10",
	RAG_MAX_OUTPUT_TOKENS: "600",
};

function createMockR2Bucket(records: Record<string, string> = {}) {
	return {
		get: vi.fn().mockImplementation(async (key: string) => {
			const value = records[key];

			if (!value) {
				return null;
			}

			return {
				text: vi.fn().mockResolvedValue(value),
			};
		}),
	};
}

describe("buildChunks", () => {
	it("creates deterministic summary and section chunks", () => {
		const chunks = buildChunks(
			{
				records: [
					{
						recordId: "project:test",
						sourceType: "project",
						title: "Test Project",
						slug: "test-project",
						url: "https://example.com/test-project",
						tags: ["cloudflare"],
						priority: 5,
						summary: "A short summary.",
						sections: [
							{
								heading: "body",
								content: "First paragraph.\n\nSecond paragraph.",
							},
						],
					},
				],
			},
			{
				targetChars: 80,
				maxChars: 120,
				overlapChars: 20,
			},
		);

		expect(chunks.length).toBeGreaterThanOrEqual(2);
		expect(chunks[0].id).toContain("project:test-project:summary");
		expect(chunks[0].vectorId.length).toBeLessThanOrEqual(64);
	});
});

describe("/ask", () => {
	it("renders a small test UI on the home route", async () => {
		const response = await app.fetch(
			new Request("https://worker.test/", {
				method: "GET",
			}),
			baseEnv as never,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(await response.text()).toContain("Call /assistant-provider-raw");
	});

	it("returns 400 for invalid request bodies", async () => {
		const response = await app.fetch(
			new Request("https://worker.test/ask", {
				method: "POST",
				headers: {
					Origin: "https://hassanraza.us",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			}),
			baseEnv as never,
		);

		expect(response.status).toBe(400);
		expect(((await response.json()) as { error: string }).error).toBe(
			"Validation failed",
		);
	});

	it("returns no_match without calling the generation model", async () => {
		const env = {
			...baseEnv,
			AI: {
				run: vi.fn().mockResolvedValueOnce({
					data: [[0.1, 0.2, 0.3]],
				}),
			},
			VECTOR_INDEX: {
				query: vi.fn().mockResolvedValue({ matches: [] }),
			},
			RAG_CHUNKS_BUCKET: createMockR2Bucket(),
		};

		const response = await app.fetch(
			new Request("https://worker.test/ask", {
				method: "POST",
				headers: {
					Origin: "https://hassanraza.us",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ question: "What projects has Hassan built?" }),
			}),
			env as never,
		);

		const payload = (await response.json()) as { status: string };
		expect(response.status).toBe(200);
		expect(payload.status).toBe("no_match");
		expect(env.AI.run).toHaveBeenCalledTimes(1);
	});

	it("allows /ask when the request origin matches the worker origin", async () => {
		const env = {
			...baseEnv,
			ALLOWED_ORIGINS: "https://hassanraza.us",
			AI: {
				run: vi.fn().mockResolvedValueOnce({
					data: [[0.1, 0.2, 0.3]],
				}),
			},
			VECTOR_INDEX: {
				query: vi.fn().mockResolvedValue({ matches: [] }),
			},
			RAG_CHUNKS_BUCKET: createMockR2Bucket(),
		};

		const response = await app.fetch(
			new Request("https://worker.test/ask", {
				method: "POST",
				headers: {
					Origin: "https://worker.test",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ question: "What projects has Hassan built?" }),
			}),
			env as never,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			"https://worker.test",
		);
		expect(((await response.json()) as { status: string }).status).toBe(
			"no_match",
		);
	});

	it("returns an answered payload with citations when retrieval succeeds", async () => {
		const env = {
			...baseEnv,
			AI: {
				run: vi
					.fn()
					.mockResolvedValueOnce({
						data: [[0.1, 0.2, 0.3]],
					})
					.mockResolvedValueOnce({
						response:
							"He has built payment systems and AI-driven analytics features.",
					}),
			},
			VECTOR_INDEX: {
				query: vi.fn().mockResolvedValue({
					matches: [
						{
							id: "vec-1",
							score: 0.9,
							metadata: {
								objectKey: "chunks/vec-1.json",
							},
						},
					],
				}),
			},
			RAG_CHUNKS_BUCKET: createMockR2Bucket({
				"chunks/vec-1.json": JSON.stringify({
					vectorId: "vec-1",
					id: "experience:overflow:overview:0",
					text: "Built fintech systems for payments and analytics.",
					sourceType: "experience",
					title: "Senior Software Engineer at Overflow App Inc",
					slug: "overflow",
					url: "https://example.com/about",
					section: "overview",
				}),
			}),
		};

		const response = await app.fetch(
			new Request("https://worker.test/ask", {
				method: "POST",
				headers: {
					Origin: "https://hassanraza.us",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					question: "What kind of systems does Hassan build?",
				}),
			}),
			env as never,
		);

		const payload = (await response.json()) as {
			status: string;
			citations: unknown[];
			answer: string;
		};
		expect(response.status).toBe(200);
		expect(payload.status).toBe("answered");
		expect(payload.citations).toHaveLength(1);
		expect(payload.answer).toContain("payment systems");
		expect(env.AI.run).toHaveBeenCalledTimes(2);
	});
});
