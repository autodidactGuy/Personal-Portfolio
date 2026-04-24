import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { rateLimitMap, resetRateLimitState } from "../index.ts";
import { resetGroqApiKeyRotation } from "../utils/providers.ts";

const ALLOWED_ORIGIN = "https://hassanraza.us";

const env = {
	ALLOWED_ORIGINS: ALLOWED_ORIGIN,
	ORIGIN: ALLOWED_ORIGIN,
	GITHUB_CLIENT_ID: "test-id",
	GITHUB_CLIENT_SECRET: "test-secret",
	ALLOWED_GITHUB_USERS: "autodidactGuy",
};

function buildRequest(method, origin, body, contentType = "application/json") {
	return buildPathRequest("/contact", method, origin, body, contentType);
}

function buildPathRequest(
	pathname,
	method,
	origin,
	body,
	contentType = "application/json",
) {
	const headers = new Headers();

	if (origin) {
		headers.set("Origin", origin);
	}

	if (contentType) {
		headers.set("Content-Type", contentType);
	}

	const init = { method, headers };

	if (body !== undefined) {
		init.body = JSON.stringify(body);
	}

	return new Request(`https://worker.test${pathname}`, init);
}

function createMockR2Bucket(records = {}) {
	return {
		get: vi.fn().mockImplementation(async (key) => {
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

const validPayload = {
	name: "Jane Doe",
	email: "jane@example.com",
	phone: "1234567890",
	subject: "Hello from the tests",
	message: "This is a test message body",
};

describe("/contact", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 200 for a valid POST from an allowed origin", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
		);

		const fullEnv = {
			...env,
			RESEND_API_KEY: "re_test_key",
			CONTACT_EMAIL: "inbox@example.com",
		};
		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		const response = await worker.fetch(request, fullEnv);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.message).toBe("Message received");
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			ALLOWED_ORIGIN,
		);
	});

	it("returns 200 when phone is omitted", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
		);

		const fullEnv = {
			...env,
			RESEND_API_KEY: "re_test_key",
			CONTACT_EMAIL: "inbox@example.com",
		};
		const { phone, ...payload } = validPayload;
		const request = buildRequest("POST", ALLOWED_ORIGIN, payload);
		const response = await worker.fetch(request, fullEnv);

		expect(response.status).toBe(200);
		expect((await response.json()).success).toBe(true);
	});

	it("returns 403 when no origin can be determined", async () => {
		const request = buildRequest("POST", null, validPayload);
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Invalid origin");
	});

	it("accepts origin from Referer header when Origin is absent", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
		);

		const fullEnv = {
			...env,
			RESEND_API_KEY: "re_test_key",
			CONTACT_EMAIL: "inbox@example.com",
		};
		const headers = new Headers();
		headers.set("Referer", `${ALLOWED_ORIGIN}/some-page`);
		headers.set("Content-Type", "application/json");

		const request = new Request("https://worker.test/contact", {
			method: "POST",
			headers,
			body: JSON.stringify(validPayload),
		});
		const response = await worker.fetch(request, fullEnv);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("returns 403 for a disallowed origin", async () => {
		const request = buildRequest(
			"POST",
			"https://evil.example.com",
			validPayload,
		);
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Invalid origin");
	});

	it("returns 204 for OPTIONS preflight from allowed origin", async () => {
		const request = buildRequest("OPTIONS", ALLOWED_ORIGIN);
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			ALLOWED_ORIGIN,
		);
		expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
			"POST",
		);
	});

	it("returns 405 for GET requests", async () => {
		const request = buildRequest("GET", ALLOWED_ORIGIN);
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(405);
		expect((await response.json()).error).toBe("Method not allowed");
	});

	it("returns 415 for non-JSON Content-Type", async () => {
		const headers = new Headers();
		headers.set("Origin", ALLOWED_ORIGIN);
		headers.set("Content-Type", "text/plain");

		const request = new Request("https://worker.test/contact", {
			method: "POST",
			headers,
			body: "not json",
		});
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(415);
	});

	it("returns 400 for invalid JSON", async () => {
		const headers = new Headers();
		headers.set("Origin", ALLOWED_ORIGIN);
		headers.set("Content-Type", "application/json");

		const request = new Request("https://worker.test/contact", {
			method: "POST",
			headers,
			body: "not json",
		});
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe("Invalid JSON body");
	});

	it("returns 422 when required fields are missing", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.error).toBe("Validation failed");
		expect(data.fields).toContain("name is required");
		expect(data.fields).toContain("A valid email is required");
		expect(data.fields).toContain("subject is required");
		expect(data.fields).toContain("message is required");
	});

	it("returns 422 for invalid email format", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			email: "not-an-email",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("A valid email is required");
	});

	it("returns 422 for email with multiple @ characters", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			email: "a@b@c.com",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("A valid email is required");
	});

	it("returns 422 for invalid phone number", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			phone: "123",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("phone must be a 10-digit number");
	});

	it("returns 422 when name exceeds max length", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			name: "a".repeat(101),
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("name must not exceed 100 characters");
	});

	it("returns 422 when subject exceeds max length", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			subject: "a".repeat(201),
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("subject must not exceed 200 characters");
	});

	it("returns 422 when message exceeds max length", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			message: "a".repeat(5001),
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("message must not exceed 5000 characters");
	});
});

