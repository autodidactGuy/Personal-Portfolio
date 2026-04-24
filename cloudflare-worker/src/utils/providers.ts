import { extractQuestionFromMessages, runRagQuestion } from "../rag/service";
import type { RagEnv } from "../rag/types";
import { corsHeaders, jsonResponse, parseMaybeJsonResponse } from "./http";

const ASSISTANT_MISSING_MESSAGE = "I don't have that information available.";
const ASSISTANT_REJECTED_MESSAGE =
	"I can only answer questions based on the information available on this site.";
const SNIPPET_ID_PATTERN =
	/\b(summary|about|skills|links|contact|hero|focus|stats|experience:[a-z0-9-]+|education:[a-z0-9-]+|project:[a-z0-9-]+|article:[a-z0-9-]+|case-study:[a-z0-9-]+|recommendation:[a-z0-9-]+)\b/gi;

type AssistantMessage = {
	role: "system" | "developer" | "user" | "assistant";
	content: string;
};

type AssistantChatBody = {
	model?: string;
	temperature?: number;
	max_tokens?: number;
	response_format?: Record<string, unknown>;
	messages: AssistantMessage[];
};

type ProviderAttempt = {
	provider: string;
	status: number;
	error: string | null;
};

type RoutedProviderId =
	| "github-models"
	| "groq"
	| "groq_backup"
	| "huggingface"
	| "cloudflare"
	| "portfolio-rag";

type WorkerProviderEnv = Record<string, unknown> & {
	ASSISTANT_PROVIDER_PRIORITY?: string;
	GITHUB_MODELS_TOKEN?: string;
	GITHUB_MODELS_CHAT_MODEL?: string;
	GROQ_API_KEY?: string;
	GROQ_MODEL?: string;
	GROQ_BACKUP_MODEL?: string;
	HUGGING_FACE_API_TOKEN?: string;
	HUGGING_FACE_MODEL?: string;
	CLOUDFLARE_AI_MODEL?: string;
	RAG_CHAT_MODEL?: string;
	AI?: {
		run(model: string, input: Record<string, unknown>): Promise<unknown>;
	};
};

type AssistantFetchResponse = {
	ok: boolean;
	status: number;
	payload: unknown;
	provider: string;
};

type AssistantChoice = {
	message?: {
		role?: string;
		content?: string;
	};
	[key: string]: unknown;
};

const DEFAULT_ROUTED_PROVIDER_PRIORITY: RoutedProviderId[] = [
	"github-models",
	"groq",
	"groq_backup",
	"huggingface",
	"cloudflare",
	"portfolio-rag",
];

function toChatCompletionsPayload(content: string, model: string) {
	return {
		id: crypto.randomUUID(),
		object: "chat.completion",
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				finish_reason: "stop",
				message: {
					role: "assistant",
					content,
				},
			},
		],
	};
}

function inferAssistantStatusFromAnswer(answer: string) {
	const normalizedAnswer = String(answer || "").trim();

	if (normalizedAnswer === ASSISTANT_MISSING_MESSAGE) {
		return "missing";
	}

	if (normalizedAnswer === ASSISTANT_REJECTED_MESSAGE) {
		return "rejected";
	}

	return "answered";
}

function extractKnownAssistantAnswer(rawValue: unknown) {
	const stringValue = String(rawValue || "");

	if (!stringValue.trim()) {
		return null;
	}

	if (stringValue.includes(ASSISTANT_MISSING_MESSAGE)) {
		return ASSISTANT_MISSING_MESSAGE;
	}

	if (stringValue.includes(ASSISTANT_REJECTED_MESSAGE)) {
		return ASSISTANT_REJECTED_MESSAGE;
	}

	const quotedAnswerMatch = stringValue.match(/"([^"\n]{8,})"/);

	if (quotedAnswerMatch?.[1]) {
		return quotedAnswerMatch[1].trim();
	}

	return null;
}

function extractSnippetIdsFromText(rawValue: unknown) {
	const stringValue = String(rawValue || "");

	if (!stringValue.trim()) {
		return [];
	}

	const matches = stringValue.match(SNIPPET_ID_PATTERN) || [];

	return Array.from(new Set(matches.map((match) => match.toLowerCase())));
}

