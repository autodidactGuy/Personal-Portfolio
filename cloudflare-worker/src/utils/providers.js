import { corsHeaders, jsonResponse, parseMaybeJsonResponse } from "./http.js";

const ASSISTANT_MISSING_MESSAGE = "I don't have that information available.";
const ASSISTANT_REJECTED_MESSAGE =
	"I can only answer questions based on the information available on this site.";
const SNIPPET_ID_PATTERN =
	/\b(summary|about|skills|links|contact|hero|focus|stats|experience:[a-z0-9-]+|education:[a-z0-9-]+|project:[a-z0-9-]+|article:[a-z0-9-]+|case-study:[a-z0-9-]+|recommendation:[a-z0-9-]+)\b/gi;

function toChatCompletionsPayload(content, model) {
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

function inferAssistantStatusFromAnswer(answer) {
	const normalizedAnswer = String(answer || "").trim();

	if (normalizedAnswer === ASSISTANT_MISSING_MESSAGE) {
		return "missing";
	}

	if (normalizedAnswer === ASSISTANT_REJECTED_MESSAGE) {
		return "rejected";
	}

	return "answered";
}

function extractKnownAssistantAnswer(rawValue) {
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

function extractSnippetIdsFromText(rawValue) {
	const stringValue = String(rawValue || "");

	if (!stringValue.trim()) {
		return [];
	}

	const matches = stringValue.match(SNIPPET_ID_PATTERN) || [];

	return [...new Set(matches.map((match) => match.toLowerCase()))];
}

function coerceAssistantStructuredObject(value) {
	if (!value) {
		return null;
	}

	if (
		typeof value === "object" &&
		typeof value.status === "string" &&
		typeof value.answer === "string" &&
		Array.isArray(value.citations)
	) {
		const extractedCitations = extractSnippetIdsFromText(value.answer);

		return {
			status: value.status,
			answer: value.answer,
			citations: [
				...new Set([
					...value.citations.filter((citation) => typeof citation === "string"),
					...extractedCitations,
				]),
			],
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
			.filter((item) => typeof item === "string")
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
		value.schema &&
		typeof value.schema === "object" &&
		value.schema.properties &&
		typeof value.schema.properties === "object"
	) {
		const { status, answer, citations } = value.schema.properties;

		if (typeof status === "string" && typeof answer === "string") {
			return {
				status,
				answer,
				citations: Array.isArray(citations)
					? citations.filter((citation) => typeof citation === "string")
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

function normalizeAssistantChatPayload(payload, fallbackModel = "assistant") {
	if (
		!payload ||
		typeof payload !== "object" ||
		!Array.isArray(payload.choices)
	) {
		return payload;
	}

	const rawContent = payload.choices[0]?.message?.content;

	if (typeof rawContent !== "string" || !rawContent.trim()) {
		return payload;
	}

	let parsedContent;

	try {
		parsedContent = JSON.parse(rawContent);
	} catch {
		parsedContent = rawContent;
	}

	const normalizedContent = coerceAssistantStructuredObject(parsedContent);

	if (!normalizedContent) {
		return payload;
	}

	return {
		...payload,
		model:
			typeof payload.model === "string" && payload.model.trim()
				? payload.model
				: fallbackModel,
		choices: payload.choices.map((choice, index) =>
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

function isIncompleteAssistantChatPayload(payload) {
	if (
		!payload ||
		typeof payload !== "object" ||
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

function getAssistantStructuredStatus(payload) {
	if (
		!payload ||
		typeof payload !== "object" ||
		!Array.isArray(payload.choices)
	) {
		return null;
	}

	const rawContent = payload.choices[0]?.message?.content;

	if (typeof rawContent !== "string" || !rawContent.trim()) {
		return null;
	}

	try {
		const parsedContent = JSON.parse(rawContent);

		return typeof parsedContent?.status === "string"
			? parsedContent.status
			: null;
	} catch {
		return null;
	}
}

function isMissingAssistantResponse(payload) {
	return getAssistantStructuredStatus(payload) === "missing";
}

function normalizeAssistantErrorPayload(payload, fallbackMessage) {
	if (typeof payload === "string" && payload.trim()) {
		return payload;
	}

	if (payload && typeof payload === "object") {
		if (typeof payload.error === "string" && payload.error.trim()) {
			return payload.error;
		}

		if (
			payload.error &&
			typeof payload.error === "object" &&
			typeof payload.error.message === "string" &&
			payload.error.message.trim()
		) {
			return payload.error.message;
		}

		if (typeof payload.message === "string" && payload.message.trim()) {
			return payload.message;
		}
	}

	return fallbackMessage;
}

export function isRateLimitLikeFailure(status, payload) {
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

function isGroqFallbackWorthyFailure(status, payload) {
	if (status === 503 || isRateLimitLikeFailure(status, payload)) {
		return true;
	}

	if (status !== 400) {
		return false;
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

function normalizeAssistantMessagesForGroq(messages) {
	if (!Array.isArray(messages) || messages.length === 0) {
		return [];
	}

	const normalizedMessages = [];
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

function ensureGroqJsonInstruction(messages, responseFormat) {
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

function normalizeResponseFormatForOpenAiCompat(responseFormat) {
	if (!responseFormat || typeof responseFormat !== "object") {
		return undefined;
	}

	if (responseFormat.type === "json_schema") {
		return { type: "json_object" };
	}

	return responseFormat;
}

function normalizeResponseFormatForCloudflare(responseFormat) {
	if (!responseFormat || typeof responseFormat !== "object") {
		return undefined;
	}

	if (
		responseFormat.type === "json_schema" &&
		responseFormat.json_schema &&
		typeof responseFormat.json_schema === "object" &&
		responseFormat.json_schema.schema &&
		typeof responseFormat.json_schema.schema === "object"
	) {
		return {
			type: "json_schema",
			json_schema: responseFormat.json_schema.schema,
		};
	}

	return responseFormat;
}

function extractCloudflareAssistantContent(result) {
	const candidate =
		result?.response !== undefined
			? result.response
			: result?.result?.response !== undefined
				? result.result.response
				: null;

	if (typeof candidate === "string" && candidate.trim()) {
		return candidate;
	}

	if (!candidate || typeof candidate !== "object") {
		return null;
	}

	if (
		typeof candidate.status === "string" &&
		typeof candidate.answer === "string" &&
		Array.isArray(candidate.citations)
	) {
		return JSON.stringify(candidate);
	}

	const echoedProperties = candidate?.schema?.properties;

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

function createAssistantFetchResponse(response, payload, provider) {
	return {
		ok: response.ok,
		status: response.status,
		payload,
		provider,
	};
}

function buildProviderContextHeaders(provider, providerAttempts) {
	return {
		"X-Assistant-Provider": provider,
		"X-Assistant-Providers": JSON.stringify(providerAttempts),
	};
}

async function parseJsonResponse(response) {
	return parseMaybeJsonResponse(response);
}

async function callGitHubModelsRaw(pathname, env, body) {
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

async function callGroqRaw(body, env) {
	if (!env.GROQ_API_KEY || !env.GROQ_MODEL) {
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
				model: body.model || env.GROQ_MODEL,
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

async function callHuggingFaceRaw(body, env) {
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

async function callCloudflareRaw(body, env) {
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
			),
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

export async function callRawAssistantProvider(provider, body, env) {
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
		default:
			return jsonResponse({ error: "Unsupported provider" }, 422);
	}
}

export async function callGitHubModels(pathname, env, body) {
	const response = await callGitHubModelsRaw(pathname, env, body);
	const payload = await parseMaybeJsonResponse(response.clone());

	return jsonResponse(
		typeof payload === "string" ? { error: payload } : payload,
		response.status,
	);
}

async function callCloudflareAi(body, env) {
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
		toChatCompletionsPayload(rawContent, env.CLOUDFLARE_AI_MODEL),
		"cloudflare",
	);
}

async function callGroq(body, env) {
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

async function callHuggingFace(body, env) {
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

export function createGracefulRateLimitedAssistantPayload(model) {
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
	model,
	origin,
	provider,
) {
	return jsonResponse(createGracefulRateLimitedAssistantPayload(model), 200, {
		...(origin ? corsHeaders(origin) : {}),
		"X-Assistant-Provider": provider,
		"X-Assistant-Rate-Limited": "true",
	});
}

export async function shouldGracefullyHandleAssistantRateLimit(response) {
	const payload = await parseJsonResponse(response.clone()).catch(() => null);

	return isRateLimitLikeFailure(response.status, payload);
}

export async function callAssistantChatWithRouting(env, body) {
	const providerAttempts = [];
	let lastMissingResponse = null;

	if (env.GITHUB_MODELS_TOKEN) {
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
		const normalizedGithubPayload = githubResponse.ok
			? normalizeAssistantChatPayload(payload, body.model)
			: payload;

		if (
			githubResponse.ok &&
			!isMissingAssistantResponse(normalizedGithubPayload)
		) {
			return jsonResponse(
				normalizedGithubPayload,
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

		if (githubResponse.ok) {
			lastMissingResponse = {
				payload: normalizedGithubPayload,
				status: githubResponse.status,
				provider: "github-models",
			};
		}

		const githubError = normalizeAssistantErrorPayload(
			githubResponse.ok ? { error: "Assistant returned missing" } : payload,
			githubResponse.ok
				? "Assistant returned missing"
				: "GitHub Models request failed",
		);

		providerAttempts.push({
			provider: "github-models",
			status: githubResponse.status,
			error: githubError,
		});

		if (
			githubResponse.ok ||
			!isRateLimitLikeFailure(githubResponse.status, payload)
		) {
			return jsonResponse(
				{ error: githubError, providers: providerAttempts },
				githubResponse.status,
				buildProviderContextHeaders("github-models", providerAttempts),
			);
		}
	}

	const groqResponse = await callGroq(body, env);
	const normalizedGroqPayload = groqResponse.ok
		? normalizeAssistantChatPayload(groqResponse.payload, env.GROQ_MODEL)
		: groqResponse.payload;

	if (
		groqResponse.ok &&
		!isMissingAssistantResponse(normalizedGroqPayload) &&
		!isIncompleteAssistantChatPayload(normalizedGroqPayload)
	) {
		return jsonResponse(
			normalizedGroqPayload,
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

	if (groqResponse.ok) {
		lastMissingResponse = {
			payload: normalizedGroqPayload,
			status: groqResponse.status,
			provider: "groq",
		};
	}

	const groqError = normalizeAssistantErrorPayload(
		groqResponse.ok
			? {
					error: isIncompleteAssistantChatPayload(normalizedGroqPayload)
						? "Assistant returned an incomplete response"
						: "Assistant returned missing",
				}
			: groqResponse.payload,
		groqResponse.ok
			? isIncompleteAssistantChatPayload(normalizedGroqPayload)
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
		(groqResponse.ok &&
			!isIncompleteAssistantChatPayload(normalizedGroqPayload)) ||
		(!groqResponse.ok &&
			!isGroqFallbackWorthyFailure(groqResponse.status, groqResponse.payload))
	) {
		return jsonResponse(
			{ error: groqError, providers: providerAttempts },
			groqResponse.status,
			buildProviderContextHeaders("groq", providerAttempts),
		);
	}

	const huggingFaceResponse = await callHuggingFace(body, env);
	const normalizedHuggingFacePayload = huggingFaceResponse.ok
		? normalizeAssistantChatPayload(
				huggingFaceResponse.payload,
				env.HUGGING_FACE_MODEL,
			)
		: huggingFaceResponse.payload;

	if (
		huggingFaceResponse.ok &&
		!isMissingAssistantResponse(normalizedHuggingFacePayload)
	) {
		return jsonResponse(
			normalizedHuggingFacePayload,
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

	if (huggingFaceResponse.ok) {
		lastMissingResponse = {
			payload: normalizedHuggingFacePayload,
			status: huggingFaceResponse.status,
			provider: "huggingface",
		};
	}

	providerAttempts.push({
		provider: "huggingface",
		status: huggingFaceResponse.status,
		error: normalizeAssistantErrorPayload(
			huggingFaceResponse.ok
				? { error: "Assistant returned missing" }
				: huggingFaceResponse.payload,
			huggingFaceResponse.ok
				? "Assistant returned missing"
				: "Hugging Face request failed",
		),
	});

	if (
		!huggingFaceResponse.ok &&
		huggingFaceResponse.status !== 503 &&
		!isRateLimitLikeFailure(
			huggingFaceResponse.status,
			huggingFaceResponse.payload,
		)
	) {
		return jsonResponse(
			{
				error: normalizeAssistantErrorPayload(
					huggingFaceResponse.payload,
					"Hugging Face request failed",
				),
				providers: providerAttempts,
			},
			huggingFaceResponse.status,
			buildProviderContextHeaders("huggingface", providerAttempts),
		);
	}

	const cloudflareResponse = await callCloudflareAi(body, env);
	const normalizedCloudflarePayload = cloudflareResponse.ok
		? normalizeAssistantChatPayload(
				cloudflareResponse.payload,
				env.CLOUDFLARE_AI_MODEL,
			)
		: cloudflareResponse.payload;

	if (
		cloudflareResponse.ok &&
		!isMissingAssistantResponse(normalizedCloudflarePayload)
	) {
		return jsonResponse(
			normalizedCloudflarePayload,
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

	if (cloudflareResponse.ok) {
		lastMissingResponse = {
			payload: normalizedCloudflarePayload,
			status: cloudflareResponse.status,
			provider: "cloudflare",
		};
	}

	providerAttempts.push({
		provider: "cloudflare",
		status: cloudflareResponse.status,
		error: normalizeAssistantErrorPayload(
			cloudflareResponse.ok
				? { error: "Assistant returned missing" }
				: cloudflareResponse.payload,
			cloudflareResponse.ok
				? "Assistant returned missing"
				: "Cloudflare AI request failed",
		),
	});

	if (
		!cloudflareResponse.ok &&
		cloudflareResponse.status !== 503 &&
		!isRateLimitLikeFailure(
			cloudflareResponse.status,
			cloudflareResponse.payload,
		)
	) {
		return jsonResponse(
			{
				error: normalizeAssistantErrorPayload(
					cloudflareResponse.payload,
					"Cloudflare AI request failed",
				),
				providers: providerAttempts,
			},
			cloudflareResponse.status,
			buildProviderContextHeaders("cloudflare", providerAttempts),
		);
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
		createGracefulRateLimitedAssistantPayload(body.model),
		200,
		{
			...buildProviderContextHeaders("rate-limit-fallback", providerAttempts),
			"X-Assistant-Rate-Limited": "true",
		},
	);
}