describe("/assistant", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		resetRateLimitState();
		resetGroqApiKeyRotation();
	});

	it("proxies embeddings requests for an allowed origin", async () => {
		const aiRun = vi.fn().mockResolvedValue({
			data: [[0.1, 0.2, 0.3]],
		});

		const response = await worker.fetch(
			buildPathRequest("/assistant", "POST", ALLOWED_ORIGIN, {
				action: "embeddings",
				model: "openai/text-embedding-3-small",
				input: "test snippet",
			}),
			{
				...env,
				AI: {
					run: aiRun,
				},
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			ALLOWED_ORIGIN,
		);
		expect((await response.json()).data[0].embedding).toEqual([0.1, 0.2, 0.3]);
		expect(aiRun).toHaveBeenCalledWith("openai/text-embedding-3-small", {
			text: ["test snippet"],
			pooling: "cls",
		});
	});

	it("allows localhost origins for local development", async () => {
		const aiRun = vi.fn().mockResolvedValue({
			data: [[0.1, 0.2, 0.3]],
		});

		const response = await worker.fetch(
			new Request("http://127.0.0.1:8787/assistant", {
				method: "POST",
				headers: {
					Origin: "http://localhost:3000",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "embeddings",
					model: "openai/text-embedding-3-small",
					input: "test snippet",
				}),
			}),
			{
				...env,
				AI: {
					run: aiRun,
				},
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			"http://localhost:3000",
		);
	});

	it("allows 0.0.0.0 local origins for local development", async () => {
		const aiRun = vi.fn().mockResolvedValue({
			data: [[0.1, 0.2, 0.3]],
		});

		const response = await worker.fetch(
			new Request("http://127.0.0.1:8787/assistant", {
				method: "POST",
				headers: {
					Origin: "http://0.0.0.0:3000",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "embeddings",
					model: "openai/text-embedding-3-small",
					input: "test snippet",
				}),
			}),
			{
				...env,
				AI: {
					run: aiRun,
				},
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			"http://0.0.0.0:3000",
		);
	});

	it("returns 422 for invalid assistant payloads", async () => {
		const response = await worker.fetch(
			buildPathRequest("/assistant", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "",
				messages: [],
			}),
			env,
		);

		expect(response.status).toBe(422);
		expect((await response.json()).error).toBe("Validation failed");
	});

	it("returns a graceful assistant payload when direct chat upstream rate limits", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response("Too many requests. Please try again later.", {
				status: 429,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const response = await worker.fetch(
			buildPathRequest("/assistant", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Rate-Limited")).toBe("true");
		expect(JSON.parse(data.choices[0].message.content)).toEqual({
			status: "missing",
			answer: "I don't have that information available.",
			citations: [],
		});
	});
});

describe("/assistant-provider-raw", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		resetRateLimitState();
	});

	it("returns an unmodified provider payload for raw debug calls", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					id: "raw-debug-1",
					choices: [
						{
							message: {
								role: "assistant",
								content: "plain raw provider payload",
							},
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		const response = await worker.fetch(
			buildPathRequest("/assistant-provider-raw", "POST", ALLOWED_ORIGIN, {
				provider: "groq",
				request: {
					action: "chat",
					model: "openai/gpt-4.1-mini",
					messages: [{ role: "user", content: "Who is Hassan?" }],
				},
			}),
			{
				...env,
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("groq");
		expect(data.choices[0].message.content).toBe("plain raw provider payload");
	});

	it("keeps raw groq requests aligned with routed behavior by omitting structured output", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					id: "raw-debug-2",
					choices: [
						{
							message: {
								role: "assistant",
								content: "plain raw provider payload",
							},
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		const response = await worker.fetch(
			buildPathRequest("/assistant-provider-raw", "POST", ALLOWED_ORIGIN, {
				provider: "groq",
				request: {
					action: "chat",
					model: "openai/gpt-4.1-mini",
					response_format: {
						type: "json_schema",
						json_schema: {
							name: "resume_assistant_response",
							schema: {
								type: "object",
								properties: {
									status: { type: "string" },
									answer: { type: "string" },
									citations: { type: "array", items: { type: "string" } },
								},
								required: ["status", "answer", "citations"],
							},
						},
					},
					messages: [{ role: "user", content: "Who is Hassan?" }],
				},
			}),
			{
				...env,
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
			},
		);
		const groqRequestInit = fetchSpy.mock.calls[0][1];
		const groqBody = JSON.parse(groqRequestInit.body);

		expect(response.status).toBe(200);
		expect(groqBody.response_format).toBeUndefined();
	});

	it("supports groq_backup in raw debug mode", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					id: "raw-debug-groq-backup",
					choices: [
						{
							message: {
								role: "assistant",
								content:
									'{"status":"answered","answer":"Groq backup answer","citations":["summary"]}',
							},
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		const response = await worker.fetch(
			buildPathRequest("/assistant-provider-raw", "POST", ALLOWED_ORIGIN, {
				provider: "groq_backup",
				request: {
					action: "chat",
					response_format: {
						type: "json_schema",
						json_schema: {
							name: "resume_assistant_response",
							schema: {
								type: "object",
								properties: {
									status: { type: "string" },
									answer: { type: "string" },
									citations: { type: "array", items: { type: "string" } },
								},
								required: ["status", "answer", "citations"],
							},
						},
					},
					messages: [{ role: "user", content: "Who is Hassan?" }],
				},
			}),
			{
				...env,
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
			},
		);
		const groqRequestInit = fetchSpy.mock.calls[0][1];
		const groqBody = JSON.parse(groqRequestInit.body);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("groq_backup");
		expect(groqBody.model).toBe("llama-3.1-8b-instant");
		expect(groqBody.response_format).toBeUndefined();
	});

	it("supports portfolio-rag in raw debug mode", async () => {
		const aiRun = vi
			.fn()
			.mockResolvedValueOnce({
				data: [[0.1, 0.2, 0.3]],
			})
			.mockResolvedValueOnce({
				response: "Hassan built payment systems.",
			});

		const response = await worker.fetch(
			buildPathRequest("/assistant-provider-raw", "POST", ALLOWED_ORIGIN, {
				provider: "portfolio-rag",
				request: {
					action: "chat",
					messages: [
						{ role: "user", content: "What kind of systems has Hassan built?" },
					],
				},
			}),
			{
				...env,
				AI: {
					run: aiRun,
				},
				VECTOR_INDEX: {
					query: vi.fn().mockResolvedValue({
						matches: [
							{
								id: "vec-1",
								score: 0.92,
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
				RAG_CHAT_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				RAG_EMBED_MODEL: "@cf/baai/bge-small-en-v1.5",
				RAG_TOP_K: "6",
				RAG_SIMILARITY_THRESHOLD: "0.72",
				RAG_MAX_CONTEXT_CHUNKS: "4",
				RAG_MAX_OUTPUT_TOKENS: "300",
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("portfolio-rag");
		expect(JSON.parse(data.choices[0].message.content)).toMatchObject({
			status: "answered",
			citations: ["experience:overflow:overview:0"],
		});
	});

	it("uses provided resume snippets and recent context when portfolio-rag is selected", async () => {
		const aiRun = vi
			.fn()
			.mockResolvedValueOnce({
				data: [[0.1, 0.2, 0.3]],
			})
			.mockResolvedValueOnce({
				response: {
					status: "answered",
					answer:
						"His latest work is Building a Resume-Native AI Assistant for My Portfolio.",
					citations: ["project:building-a-resume-native-ai-assistant"],
				},
			});

		const response = await worker.fetch(
			buildPathRequest("/assistant-provider-raw", "POST", ALLOWED_ORIGIN, {
				provider: "portfolio-rag",
				request: {
					action: "chat",
					messages: [
						{
							role: "developer",
							content: [
								"RECENT_CHAT_CONTEXT:",
								"USER: tell me more",
								"",
								"SUPPORTING_RESUME_SNIPPETS:",
								"[project:building-a-resume-native-ai-assistant] Building a Resume-Native AI Assistant for My Portfolio",
								"Date: 2026-04-01",
								"A portfolio-native assistant grounded in resume and recommendation data.",
							].join("\n"),
						},
						{
							role: "user",
							content: "what's the latest work or project he did",
						},
					],
				},
			}),
			{
				...env,
				AI: {
					run: aiRun,
				},
				VECTOR_INDEX: {
					query: vi.fn().mockResolvedValue({ matches: [] }),
				},
				RAG_CHUNKS_BUCKET: createMockR2Bucket(),
				RAG_CHAT_MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
				RAG_EMBED_MODEL: "@cf/baai/bge-base-en-v1.5",
				RAG_TOP_K: "10",
				RAG_SIMILARITY_THRESHOLD: "0.5",
				RAG_MAX_CONTEXT_CHUNKS: "10",
				RAG_MAX_OUTPUT_TOKENS: "600",
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("portfolio-rag");
		expect(JSON.parse(data.choices[0].message.content)).toMatchObject({
			status: "answered",
			citations: ["project:building-a-resume-native-ai-assistant"],
		});
		expect(aiRun).toHaveBeenNthCalledWith(
			2,
			"@cf/meta/llama-3.3-70b-instruct-fp8-fast",
			expect.objectContaining({
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: "developer",
						content: expect.stringContaining(
							"RECENT_CHAT_CONTEXT:\nUSER: tell me more",
						),
					}),
				]),
			}),
		);
	});
});

describe("/assistant-routed", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		resetRateLimitState();
	});

	it("falls back to Cloudflare AI last when GitHub Models fails and earlier providers are unavailable", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const aiRun = vi.fn().mockResolvedValue({
			response:
				'{"status":"answered","answer":"Cloudflare answer","citations":["experience-1"]}',
		});

		fetchSpy
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "provider unavailable" }), {
					status: 503,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "provider unavailable" }), {
					status: 503,
					headers: { "Content-Type": "application/json" },
				}),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct-1M",
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				ASSISTANT_PROVIDER_PRIORITY:
					"github-models,groq,huggingface,cloudflare,groq_backup",
				AI: {
					run: aiRun,
				},
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("cloudflare");
		expect(fetchSpy.mock.calls[0][0]).toBe(
			"https://models.github.ai/inference/chat/completions",
		);
		expect(fetchSpy.mock.calls[1][0]).toBe(
			"https://api.groq.com/openai/v1/chat/completions",
		);
		expect(fetchSpy.mock.calls[2][0]).toBe(
			"https://router.huggingface.co/v1/chat/completions",
		);
		expect(aiRun).toHaveBeenCalledWith(
			"@cf/meta/llama-3.1-8b-instruct",
			expect.objectContaining({
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
		);
		expect((await response.json()).choices[0].message.content).toContain(
			"Cloudflare answer",
		);
	});

	it("falls back to Cloudflare AI when GitHub Models returns a non-429 too-many-requests error", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const aiRun = vi.fn().mockResolvedValue({
			response:
				'{"status":"answered","answer":"Cloudflare answer","citations":["experience-1"]}',
		});

		fetchSpy
			.mockResolvedValueOnce(
				new Response("Too many requests. Please try again later.", {
					status: 503,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						error:
							"Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			);
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "rate limited" }), {
				status: 429,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "llama-3.3-70b-versatile",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct-1M",
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				ASSISTANT_PROVIDER_PRIORITY:
					"github-models,groq,huggingface,cloudflare,groq_backup",
				AI: {
					run: aiRun,
				},
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("cloudflare");
		expect(fetchSpy.mock.calls[0][0]).toBe(
			"https://models.github.ai/inference/chat/completions",
		);
		expect(fetchSpy.mock.calls[1][0]).toBe(
			"https://api.groq.com/openai/v1/chat/completions",
		);
		expect(fetchSpy.mock.calls[2][0]).toBe(
			"https://router.huggingface.co/v1/chat/completions",
		);
		expect(aiRun).toHaveBeenCalled();
	});

	it("falls through to the next provider when GitHub Models returns a 500 server error", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		fetchSpy
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						error:
							"The server had an error while processing your request. Sorry about that!",
					}),
					{ status: 500, headers: { "Content-Type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"answered","answer":"Groq answer","citations":["experience-1"]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("groq");
		expect(fetchSpy.mock.calls[0][0]).toBe(
			"https://models.github.ai/inference/chat/completions",
		);
		expect(fetchSpy.mock.calls[1][0]).toBe(
			"https://api.groq.com/openai/v1/chat/completions",
		);
		expect((await response.json()).choices[0].message.content).toContain(
			"Groq answer",
		);
	});

	it("normalizes Groq messages and falls through when Groq rejects structured output generation", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const aiRun = vi.fn().mockResolvedValue({
			response:
				'{"status":"answered","answer":"Cloudflare answer","citations":["summary"]}',
		});

		fetchSpy
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						error:
							"Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [
					{ role: "system", content: "System instruction" },
					{ role: "developer", content: "Developer instruction" },
					{ role: "user", content: "Tell me about Hassan" },
				],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct-1M",
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				AI: {
					run: aiRun,
				},
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("cloudflare");

		const groqRequestInit = fetchSpy.mock.calls[1][1];
		const groqBody = JSON.parse(groqRequestInit.body);

		expect(groqBody.max_completion_tokens).toBeDefined();
		expect(groqBody.max_tokens).toBeUndefined();
		expect(groqBody.response_format).toBeUndefined();
		expect(groqBody.messages).toEqual([
			{
				role: "system",
				content: "System instruction\n\nDeveloper instruction",
			},
			{
				role: "user",
				content: "Tell me about Hassan",
			},
		]);
		expect(aiRun).toHaveBeenCalled();
	});

	it("falls through to Cloudflare AI when Hugging Face returns a missing answer", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const aiRun = vi.fn().mockResolvedValue({
			response:
				'{"status":"answered","answer":"Cloudflare answer","citations":["experience-1"]}',
		});

		fetchSpy
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"missing","answer":"I don\'t have that information available.","citations":[]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						id: "hf-1",
						object: "chat.completion",
						choices: [
							{
								message: {
									role: "assistant",
									content: "I don't have that information available.",
								},
								finish_reason: "stop",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct-1M",
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				ASSISTANT_PROVIDER_PRIORITY:
					"github-models,groq,huggingface,cloudflare,groq_backup",
				AI: {
					run: aiRun,
				},
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("cloudflare");
		expect(fetchSpy.mock.calls[2][0]).toBe(
			"https://router.huggingface.co/v1/chat/completions",
		);
		const huggingFaceRequestInit = fetchSpy.mock.calls[2][1];
		const huggingFaceBody = JSON.parse(huggingFaceRequestInit.body);
		expect(huggingFaceBody.response_format).toBeUndefined();
		expect(aiRun).toHaveBeenCalled();
		expect((await response.json()).choices[0].message.content).toContain(
			"Cloudflare answer",
		);
	});

	it("recovers a valid assistant payload when Cloudflare AI echoes the schema wrapper", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const aiRun = vi.fn().mockResolvedValue({
			response: {
				name: "resume_assistant_response",
				schema: {
					type: "object",
					properties: {
						status: "rejected",
						answer: "I don't have that information available.",
						citations: [],
					},
				},
			},
		});

		fetchSpy
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct",
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
				AI: {
					run: aiRun,
				},
			},
		);

		const payload = await response.json();
		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("cloudflare");
		expect(JSON.parse(payload.choices[0].message.content)).toEqual({
			status: "missing",
			answer: "I don't have that information available.",
			citations: [],
		});
		expect(aiRun).toHaveBeenCalledWith(
			"@cf/meta/llama-3.3-70b-instruct-fp8-fast",
			expect.objectContaining({
				response_format: {
					type: "json_schema",
					json_schema: {
						type: "object",
						properties: {
							status: { type: "string" },
							answer: { type: "string" },
							citations: { type: "array", items: { type: "string" } },
						},
						required: ["status", "answer", "citations"],
					},
				},
			}),
		);
	});

	it("preserves structured output for Cloudflare when returning a valid answered payload", async () => {
		const aiRun = vi.fn().mockResolvedValue({
			response: {
				status: "answered",
				answer:
					"Hassan built AI-driven portfolio and resume assistant workflows.",
				citations: ["summary"],
			},
		});

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
				AI: {
					run: aiRun,
				},
				ASSISTANT_PROVIDER_PRIORITY: "cloudflare,portfolio-rag",
			},
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("cloudflare");
		expect(JSON.parse(payload.choices[0].message.content)).toEqual({
			status: "answered",
			answer:
				"Hassan built AI-driven portfolio and resume assistant workflows.",
			citations: ["summary"],
		});
		expect(aiRun).toHaveBeenCalledWith(
			"@cf/meta/llama-3.3-70b-instruct-fp8-fast",
			expect.objectContaining({
				response_format: {
					type: "json_schema",
					json_schema: {
						type: "object",
						properties: {
							status: { type: "string" },
							answer: { type: "string" },
							citations: { type: "array", items: { type: "string" } },
						},
						required: ["status", "answer", "citations"],
					},
				},
			}),
		);
	});

	it("falls through when Cloudflare returns a title-only answer", async () => {
		const aiRun = vi
			.fn()
			.mockResolvedValueOnce({
				response: {
					status: "answered",
					answer: "Designing Observability for Distributed Systems",
					citations: [
						"article:designing-observability-for-distributed-systems",
					],
				},
			})
			.mockResolvedValueOnce({
				data: [[0.1, 0.2, 0.3]],
			})
			.mockResolvedValueOnce({
				response:
					'{"status":"answered","answer":"The article explains how observability should provide real-time insight into system behavior, failures, and changes over time.","citations":["article:designing-observability-for-distributed-systems:summary:0"]}',
			});

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [
					{
						role: "developer",
						content:
							"SUPPORTING_RESUME_SNIPPETS:\n[article:designing-observability-for-distributed-systems] Designing Observability for Distributed Systems\nDate: 2026-02-23\nThis article explains observability in distributed systems.",
					},
					{
						role: "user",
						content:
							"Tell me about Designing Observability for Distributed Systems",
					},
				],
			}),
			{
				...env,
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
				AI: {
					run: aiRun,
				},
				VECTOR_INDEX: {
					query: vi.fn().mockResolvedValue({
						matches: [
							{
								id: "vec-1",
								score: 0.91,
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
						id: "article:designing-observability-for-distributed-systems:summary:0",
						text: "The article explains how observability should provide real-time insight into system behavior, failures, and changes over time.",
						sourceType: "article",
						title: "Designing Observability for Distributed Systems",
						slug: "designing-observability-for-distributed-systems",
						url: "https://example.com/articles/designing-observability-for-distributed-systems",
						section: "summary",
					}),
				}),
				RAG_CHAT_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				RAG_EMBED_MODEL: "@cf/baai/bge-small-en-v1.5",
				RAG_TOP_K: "6",
				RAG_SIMILARITY_THRESHOLD: "0.72",
				RAG_MAX_CONTEXT_CHUNKS: "4",
				RAG_MAX_OUTPUT_TOKENS: "300",
				ASSISTANT_PROVIDER_PRIORITY: "cloudflare,portfolio-rag",
			},
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("portfolio-rag");
		expect(JSON.parse(payload.choices[0].message.content)).toMatchObject({
			status: "answered",
			answer:
				"The article explains how observability should provide real-time insight into system behavior, failures, and changes over time.",
		});
	});

	it("falls through when Cloudflare returns a question fragment", async () => {
		const aiRun = vi
			.fn()
			.mockResolvedValueOnce({
				response: {
					status: "answered",
					answer: "What is happening right now?",
					citations: [
						"article:designing-observability-for-distributed-systems",
					],
				},
			})
			.mockResolvedValueOnce({
				data: [[0.1, 0.2, 0.3]],
			})
			.mockResolvedValueOnce({
				response:
					'{"status":"answered","answer":"The article argues that observability should answer what the system is doing now, where failures happen, how behavior changes over time, and what changed before incidents.","citations":["article:designing-observability-for-distributed-systems:summary:0"]}',
			});

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [
					{
						role: "developer",
						content:
							"SUPPORTING_RESUME_SNIPPETS:\n[article:designing-observability-for-distributed-systems] Designing Observability for Distributed Systems\nDate: 2026-02-23\nWhat observability should provide includes understanding what is happening right now and where failures occur.",
					},
					{
						role: "user",
						content:
							"Tell me about Designing Observability for Distributed Systems",
					},
				],
			}),
			{
				...env,
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
				AI: {
					run: aiRun,
				},
				VECTOR_INDEX: {
					query: vi.fn().mockResolvedValue({
						matches: [
							{
								id: "vec-1",
								score: 0.91,
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
						id: "article:designing-observability-for-distributed-systems:summary:0",
						text: "The article argues that observability should answer what the system is doing now, where failures happen, how behavior changes over time, and what changed before incidents.",
						sourceType: "article",
						title: "Designing Observability for Distributed Systems",
						slug: "designing-observability-for-distributed-systems",
						url: "https://example.com/articles/designing-observability-for-distributed-systems",
						section: "summary",
					}),
				}),
				RAG_CHAT_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				RAG_EMBED_MODEL: "@cf/baai/bge-small-en-v1.5",
				RAG_TOP_K: "6",
				RAG_SIMILARITY_THRESHOLD: "0.72",
				RAG_MAX_CONTEXT_CHUNKS: "4",
				RAG_MAX_OUTPUT_TOKENS: "300",
				ASSISTANT_PROVIDER_PRIORITY: "cloudflare,portfolio-rag",
			},
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("portfolio-rag");
		expect(JSON.parse(payload.choices[0].message.content)).toMatchObject({
			status: "answered",
			answer:
				"The article argues that observability should answer what the system is doing now, where failures happen, how behavior changes over time, and what changed before incidents.",
		});
	});

	it("normalizes Hugging Face array-string JSON into a canonical missing response", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		fetchSpy
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						id: "hf-response",
						object: "chat.completion",
						model: "Qwen/Qwen2.5-7B-Instruct-Turbo",
						choices: [
							{
								index: 0,
								finish_reason: "stop",
								message: {
									role: "assistant",
									content: '["I don\'t have that information available."]',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "resume_assistant_response",
						schema: {
							type: "object",
							properties: {
								status: { type: "string" },
								answer: { type: "string" },
								citations: { type: "array", items: { type: "string" } },
							},
							required: ["status", "answer", "citations"],
						},
					},
				},
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct",
				ASSISTANT_PROVIDER_PRIORITY:
					"github-models,groq,huggingface,groq_backup",
			},
		);

		const payload = await response.json();
		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("huggingface");
		expect(JSON.parse(payload.choices[0].message.content)).toEqual({
			status: "missing",
			answer: "I don't have that information available.",
			citations: [],
		});
	});

	it("falls back to Groq when GitHub Models rate limits", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		fetchSpy
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"answered","answer":"Groq answer","citations":["experience-1"]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "llama-3.3-70b-versatile",
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("groq");
		expect(fetchSpy.mock.calls[0][0]).toBe(
			"https://models.github.ai/inference/chat/completions",
		);
		expect(fetchSpy.mock.calls[1][0]).toBe(
			"https://api.groq.com/openai/v1/chat/completions",
		);
		expect((await response.json()).choices[0].message.content).toContain(
			"Groq answer",
		);
	});

	it("rotates Groq API keys across consecutive Groq requests", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		resetGroqApiKeyRotation();

		fetchSpy
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"answered","answer":"Groq answer one","citations":["summary"]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"answered","answer":"Groq answer two","citations":["summary"]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"answered","answer":"Groq answer three","citations":["summary"]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const fullEnv = {
			...env,
			GROQ_API_KEY: "groq_test_1",
			GROQ_API_KEY_V2: "groq_test_2",
			GROQ_API_KEY_V3: "groq_test_3",
			GROQ_MODEL: "llama-3.3-70b-versatile",
			ASSISTANT_PROVIDER_PRIORITY: "groq",
		};

		for (const prompt of ["one", "two", "three"]) {
			const response = await worker.fetch(
				buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
					action: "chat",
					model: "openai/gpt-4.1-mini",
					messages: [{ role: "user", content: `Tell me ${prompt}` }],
				}),
				fullEnv,
			);

			expect(response.status).toBe(200);
			expect(response.headers.get("X-Assistant-Provider")).toBe("groq");
		}

		expect(fetchSpy).toHaveBeenCalledTimes(3);
		expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe(
			"Bearer groq_test_1",
		);
		expect(fetchSpy.mock.calls[1][1].headers.Authorization).toBe(
			"Bearer groq_test_2",
		);
		expect(fetchSpy.mock.calls[2][1].headers.Authorization).toBe(
			"Bearer groq_test_3",
		);
	});

	it("falls back to Hugging Face before Cloudflare AI", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		fetchSpy
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"answered","answer":"HF answer","citations":["experience-1"]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "llama-3.3-70b-versatile",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct-1M",
				ASSISTANT_PROVIDER_PRIORITY:
					"github-models,groq,huggingface,groq_backup",
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("huggingface");
		expect(fetchSpy.mock.calls[1][0]).toBe(
			"https://api.groq.com/openai/v1/chat/completions",
		);
		expect(fetchSpy.mock.calls[2][0]).toBe(
			"https://router.huggingface.co/v1/chat/completions",
		);
		expect((await response.json()).choices[0].message.content).toContain(
			"HF answer",
		);
	});

	it("returns a graceful assistant payload when every provider rate limits", async () => {
		const aiRun = vi.fn().mockRejectedValue(new Error("upstream unavailable"));

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "provider unavailable" }), {
					status: 503,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "llama-3.3-70b-versatile",
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				AI: {
					run: aiRun,
				},
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct-1M",
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe(
			"rate-limit-fallback",
		);
		expect(response.headers.get("X-Assistant-Rate-Limited")).toBe("true");
		expect(JSON.parse(data.choices[0].message.content)).toEqual({
			status: "missing",
			answer: "I don't have that information available.",
			citations: [],
		});
	});

	it("falls through when Groq returns a truncated plain-text answer", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response("Too many requests. Please try again later.", {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						id: "chatcmpl-groq-1",
						object: "chat.completion",
						created: 1776807592,
						model: "openai/gpt-oss-120b",
						choices: [
							{
								index: 0,
								message: {
									role: "assistant",
									content:
										"**Recent Projects**\n\n1. **Building a Resume-Native AI Assistant for My Portfolio** – Designed an",
									reasoning:
										"We need to list recent projects from the provided snippets.",
								},
								finish_reason: "length",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						id: "hf-plain-missing",
						object: "chat.completion",
						choices: [
							{
								message: {
									role: "assistant",
									content: "I don't have that information available.",
								},
								finish_reason: "stop",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const aiRun = vi.fn().mockResolvedValue({
			response: {
				status: "answered",
				answer:
					"Based on the provided snippets, Hassan Raza's recent projects include Building a Resume-Native AI Assistant for My Portfolio, Designing a Content System That Scales Beyond a Portfolio, and Building Financial Infrastructure for Modern Nonprofits.",
				citations: [
					"project:building-a-resume-native-ai-assistant",
					"project:building-financial-infrastructure-for-modern-nonprofits",
					"case-study:designing-a-content-system-that-scales-beyond-a-portoflio",
				],
			},
		});

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [{ role: "user", content: "list his recent projects" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-120b",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				AI: {
					run: aiRun,
				},
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct",
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("cloudflare");
		expect(fetchSpy.mock.calls[1][0]).toBe(
			"https://api.groq.com/openai/v1/chat/completions",
		);
		expect(fetchSpy.mock.calls[2][0]).toBe(
			"https://api.groq.com/openai/v1/chat/completions",
		);
		expect(fetchSpy.mock.calls[3][0]).toBe(
			"https://router.huggingface.co/v1/chat/completions",
		);
		expect(aiRun).toHaveBeenCalled();
		expect(JSON.parse(data.choices[0].message.content)).toMatchObject({
			status: "answered",
			citations: expect.arrayContaining([
				"project:building-a-resume-native-ai-assistant",
				"project:building-financial-infrastructure-for-modern-nonprofits",
				"case-study:designing-a-content-system-that-scales-beyond-a-portoflio",
			]),
		});
	});

	it("falls back past GitHub Models on server failures", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		fetchSpy
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "bad gateway" }), {
					status: 502,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"answered","answer":"Hugging Face answer","citations":["summary"]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [{ role: "user", content: "Tell me about Hassan" }],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct-1M",
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("huggingface");
		expect(JSON.parse(data.choices[0].message.content)).toEqual({
			status: "answered",
			answer: "Hugging Face answer",
			citations: ["summary"],
		});
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it("falls back to portfolio-rag after other providers miss or fail", async () => {
		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate limited" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "provider unavailable" }), {
					status: 503,
					headers: { "Content-Type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"missing","answer":"I don\'t have that information available.","citations":[]}',
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const aiRun = vi
			.fn()
			.mockResolvedValueOnce({
				data: [[0.1, 0.2, 0.3]],
			})
			.mockResolvedValueOnce({
				response:
					'{"status":"answered","answer":"Hassan worked on payment infrastructure at Overflow.","citations":["experience:overflow:overview:0"]}',
			});

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [
					{
						role: "user",
						content: "Has Hassan worked on payment infrastructure?",
					},
				],
			}),
			{
				...env,
				GITHUB_MODELS_TOKEN: "ghm_test",
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
				HUGGING_FACE_API_TOKEN: "hf_test",
				HUGGING_FACE_MODEL: "Qwen/Qwen2.5-7B-Instruct-1M",
				AI: {
					run: aiRun,
				},
				VECTOR_INDEX: {
					query: vi.fn().mockResolvedValue({
						matches: [
							{
								id: "vec-1",
								score: 0.91,
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
						text: "Designed and implemented backend systems supporting high-volume donation processing across ACH, cards, stock, crypto, and donor-advised funds.",
						sourceType: "experience",
						title: "Senior Software Engineer at Overflow App Inc",
						slug: "overflow",
						url: "https://example.com/about",
						section: "overview",
					}),
				}),
				RAG_CHAT_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				RAG_EMBED_MODEL: "@cf/baai/bge-small-en-v1.5",
				RAG_TOP_K: "6",
				RAG_SIMILARITY_THRESHOLD: "0.72",
				RAG_MAX_CONTEXT_CHUNKS: "4",
				RAG_MAX_OUTPUT_TOKENS: "300",
			},
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("portfolio-rag");
		expect(JSON.parse(payload.choices[0].message.content)).toMatchObject({
			status: "answered",
			answer: "Hassan worked on payment infrastructure at Overflow.",
			citations: ["experience:overflow:overview:0"],
		});
	});

	it("falls back to groq_backup when the primary groq provider misses", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		fetchSpy
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"missing","answer":"I don\'t have that information available.","citations":[]}',
								},
								finish_reason: "stop",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content:
										'{"status":"answered","answer":"Groq backup handled it.","citations":["summary"]}',
								},
								finish_reason: "stop",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [
					{ role: "user", content: "How much experience does Hassan have?" },
				],
			}),
			{
				...env,
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-20b",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				ASSISTANT_PROVIDER_PRIORITY: "groq,groq_backup,portfolio-rag",
			},
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("groq_backup");
		expect(JSON.parse(payload.choices[0].message.content)).toEqual({
			status: "answered",
			answer: "Groq backup handled it.",
			citations: ["summary"],
		});
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it("skips groq_backup and continues to Cloudflare when Groq hits capacity limits", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const aiRun = vi.fn().mockResolvedValue({
			response:
				'{"status":"answered","answer":"Cloudflare answer","citations":["summary"]}',
		});

		fetchSpy.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					error:
						"Rate limit reached for model `openai/gpt-oss-120b` on tokens per day",
				}),
				{ status: 429, headers: { "Content-Type": "application/json" } },
			),
		);

		const response = await worker.fetch(
			buildPathRequest("/assistant-routed", "POST", ALLOWED_ORIGIN, {
				action: "chat",
				model: "openai/gpt-4.1-mini",
				messages: [
					{ role: "user", content: "How much experience does Hassan have?" },
				],
			}),
			{
				...env,
				GROQ_API_KEY: "groq_test",
				GROQ_MODEL: "openai/gpt-oss-120b",
				GROQ_BACKUP_MODEL: "llama-3.1-8b-instant",
				CLOUDFLARE_AI_MODEL: "@cf/meta/llama-3.1-8b-instruct",
				AI: {
					run: aiRun,
				},
				ASSISTANT_PROVIDER_PRIORITY: "groq,groq_backup,cloudflare",
			},
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Assistant-Provider")).toBe("cloudflare");
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(aiRun).toHaveBeenCalledTimes(1);
		expect(JSON.parse(payload.choices[0].message.content)).toEqual({
			status: "answered",
			answer: "Cloudflare answer",
			citations: ["summary"],
		});
	});
});