function coerceAssistantStructuredObject(value: unknown) {
	if (!value) {
		return null;
	}

	if (
		typeof value === "object" &&
		value !== null &&
		"status" in value &&
		"answer" in value &&
		"citations" in value &&
		typeof value.status === "string" &&
		typeof value.answer === "string" &&
		Array.isArray(value.citations)
	) {
		const extractedCitations = extractSnippetIdsFromText(value.answer);

		return {
			status: value.status,
			answer: value.answer,
			citations: Array.from(
				new Set([
					...value.citations.filter(
						(citation): citation is string => typeof citation === "string",
					),
					...extractedCitations,
				]),
			),
		};
	}

	if (typeof value === "string") {
		const answer = extractKnownAssistantAnswer(value) || value.trim();

		if (!answer) {
			return null;
		}

		return {
			status: inferAssistantStatusFromAnswer(answer),
			answer,
			citations: extractSnippetIdsFromText(answer),
		};
	}

	if (Array.isArray(value)) {
		const answer = value
			.filter((item): item is string => typeof item === "string")
			.map((item) => item.trim())
			.filter(Boolean)
			.join(" ");

		if (!answer) {
			return null;
		}

		return {
			status: inferAssistantStatusFromAnswer(answer),
			answer,
			citations: extractSnippetIdsFromText(answer),
		};
	}

	if (
		typeof value === "object" &&
		value !== null &&
		"schema" in value &&
		typeof value.schema === "object" &&
		value.schema !== null &&
		"properties" in value.schema &&
		typeof value.schema.properties === "object" &&
		value.schema.properties !== null
	) {
		const properties = value.schema.properties as {
			status?: unknown;
			answer?: unknown;
			citations?: unknown;
		};

		if (
			typeof properties.status === "string" &&
			typeof properties.answer === "string"
		) {
			return {
				status: properties.status,
				answer: properties.answer,
				citations: Array.isArray(properties.citations)
					? properties.citations.filter(
							(citation): citation is string => typeof citation === "string",
						)
					: [],
			};
		}
	}

	if (typeof value === "object") {
		const extractedAnswer = extractKnownAssistantAnswer(JSON.stringify(value));

		if (extractedAnswer) {
			return {
				status: inferAssistantStatusFromAnswer(extractedAnswer),
				answer: extractedAnswer,
				citations: extractSnippetIdsFromText(JSON.stringify(value)),
			};
		}
	}

	return null;
}

function normalizeAssistantChatPayload(
	payload: unknown,
	fallbackModel = "assistant",
) {
	if (
		!payload ||
		typeof payload !== "object" ||
		!("choices" in payload) ||
		!Array.isArray(payload.choices)
	) {
		return payload;
	}

	const rawContent = payload.choices[0]?.message?.content;

	if (typeof rawContent !== "string" || !rawContent.trim()) {
		return payload;
	}

	let parsedContent: unknown;

	try {
		parsedContent = JSON.parse(rawContent);
	} catch {
		parsedContent = rawContent;
	}

	const normalizedContent = coerceAssistantStructuredObject(parsedContent);

	if (!normalizedContent) {
		return payload;
	}

	const typedPayload = payload as {
		model?: string;
		choices: AssistantChoice[];
		[key: string]: unknown;
	};

	return {
		...typedPayload,
		model:
			typeof typedPayload.model === "string" && typedPayload.model.trim()
				? typedPayload.model
				: fallbackModel,
		choices: typedPayload.choices.map((choice, index) =>
			index === 0
				? {
						...choice,
						message: {
							...choice.message,
							role: choice.message?.role || "assistant",
							content: JSON.stringify(normalizedContent),
						},
					}
				: choice,
		),
	};
}

function isIncompleteAssistantChatPayload(payload: unknown) {
	if (
		!payload ||
		typeof payload !== "object" ||
		!("choices" in payload) ||
		!Array.isArray(payload.choices)
	) {
		return false;
	}

	const firstChoice = payload.choices[0];
	const finishReason =
		typeof firstChoice?.finish_reason === "string"
			? firstChoice.finish_reason.trim().toLowerCase()
			: "";

	return finishReason === "length";
}

function getAssistantStructuredStatus(payload: unknown) {
	if (
		!payload ||
		typeof payload !== "object" ||
		!("choices" in payload) ||
		!Array.isArray(payload.choices)
	) {
		return null;
	}

	const rawContent = payload.choices[0]?.message?.content;

	if (typeof rawContent !== "string" || !rawContent.trim()) {
		return null;
	}

	try {
		const parsedContent = JSON.parse(rawContent) as { status?: string };
		return typeof parsedContent?.status === "string"
			? parsedContent.status
			: null;
	} catch {
		return null;
	}
}

function isMissingAssistantResponse(payload: unknown) {
	return getAssistantStructuredStatus(payload) === "missing";
}

function isExpectedAssistantChatPayload(payload: unknown) {
	if (
		!payload ||
		typeof payload !== "object" ||
		!("choices" in payload) ||
		!Array.isArray(payload.choices)
	) {
		return false;
	}

	const rawContent = payload.choices[0]?.message?.content;
	return typeof rawContent === "string" && rawContent.trim().length > 0;
}

function normalizeAssistantErrorPayload(
	payload: unknown,
	fallbackMessage: string,
) {
	if (typeof payload === "string" && payload.trim()) {
		return payload;
	}

	if (payload && typeof payload === "object") {
		const payloadRecord = payload as {
			error?: string | { message?: string };
			message?: string;
		};

		if (typeof payloadRecord.error === "string" && payloadRecord.error.trim()) {
			return payloadRecord.error;
		}

		if (
			payloadRecord.error &&
			typeof payloadRecord.error === "object" &&
			typeof payloadRecord.error.message === "string" &&
			payloadRecord.error.message.trim()
		) {
			return payloadRecord.error.message;
		}

		if (
			typeof payloadRecord.message === "string" &&
			payloadRecord.message.trim()
		) {
			return payloadRecord.message;
		}
	}

	return fallbackMessage;
}

export function isRateLimitLikeFailure(status: number, payload: unknown) {
	if (status === 429) {
		return true;
	}

	const normalizedError = normalizeAssistantErrorPayload(payload, "")
		.toLowerCase()
		.trim();

	return (
		normalizedError.includes("rate limit") ||
		normalizedError.includes("too many requests")
	);
}

function isGroqCapacityLikeFailure(status: number, payload: unknown) {
	const normalizedError = normalizeAssistantErrorPayload(payload, "")
		.toLowerCase()
		.trim();

	return (
		status >= 400 ||
		isRateLimitLikeFailure(status, payload) ||
		normalizedError.includes("rate limit reached") ||
		normalizedError.includes("request too large") ||
		normalizedError.includes("tokens per minute") ||
		normalizedError.includes("tokens per day") ||
		normalizedError.includes("service tier")
	);
}

function isGroqSharedQuotaFailure(status: number, payload: unknown) {
	const normalizedError = normalizeAssistantErrorPayload(payload, "")
		.toLowerCase()
		.trim();

	return (
		status >= 400 ||
		normalizedError.includes("rate limit reached") ||
		normalizedError.includes("request too large") ||
		normalizedError.includes("tokens per minute") ||
		normalizedError.includes("tokens per day") ||
		normalizedError.includes("service tier")
	);
}

function isGroqFallbackWorthyFailure(status: number, payload: unknown) {
	if (status > 400 || isGroqCapacityLikeFailure(status, payload)) {
		return true;
	}

	const normalizedError = normalizeAssistantErrorPayload(payload, "")
		.toLowerCase()
		.trim();

	return (
		normalizedError.includes("failed to generate json") ||
		normalizedError.includes("failed to validate json") ||
		normalizedError.includes("generated json does not match") ||
		normalizedError.includes("json_schema") ||
		normalizedError.includes("response_format") ||
		normalizedError.includes("developer role") ||
		normalizedError.includes("unsupported value") ||
		normalizedError.includes("failed_generation")
	);
}

function isGenericRoutedFallbackWorthyFailure(
	status: number,
	payload: unknown,
) {
	return status >= 400 || isRateLimitLikeFailure(status, payload);
}

function getRoutedProviderPriority(env: WorkerProviderEnv) {
	const configuredPriority = String(env.ASSISTANT_PROVIDER_PRIORITY || "")
		.split(",")
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean) as RoutedProviderId[];

	if (!configuredPriority.length) {
		return DEFAULT_ROUTED_PROVIDER_PRIORITY;
	}

	const ordered = configuredPriority.filter(
		(provider, index, providers) =>
			DEFAULT_ROUTED_PROVIDER_PRIORITY.includes(provider) &&
			providers.indexOf(provider) === index,
	);

	for (const provider of DEFAULT_ROUTED_PROVIDER_PRIORITY) {
		if (!ordered.includes(provider)) {
			ordered.push(provider);
		}
	}

	return ordered;
}

function normalizeAssistantMessagesForGroq(messages: AssistantMessage[]) {
	if (!Array.isArray(messages) || messages.length === 0) {
		return [];
	}

	const normalizedMessages: Array<{ role: string; content: string }> = [];
	let leadingInstructionBlock = "";

	for (const message of messages) {
		if (!message || typeof message.content !== "string") {
			continue;
		}

		if (
			normalizedMessages.length === 0 &&
			(message.role === "system" || message.role === "developer")
		) {
			leadingInstructionBlock = leadingInstructionBlock
				? `${leadingInstructionBlock}\n\n${message.content}`
				: message.content;
			continue;
		}

		normalizedMessages.push({
			role: message.role === "developer" ? "system" : message.role,
			content: message.content,
		});
	}

	if (leadingInstructionBlock) {
		normalizedMessages.unshift({
			role: "system",
			content: leadingInstructionBlock,
		});
	}

	return normalizedMessages;
}

function ensureGroqJsonInstruction(
	messages: Array<{ role: string; content: string }>,
	responseFormat: Record<string, unknown> | undefined,
) {
	if (
		!responseFormat ||
		typeof responseFormat !== "object" ||
		responseFormat.type !== "json_object"
	) {
		return messages;
	}

	const containsJsonInstruction = messages.some(
		(message) =>
			message &&
			typeof message.content === "string" &&
			/\bjson\b/i.test(message.content),
	);

	if (containsJsonInstruction) {
		return messages;
	}

	if (
		messages[0] &&
		messages[0].role === "system" &&
		typeof messages[0].content === "string"
	) {
		return [
			{
				...messages[0],
				content: `${messages[0].content}\n\nReturn valid JSON.`,
			},
			...messages.slice(1),
		];
	}

	return [
		{
			role: "system",
			content: "Return valid JSON.",
		},
		...messages,
	];
}