describe("/contact email delivery", () => {
	const emailEnv = {
		...env,
		RESEND_API_KEY: "re_test_key",
		CONTACT_EMAIL: "inbox@example.com",
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sends email via Resend template when secrets are configured", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
			);

		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		const response = await worker.fetch(request, emailEnv);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);

		const resendCall = fetchSpy.mock.calls.find(
			(call) => call[0] === "https://api.resend.com/emails",
		);
		expect(resendCall).toBeDefined();

		const payload = JSON.parse(resendCall[1].body);
		expect(payload.to).toEqual(["inbox@example.com"]);
		expect(payload.subject).toBe(
			`[Message from ${validPayload.name}] ${validPayload.subject}`,
		);
		expect(payload.reply_to).toBe(validPayload.email);
		expect(payload.template.id).toBe("contact-form-submission");
		expect(payload.template.variables.sender_name).toBe(validPayload.name);
		expect(payload.template.variables.sender_email).toBe(validPayload.email);
		expect(payload.template.variables.sender_phone).toBe(validPayload.phone);
		expect(payload.template.variables.subject).toBe(validPayload.subject);
		expect(payload.template.variables.message).toBe(validPayload.message);
		expect(payload.template.variables.submitted_at).toBeDefined();
	});

	it("includes phone number in template data when provided", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
			);

		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		await worker.fetch(request, emailEnv);

		const resendCall = fetchSpy.mock.calls.find(
			(call) => call[0] === "https://api.resend.com/emails",
		);
		expect(resendCall).toBeDefined();
		const payload = JSON.parse(resendCall[1].body);
		expect(payload.template.variables.sender_phone).toBe(validPayload.phone);
	});

	it("sends empty phone in template data when phone is not provided", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
			);

		const { phone, ...payloadWithoutPhone } = validPayload;
		const request = buildRequest("POST", ALLOWED_ORIGIN, payloadWithoutPhone);
		await worker.fetch(request, emailEnv);

		const resendCall = fetchSpy.mock.calls.find(
			(call) => call[0] === "https://api.resend.com/emails",
		);
		expect(resendCall).toBeDefined();
		const payload = JSON.parse(resendCall[1].body);
		expect(payload.template.variables.sender_phone).toBe("");
	});

	it("returns 502 when Resend API returns an error", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ error: "Invalid API key" }), {
				status: 403,
			}),
		);

		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		const response = await worker.fetch(request, emailEnv);
		const data = await response.json();

		expect(response.status).toBe(502);
		expect(data.error).toBe(
			"Unable to deliver your message. Please try again later.",
		);
	});

	it("uses default from email noreply@contact.hassanraza.us", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
			);

		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		await worker.fetch(request, emailEnv);

		const resendCall = fetchSpy.mock.calls.find(
			(call) => call[0] === "https://api.resend.com/emails",
		);
		expect(resendCall).toBeDefined();
		const payload = JSON.parse(resendCall[1].body);
		expect(payload.from).toContain("noreply@contact.hassanraza.us");
	});

	it("uses custom FROM_EMAIL when configured", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
			);

		const customEnv = { ...emailEnv, FROM_EMAIL: "custom@example.com" };
		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		await worker.fetch(request, customEnv);

		const resendCall = fetchSpy.mock.calls.find(
			(call) => call[0] === "https://api.resend.com/emails",
		);
		expect(resendCall).toBeDefined();
		const payload = JSON.parse(resendCall[1].body);
		expect(payload.from).toContain("custom@example.com");
	});

	it("returns 503 when RESEND_API_KEY is missing", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(503);
		expect(data.error).toBe(
			"Service temporarily unavailable. Please try again later.",
		);
	});
});