function normalizeResponseFormatForOpenAiCompat(
	responseFormat: Record<string, unknown> | undefined,
) {
	if (!responseFormat || typeof responseFormat !== "object") {
		return undefined;
	}

	if (responseFormat.type === "json_schema") {
		return { type: "json_object" };
	}

	return responseFormat;
}

function normalizeResponseFormatForCloudflare(
	responseFormat: Record<string, unknown> | undefined,
) {
	if (!responseFormat || typeof responseFormat !== "object") {
		return undefined;
	}

	if (
		responseFormat.type === "json_schema" &&
		typeof responseFormat.json_schema === "object" &&
		responseFormat.json_schema !== null &&
		typeof (responseFormat.json_schema as Record<string, unknown>).schema ===
			"object" &&
		(responseFormat.json_schema as Record<string, unknown>).schema !== null
	) {
		return {
			type: "json_schema",
			json_schema: (responseFormat.json_schema as Record<string, unknown>)
				.schema,
		};
	}

	return responseFormat;
}

function extractCloudflareAssistantContent(result: unknown) {
	const responseResult = result as {
		response?: unknown;
		result?: {
			response?: unknown;
		};
	};
	const candidate =
		responseResult?.response !== undefined
			? responseResult.response
			: responseResult?.result?.response !== undefined
				? responseResult.result.response
				: null;

	if (typeof candidate === "string" && candidate.trim()) {
		return candidate;
	}

	if (!candidate || typeof candidate !== "object") {
		return null;
	}

	const candidateRecord = candidate as {
		status?: unknown;
		answer?: unknown;
		citations?: unknown;
		schema?: {
			properties?: {
				status?: unknown;
				answer?: unknown;
				citations?: unknown;
			};
		};
	};

	if (
		typeof candidateRecord.status === "string" &&
		typeof candidateRecord.answer === "string" &&
		Array.isArray(candidateRecord.citations)
	) {
		return JSON.stringify(candidate);
	}

	const echoedProperties = candidateRecord.schema?.properties;

	if (
		echoedProperties &&
		typeof echoedProperties === "object" &&
		typeof echoedProperties.status === "string" &&
		typeof echoedProperties.answer === "string" &&
		Array.isArray(echoedProperties.citations)
	) {
		return JSON.stringify({
			status: echoedProperties.status,
			answer: echoedProperties.answer,
			citations: echoedProperties.citations,
		});
	}

	return JSON.stringify(candidate);
}

function createAssistantFetchResponse(
	response: Response,
	payload: unknown,
	provider: string,
) {
	return {
		ok: response.ok,
		status: response.status,
		payload,
		provider,
	} satisfies AssistantFetchResponse;
}

function buildProviderContextHeaders(
	provider: string,
	providerAttempts: ProviderAttempt[],
) {
	return {
		"X-Assistant-Provider": provider,
		"X-Assistant-Providers": JSON.stringify(providerAttempts),
	};
}

async function parseJsonResponse(response: Response) {
	return parseMaybeJsonResponse(response);
}

async function callGitHubModelsRaw(
	pathname: string,
	env: WorkerProviderEnv,
	body: Record<string, unknown>,
) {
	if (!env.GITHUB_MODELS_TOKEN) {
		return jsonResponse({ error: "Assistant service is not configured" }, 503);
	}

	try {
		return await fetch(`https://models.github.ai${pathname}`, {
			method: "POST",
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${env.GITHUB_MODELS_TOKEN}`,
				"Content-Type": "application/json",
				"X-GitHub-Api-Version": "2026-03-10",
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		return jsonResponse(
			{
				error:
					error instanceof Error
						? error.message
						: "GitHub Models request failed",
			},
			503,
		);
	}
}

async function callGroqRaw(body: AssistantChatBody, env: WorkerProviderEnv) {
	if (!env.GROQ_API_KEY || !body.model) {
		return jsonResponse({ error: "Groq is not configured" }, 503);
	}

	try {
		const responseFormat = normalizeResponseFormatForOpenAiCompat(
			body.response_format,
		);

		return await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.GROQ_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: body.model,
				temperature: body.temperature ?? 0,
				max_completion_tokens: body.max_tokens ?? 220,
				response_format: responseFormat,
				messages: ensureGroqJsonInstruction(
					normalizeAssistantMessagesForGroq(body.messages),
					responseFormat,
				),
			}),
		});
	} catch (error) {
		return jsonResponse(
			{
				error: error instanceof Error ? error.message : "Groq request failed",
			},
			503,
		);
	}
}

async function callHuggingFaceRaw(
	body: AssistantChatBody,
	env: WorkerProviderEnv,
) {
	if (!env.HUGGING_FACE_API_TOKEN || !env.HUGGING_FACE_MODEL) {
		return jsonResponse({ error: "Hugging Face is not configured" }, 503);
	}

	try {
		return await fetch("https://router.huggingface.co/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.HUGGING_FACE_API_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: body.model || env.HUGGING_FACE_MODEL,
				temperature: body.temperature ?? 0,
				max_tokens: body.max_tokens ?? 220,
				response_format: normalizeResponseFormatForOpenAiCompat(
					body.response_format,
				),
				messages: body.messages,
			}),
		});
	} catch (error) {
		return jsonResponse(
			{
				error:
					error instanceof Error
						? error.message
						: "Hugging Face request failed",
			},
			503,
		);
	}
}

async function callCloudflareRaw(
	body: AssistantChatBody,
	env: WorkerProviderEnv,
) {
	if (!env.AI || !env.CLOUDFLARE_AI_MODEL) {
		return jsonResponse({ error: "Cloudflare AI is not configured" }, 503);
	}

	try {
		const result = await env.AI.run(body.model || env.CLOUDFLARE_AI_MODEL, {
			messages: body.messages,
			temperature: body.temperature ?? 0,
			max_tokens: body.max_tokens ?? 220,
			response_format: normalizeResponseFormatForCloudflare(
				body.response_format,
			) as Record<string, unknown> | undefined,
		});

		return jsonResponse(result, 200);
	} catch (error) {
		return jsonResponse(
			{
				error:
					error instanceof Error
						? error.message
						: "Cloudflare AI request failed",
			},
			503,
		);
	}
}

export async function callRawAssistantProvider(
	provider: string,
	body: AssistantChatBody,
	env: WorkerProviderEnv,
) {
	switch (provider) {
		case "github-models":
			return callGitHubModelsRaw("/inference/chat/completions", env, {
				...body,
				model: body.model || env.GITHUB_MODELS_CHAT_MODEL,
			});
		case "groq":
			return callGroqRaw(
				{
					...body,
					model: body.model || env.GROQ_MODEL,
					response_format: undefined,
				},
				env,
			);
		case "groq_backup":
			return callGroqRaw(
				{
					...body,
					model: body.model || env.GROQ_BACKUP_MODEL,
					response_format: undefined,
				},
				env,
			);
		case "huggingface":
			return callHuggingFaceRaw(
				{
					...body,
					model: body.model || env.HUGGING_FACE_MODEL,
					response_format: undefined,
				},
				env,
			);
		case "cloudflare":
			return callCloudflareRaw(
				{
					...body,
					model: body.model || env.CLOUDFLARE_AI_MODEL,
					response_format: undefined,
				},
				env,
			);
		case "portfolio-rag": {
			const question = extractQuestionFromMessages(body.messages);

			if (!question) {
				return jsonResponse(
					{ error: "Portfolio RAG requires at least one message with content" },
					422,
				);
			}

			try {
				const payload = await runRagQuestion(
					question,
					env as unknown as RagEnv,
				);

				return jsonResponse(
					toChatCompletionsPayload(
						JSON.stringify(payload),
						env.RAG_CHAT_MODEL || "portfolio-rag",
					),
					200,
				);
			} catch (error) {
				return jsonResponse(
					{
						error:
							error instanceof Error
								? error.message
								: "Portfolio RAG request failed",
					},
					503,
				);
			}
		}
		default:
			return jsonResponse({ error: "Unsupported provider" }, 422);
	}
}

export async function callGitHubModels(
	pathname: string,
	env: WorkerProviderEnv,
	body: Record<string, unknown>,
) {
	const response = await callGitHubModelsRaw(pathname, env, body);
	const payload = await parseMaybeJsonResponse(response.clone());

	return jsonResponse(
		typeof payload === "string" ? { error: payload } : payload,
		response.status,
	);
}

async function callCloudflareAi(
	body: AssistantChatBody,
	env: WorkerProviderEnv,
) {
	const rawResponse = await callCloudflareRaw(
		{
			...body,
			model: env.CLOUDFLARE_AI_MODEL,
			response_format: undefined,
		},
		env,
	);
	const payload = await parseJsonResponse(rawResponse.clone());

	if (!rawResponse.ok) {
		return createAssistantFetchResponse(rawResponse, payload, "cloudflare");
	}

	const rawContent = extractCloudflareAssistantContent(payload);

	if (!rawContent) {
		return createAssistantFetchResponse(
			new Response(null, { status: 502 }),
			{ error: "Cloudflare AI returned an empty response" },
			"cloudflare",
		);
	}

	return createAssistantFetchResponse(
		new Response(null, { status: 200 }),
		toChatCompletionsPayload(
			rawContent,
			env.CLOUDFLARE_AI_MODEL || "cloudflare",
		),
		"cloudflare",
	);
}

async function callGroq(body: AssistantChatBody, env: WorkerProviderEnv) {
	const rawResponse = await callGroqRaw(
		{
			...body,
			model: env.GROQ_MODEL,
			response_format: undefined,
		},
		env,
	);

	return createAssistantFetchResponse(
		rawResponse,
		await parseJsonResponse(rawResponse.clone()),
		"groq",
	);
}

async function callGroqBackup(body: AssistantChatBody, env: WorkerProviderEnv) {
	const rawResponse = await callGroqRaw(
		{
			...body,
			model: env.GROQ_BACKUP_MODEL,
			response_format: undefined,
		},
		env,
	);

	return createAssistantFetchResponse(
		rawResponse,
		await parseJsonResponse(rawResponse.clone()),
		"groq_backup",
	);
}

async function callHuggingFace(
	body: AssistantChatBody,
	env: WorkerProviderEnv,
) {
	const rawResponse = await callHuggingFaceRaw(
		{
			...body,
			model: env.HUGGING_FACE_MODEL,
			response_format: undefined,
		},
		env,
	);

	return createAssistantFetchResponse(
		rawResponse,
		await parseJsonResponse(rawResponse.clone()),
		"huggingface",
	);
}

export function createGracefulRateLimitedAssistantPayload(
	model: string | null,
) {
	return toChatCompletionsPayload(
		JSON.stringify({
			status: "missing",
			answer: ASSISTANT_MISSING_MESSAGE,
			citations: [],
		}),
		model || "rate-limit-fallback",
	);
}

export function createGracefulRateLimitedAssistantResponse(
	model: string | null,
	origin: string | null,
	provider: string,
) {
	return jsonResponse(createGracefulRateLimitedAssistantPayload(model), 200, {
		...(origin ? corsHeaders(origin) : {}),
		"X-Assistant-Provider": provider,
		"X-Assistant-Rate-Limited": "true",
	});
}

export async function shouldGracefullyHandleAssistantRateLimit(
	response: Response,
) {
	const payload = await parseJsonResponse(response.clone()).catch(() => null);

	return isRateLimitLikeFailure(response.status, payload);
}

export async function callAssistantChatWithRouting(
	env: WorkerProviderEnv,
	body: AssistantChatBody,
) {
	const providerAttempts: ProviderAttempt[] = [];
	let skipGroqBackup = false;
	let lastMissingResponse: {
		payload: unknown;
		status: number;
		provider: string;
	} | null = null;
	for (const provider of getRoutedProviderPriority(env)) {
		if (provider === "github-models") {
			if (!env.GITHUB_MODELS_TOKEN) {
				continue;
			}

			const githubResponse = await callGitHubModels(
				"/inference/chat/completions",
				env,
				{
					model: body.model,
					temperature: body.temperature ?? 0,
					max_tokens: body.max_tokens ?? 220,
					response_format: body.response_format,
					messages: body.messages,
				},
			);
			const payload = await parseJsonResponse(githubResponse.clone());
			const normalizedPayload = githubResponse.ok
				? normalizeAssistantChatPayload(payload, body.model)
				: payload;
			const isExpectedPayload =
				isExpectedAssistantChatPayload(normalizedPayload);

			if (
				githubResponse.ok &&
				isExpectedPayload &&
				!isMissingAssistantResponse(normalizedPayload)
			) {
				return jsonResponse(
					normalizedPayload,
					githubResponse.status,
					buildProviderContextHeaders("github-models", [
						{
							provider: "github-models",
							status: githubResponse.status,
							error: null,
						},
					]),
				);
			}

			if (githubResponse.ok && isExpectedPayload) {
				lastMissingResponse = {
					payload: normalizedPayload,
					status: githubResponse.status,
					provider: "github-models",
				};
			}

			const githubError = normalizeAssistantErrorPayload(
				githubResponse.ok
					? {
							error: isExpectedPayload
								? "Assistant returned missing"
								: "Assistant returned an unexpected response",
						}
					: payload,
				githubResponse.ok
					? isExpectedPayload
						? "Assistant returned missing"
						: "Assistant returned an unexpected response"
					: "GitHub Models request failed",
			);

			providerAttempts.push({
				provider: "github-models",
				status: githubResponse.status,
				error: githubError,
			});

			if (
				!githubResponse.ok &&
				!isGenericRoutedFallbackWorthyFailure(githubResponse.status, payload)
			) {
				return jsonResponse(
					{ error: githubError, providers: providerAttempts },
					githubResponse.status,
					buildProviderContextHeaders("github-models", providerAttempts),
				);
			}

			continue;
		}

		if (provider === "groq") {
			const groqResponse = await callGroq(body, env);
			const normalizedPayload = groqResponse.ok
				? normalizeAssistantChatPayload(groqResponse.payload, env.GROQ_MODEL)
				: groqResponse.payload;
			const isExpectedPayload =
				isExpectedAssistantChatPayload(normalizedPayload);
			const isIncompletePayload =
				isExpectedPayload &&
				isIncompleteAssistantChatPayload(normalizedPayload);

			if (
				groqResponse.ok &&
				isExpectedPayload &&
				!isMissingAssistantResponse(normalizedPayload) &&
				!isIncompletePayload
			) {
				return jsonResponse(
					normalizedPayload,
					groqResponse.status,
					buildProviderContextHeaders("groq", [
						...providerAttempts,
						{
							provider: "groq",
							status: groqResponse.status,
							error: null,
						},
					]),
				);
			}

			if (groqResponse.ok && isExpectedPayload) {
				lastMissingResponse = {
					payload: normalizedPayload,
					status: groqResponse.status,
					provider: "groq",
				};
			}

			const groqError = normalizeAssistantErrorPayload(
				groqResponse.ok
					? {
							error: !isExpectedPayload
								? "Assistant returned an unexpected response"
								: isIncompletePayload
									? "Assistant returned an incomplete response"
									: "Assistant returned missing",
						}
					: groqResponse.payload,
				groqResponse.ok
					? !isExpectedPayload
						? "Assistant returned an unexpected response"
						: isIncompletePayload
							? "Assistant returned an incomplete response"
							: "Assistant returned missing"
					: "Groq request failed",
			);

			providerAttempts.push({
				provider: "groq",
				status: groqResponse.status,
				error: groqError,
			});

			if (
				!groqResponse.ok &&
				isGroqSharedQuotaFailure(groqResponse.status, groqResponse.payload)
			) {
				skipGroqBackup = true;
			}

			if (
				!groqResponse.ok &&
				!isGroqFallbackWorthyFailure(groqResponse.status, groqResponse.payload)
			) {
				return jsonResponse(
					{ error: groqError, providers: providerAttempts },
					groqResponse.status,
					buildProviderContextHeaders("groq", providerAttempts),
				);
			}

			continue;
		}

		if (provider === "groq_backup") {
			if (skipGroqBackup) {
				continue;
			}

			const groqBackupResponse = await callGroqBackup(body, env);
			const normalizedPayload = groqBackupResponse.ok
				? normalizeAssistantChatPayload(
						groqBackupResponse.payload,
						env.GROQ_BACKUP_MODEL,
					)
				: groqBackupResponse.payload;
			const isExpectedPayload =
				isExpectedAssistantChatPayload(normalizedPayload);
			const isIncompletePayload =
				isExpectedPayload &&
				isIncompleteAssistantChatPayload(normalizedPayload);

			if (
				groqBackupResponse.ok &&
				isExpectedPayload &&
				!isMissingAssistantResponse(normalizedPayload) &&
				!isIncompletePayload
			) {
				return jsonResponse(
					normalizedPayload,
					groqBackupResponse.status,
					buildProviderContextHeaders("groq_backup", [
						...providerAttempts,
						{
							provider: "groq_backup",
							status: groqBackupResponse.status,
							error: null,
						},
					]),
				);
			}

			if (groqBackupResponse.ok && isExpectedPayload) {
				lastMissingResponse = {
					payload: normalizedPayload,
					status: groqBackupResponse.status,
					provider: "groq_backup",
				};
			}

			const groqBackupError = normalizeAssistantErrorPayload(
				groqBackupResponse.ok
					? {
							error: !isExpectedPayload
								? "Assistant returned an unexpected response"
								: isIncompletePayload
									? "Assistant returned an incomplete response"
									: "Assistant returned missing",
						}
					: groqBackupResponse.payload,
				groqBackupResponse.ok
					? !isExpectedPayload
						? "Assistant returned an unexpected response"
						: isIncompletePayload
							? "Assistant returned an incomplete response"
							: "Assistant returned missing"
					: "Groq backup request failed",
			);

			providerAttempts.push({
				provider: "groq_backup",
				status: groqBackupResponse.status,
				error: groqBackupError,
			});

			if (
				!groqBackupResponse.ok &&
				!isGroqFallbackWorthyFailure(
					groqBackupResponse.status,
					groqBackupResponse.payload,
				)
			) {
				return jsonResponse(
					{ error: groqBackupError, providers: providerAttempts },
					groqBackupResponse.status,
					buildProviderContextHeaders("groq_backup", providerAttempts),
				);
			}

			continue;
		}

		if (provider === "huggingface") {
			const huggingFaceResponse = await callHuggingFace(body, env);
			const normalizedPayload = huggingFaceResponse.ok
				? normalizeAssistantChatPayload(
						huggingFaceResponse.payload,
						env.HUGGING_FACE_MODEL,
					)
				: huggingFaceResponse.payload;
			const isExpectedPayload =
				isExpectedAssistantChatPayload(normalizedPayload);

			if (
				huggingFaceResponse.ok &&
				isExpectedPayload &&
				!isMissingAssistantResponse(normalizedPayload)
			) {
				return jsonResponse(
					normalizedPayload,
					huggingFaceResponse.status,
					buildProviderContextHeaders("huggingface", [
						...providerAttempts,
						{
							provider: "huggingface",
							status: huggingFaceResponse.status,
							error: null,
						},
					]),
				);
			}

			if (huggingFaceResponse.ok && isExpectedPayload) {
				lastMissingResponse = {
					payload: normalizedPayload,
					status: huggingFaceResponse.status,
					provider: "huggingface",
				};
			}

			const errorMessage = normalizeAssistantErrorPayload(
				huggingFaceResponse.ok
					? {
							error: isExpectedPayload
								? "Assistant returned missing"
								: "Assistant returned an unexpected response",
						}
					: huggingFaceResponse.payload,
				huggingFaceResponse.ok
					? isExpectedPayload
						? "Assistant returned missing"
						: "Assistant returned an unexpected response"
					: "Hugging Face request failed",
			);

			providerAttempts.push({
				provider: "huggingface",
				status: huggingFaceResponse.status,
				error: errorMessage,
			});

			if (
				!huggingFaceResponse.ok &&
				!isGenericRoutedFallbackWorthyFailure(
					huggingFaceResponse.status,
					huggingFaceResponse.payload,
				)
			) {
				return jsonResponse(
					{ error: errorMessage, providers: providerAttempts },
					huggingFaceResponse.status,
					buildProviderContextHeaders("huggingface", providerAttempts),
				);
			}

			continue;
		}

		if (provider === "cloudflare") {
			const cloudflareResponse = await callCloudflareAi(body, env);
			const normalizedPayload = cloudflareResponse.ok
				? normalizeAssistantChatPayload(
						cloudflareResponse.payload,
						env.CLOUDFLARE_AI_MODEL,
					)
				: cloudflareResponse.payload;
			const isExpectedPayload =
				isExpectedAssistantChatPayload(normalizedPayload);

			if (
				cloudflareResponse.ok &&
				isExpectedPayload &&
				!isMissingAssistantResponse(normalizedPayload)
			) {
				return jsonResponse(
					normalizedPayload,
					cloudflareResponse.status,
					buildProviderContextHeaders("cloudflare", [
						...providerAttempts,
						{
							provider: "cloudflare",
							status: cloudflareResponse.status,
							error: null,
						},
					]),
				);
			}

			if (cloudflareResponse.ok && isExpectedPayload) {
				lastMissingResponse = {
					payload: normalizedPayload,
					status: cloudflareResponse.status,
					provider: "cloudflare",
				};
			}

			const errorMessage = normalizeAssistantErrorPayload(
				cloudflareResponse.ok
					? {
							error: isExpectedPayload
								? "Assistant returned missing"
								: "Assistant returned an unexpected response",
						}
					: cloudflareResponse.payload,
				cloudflareResponse.ok
					? isExpectedPayload
						? "Assistant returned missing"
						: "Assistant returned an unexpected response"
					: "Cloudflare AI request failed",
			);

			providerAttempts.push({
				provider: "cloudflare",
				status: cloudflareResponse.status,
				error: errorMessage,
			});

			if (
				!cloudflareResponse.ok &&
				!isGenericRoutedFallbackWorthyFailure(
					cloudflareResponse.status,
					cloudflareResponse.payload,
				)
			) {
				return jsonResponse(
					{ error: errorMessage, providers: providerAttempts },
					cloudflareResponse.status,
					buildProviderContextHeaders("cloudflare", providerAttempts),
				);
			}

			continue;
		}

		if (provider === "portfolio-rag") {
			const ragQuestion = extractQuestionFromMessages(body.messages);

			if (!ragQuestion) {
				continue;
			}

			try {
				const ragPayload = await runRagQuestion(
					ragQuestion,
					env as unknown as RagEnv,
				);

				return jsonResponse(
					toChatCompletionsPayload(
						JSON.stringify(ragPayload),
						env.RAG_CHAT_MODEL || "portfolio-rag",
					),
					200,
					buildProviderContextHeaders("portfolio-rag", [
						...providerAttempts,
						{
							provider: "portfolio-rag",
							status: 200,
							error: null,
						},
					]),
				);
			} catch (error) {
				providerAttempts.push({
					provider: "portfolio-rag",
					status: 503,
					error:
						error instanceof Error
							? error.message
							: "Portfolio RAG request failed",
				});
			}
		}
	}

	if (lastMissingResponse) {
		return jsonResponse(
			lastMissingResponse.payload,
			lastMissingResponse.status,
			buildProviderContextHeaders(
				lastMissingResponse.provider,
				providerAttempts,
			),
		);
	}

	return jsonResponse(
		createGracefulRateLimitedAssistantPayload(body.model || null),
		200,
		{
			...buildProviderContextHeaders("rate-limit-fallback", providerAttempts),
			"X-Assistant-Rate-Limited": "true",
		},
	);
}