function buildRequestWithHeaders(
	method,
	origin,
	body,
	extraHeaders = {},
	contentType = "application/json",
) {
	const headers = new Headers();

	if (origin) {
		headers.set("Origin", origin);
	}

	if (contentType) {
		headers.set("Content-Type", contentType);
	}

	for (const [key, value] of Object.entries(extraHeaders)) {
		headers.set(key, value);
	}

	const init = { method, headers };

	if (body !== undefined) {
		init.body = JSON.stringify(body);
	}

	return new Request("https://worker.test/contact", init);
}

describe("/contact honeypot", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("silently accepts when _hp honeypot field is filled (bot trap)", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			_hp: "I am a bot",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.message).toBe("Message received");
	});

	it("does not send email when honeypot is triggered", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			_hp: "bot content",
		});
		await worker.fetch(request, env);

		const resendCall = fetchSpy.mock.calls.find(
			(call) => call[0] === "https://api.resend.com/emails",
		);
		expect(resendCall).toBeUndefined();
	});

	it("proceeds normally when _hp is empty", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
		);

		const fullEnv = {
			...env,
			RESEND_API_KEY: "re_test_key",
			CONTACT_EMAIL: "inbox@example.com",
		};
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			_hp: "",
		});
		const response = await worker.fetch(request, fullEnv);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});
});

describe("/contact Turnstile verification", () => {
	const turnstileEnv = {
		...env,
		RESEND_API_KEY: "re_test_key",
		CONTACT_EMAIL: "inbox@example.com",
		TURNSTILE_SECRET_KEY: "ts_secret_test",
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 403 when TURNSTILE_SECRET_KEY is set but token is missing", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		const response = await worker.fetch(request, turnstileEnv);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Bot verification is required");
	});

	it("returns 403 when Turnstile verification fails", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ success: false }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			turnstileToken: "invalid-token",
		});
		const response = await worker.fetch(request, turnstileEnv);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Bot verification failed");
	});

	it("proceeds when Turnstile verification succeeds", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(async (url) => {
				if (
					url === "https://challenges.cloudflare.com/turnstile/v0/siteverify"
				) {
					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				return new Response(JSON.stringify({ id: "email_123" }), {
					status: 200,
				});
			});

		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			turnstileToken: "valid-token",
		});
		const response = await worker.fetch(request, turnstileEnv);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);

		const turnstileCall = fetchSpy.mock.calls.find(
			(call) =>
				call[0] === "https://challenges.cloudflare.com/turnstile/v0/siteverify",
		);
		expect(turnstileCall).toBeDefined();
	});

	it("skips Turnstile check when TURNSTILE_SECRET_KEY is not set", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
			);

		const envWithoutTurnstile = {
			...env,
			RESEND_API_KEY: "re_test_key",
			CONTACT_EMAIL: "inbox@example.com",
		};
		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		const response = await worker.fetch(request, envWithoutTurnstile);

		expect(response.status).toBe(200);

		const turnstileCall = fetchSpy.mock.calls.find(
			(call) =>
				call[0] === "https://challenges.cloudflare.com/turnstile/v0/siteverify",
		);
		expect(turnstileCall).toBeUndefined();
	});
});

describe("/contact rate limiting", () => {
	const fullEnv = {
		...env,
		RESEND_API_KEY: "re_test_key",
		CONTACT_EMAIL: "inbox@example.com",
	};

	beforeEach(() => {
		resetRateLimitState();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		resetRateLimitState();
	});

	it("returns 429 after exceeding rate limit from same IP", async () => {
		for (let i = 0; i < 5; i++) {
			const request = buildRequestWithHeaders(
				"POST",
				ALLOWED_ORIGIN,
				validPayload,
				{ "CF-Connecting-IP": "192.168.1.100" },
			);
			const response = await worker.fetch(request, fullEnv);
			expect(response.status).toBe(200);
		}

		const request = buildRequestWithHeaders(
			"POST",
			ALLOWED_ORIGIN,
			validPayload,
			{ "CF-Connecting-IP": "192.168.1.100" },
		);
		const response = await worker.fetch(request, fullEnv);
		const data = await response.json();

		expect(response.status).toBe(429);
		expect(data.error).toBe("Too many requests. Please try again later.");
	});

	it("allows requests from different IPs independently", async () => {
		for (let i = 0; i < 5; i++) {
			const request = buildRequestWithHeaders(
				"POST",
				ALLOWED_ORIGIN,
				validPayload,
				{ "CF-Connecting-IP": "10.0.0.1" },
			);
			await worker.fetch(request, fullEnv);
		}

		const request = buildRequestWithHeaders(
			"POST",
			ALLOWED_ORIGIN,
			validPayload,
			{ "CF-Connecting-IP": "10.0.0.2" },
		);
		const response = await worker.fetch(request, fullEnv);

		expect(response.status).toBe(200);
	});

	it("does not rate-limit when no IP header is present", async () => {
		for (let i = 0; i < 10; i++) {
			const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
			const response = await worker.fetch(request, fullEnv);
			expect(response.status).toBe(200);
		}
	});

	it("prunes expired entries from other IPs during global sweep", async () => {
		const now = Date.now();
		vi.spyOn(Date, "now").mockReturnValue(now);

		rateLimitMap.set("expired-ip-1", { timestamps: [now - 11 * 60 * 1000] });
		rateLimitMap.set("expired-ip-2", { timestamps: [now - 20 * 60 * 1000] });

		expect(rateLimitMap.has("expired-ip-1")).toBe(true);
		expect(rateLimitMap.has("expired-ip-2")).toBe(true);

		const request = buildRequestWithHeaders(
			"POST",
			ALLOWED_ORIGIN,
			validPayload,
			{ "CF-Connecting-IP": "10.0.0.50" },
		);
		await worker.fetch(request, fullEnv);

		expect(rateLimitMap.has("expired-ip-1")).toBe(false);
		expect(rateLimitMap.has("expired-ip-2")).toBe(false);
		expect(rateLimitMap.has("10.0.0.50")).toBe(true);
	});
});
