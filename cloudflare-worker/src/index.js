import { z } from "zod";

async function sendEmail(body, env) {
	const apiKey = env.RESEND_API_KEY;
	const toEmail = env.CONTACT_EMAIL;

	if (!apiKey || !toEmail) {
		return { sent: false, skipped: true };
	}

	const fromEmail = env.FROM_EMAIL || "noreply@contact.hassanraza.us";

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			from: `Contact - Hassan Raza <${fromEmail}>`,
			to: [toEmail],
			reply_to: body.email,
			subject: `[Message from ${body.name}] ${body.subject}`,
			template: {
				id: "contact-form-submission",
				variables: {
					sender_name: body.name,
					sender_email: body.email,
					sender_phone: body.phone || "",
					subject: body.subject,
					message: body.message,
					submitted_at: new Date().toISOString(),
				},
			},
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error("Resend email request failed", {
			status: response.status,
			statusText: response.statusText,
			responseText: errorText,
		});
		return { sent: false, skipped: false };
	}

	return { sent: true, skipped: false };
}

function parseCookies(cookieHeader) {
	return String(cookieHeader || "")
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean)
		.reduce((cookies, part) => {
			const separatorIndex = part.indexOf("=");

			if (separatorIndex === -1) {
				return cookies;
			}

			const key = part.slice(0, separatorIndex).trim();
			const value = part.slice(separatorIndex + 1).trim();
			cookies[key] = decodeURIComponent(value);
			return cookies;
		}, {});
}

function serializeCookie(name, value, maxAgeSeconds) {
	const segments = [
		`${name}=${encodeURIComponent(value)}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		maxAgeSeconds === 0 ? "Max-Age=0" : `Max-Age=${maxAgeSeconds}`,
	];

	return segments.join("; ");
}

function withClearedOauthCookies(headers = new Headers()) {
	headers.append("Set-Cookie", serializeCookie("oauth_state", "", 0));
	headers.append("Set-Cookie", serializeCookie("oauth_origin", "", 0));
	return headers;
}

function createRedirectResponse(location, headers = new Headers()) {
	headers.set("Location", location);
	return new Response(null, {
		status: 302,
		headers,
	});
}

function getAllowedOrigins(env) {
	return String(env.ALLOWED_ORIGINS || env.ORIGIN || "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

function isAllowedOrigin(origin, env) {
	return getAllowedOrigins(env).includes(origin);
}

function createStateToken() {
	return crypto.randomUUID();
}

function sanitizeOriginCandidate(value) {
	if (!value) {
		return null;
	}

	const trimmedValue = String(value).trim();

	if (!trimmedValue) {
		return null;
	}

	const withoutUnexpectedQuery = trimmedValue.split("?")[0];

	try {
		return new URL(withoutUnexpectedQuery).origin;
	} catch {
		return null;
	}
}

function corsHeaders(origin) {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Expose-Headers": "X-Assistant-Provider",
		"Access-Control-Max-Age": "86400",
		Vary: "Origin",
	};
}

function jsonResponse(body, status, extraHeaders = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...extraHeaders,
		},
	});
}

async function parseJsonRequest(request, cors) {
	try {
		return await request.json();
	} catch {
		throw jsonResponse({ error: "Invalid JSON body" }, 400, cors);
	}
}

async function callGitHubModels(pathname, env, body) {
	if (!env.GITHUB_MODELS_TOKEN) {
		return jsonResponse({ error: "Assistant service is not configured" }, 503);
	}

	try {
		const response = await fetch(`https://models.github.ai${pathname}`, {
			method: "POST",
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${env.GITHUB_MODELS_TOKEN}`,
				"Content-Type": "application/json",
				"X-GitHub-Api-Version": "2026-03-10",
			},
			body: JSON.stringify(body),
		});

		const contentType = response.headers.get("Content-Type") || "";
		const payload = contentType.includes("application/json")
			? await response.json()
			: await response.text();

		return jsonResponse(
			typeof payload === "string" ? { error: payload } : payload,
			response.status,
		);
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

async function parseJsonResponse(response) {
	const contentType = response.headers.get("Content-Type") || "";
	return contentType.includes("application/json")
		? await response.json()
		: await response.text();
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

function createAssistantFetchResponse(response, payload, provider) {
	return {
		ok: response.ok,
		status: response.status,
		payload,
		provider,
	};
}

function isRateLimitLikeFailure(status, payload) {
	if (status === 429) {
		return true;
	}

	const normalizedError = normalizeAssistantErrorPayload(payload, "")
		.toLowerCase()
		.trim();

	return normalizedError.includes("rate limit");
}

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

function createGracefulRateLimitedAssistantPayload(model) {
	return toChatCompletionsPayload(
		JSON.stringify({
			status: "missing",
			answer: "I don't have that information available.",
			citations: [],
		}),
		model || "rate-limit-fallback",
	);
}

function createGracefulRateLimitedAssistantResponse(model, origin, provider) {
	return jsonResponse(createGracefulRateLimitedAssistantPayload(model), 200, {
		...(origin ? corsHeaders(origin) : {}),
		"X-Assistant-Provider": provider,
		"X-Assistant-Rate-Limited": "true",
	});
}

async function callCloudflareAi(body, env) {
	if (!env.AI || !env.CLOUDFLARE_AI_MODEL) {
		return createAssistantFetchResponse(
			new Response(null, { status: 503 }),
			{ error: "Cloudflare AI is not configured" },
			"cloudflare",
		);
	}

	try {
		const result = await env.AI.run(env.CLOUDFLARE_AI_MODEL, {
			messages: body.messages,
			temperature: body.temperature ?? 0,
			max_tokens: body.max_tokens ?? 220,
			response_format: body.response_format,
		});

		const rawContent =
			typeof result?.response === "string"
				? result.response
				: typeof result?.result?.response === "string"
					? result.result.response
					: result?.response && typeof result.response === "object"
						? JSON.stringify(result.response)
						: null;

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
	} catch (error) {
		return createAssistantFetchResponse(
			new Response(null, { status: 503 }),
			{
				error:
					error instanceof Error
						? error.message
						: "Cloudflare AI request failed",
			},
			"cloudflare",
		);
	}
}

async function callHuggingFace(body, env) {
	if (!env.HUGGING_FACE_API_TOKEN || !env.HUGGING_FACE_MODEL) {
		return createAssistantFetchResponse(
			new Response(null, { status: 503 }),
			{ error: "Hugging Face is not configured" },
			"huggingface",
		);
	}

	try {
		const response = await fetch(
			"https://router.huggingface.co/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.HUGGING_FACE_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: env.HUGGING_FACE_MODEL,
					temperature: body.temperature ?? 0,
					max_tokens: body.max_tokens ?? 220,
					response_format: body.response_format,
					messages: body.messages,
				}),
			},
		);

		return createAssistantFetchResponse(
			response,
			await parseJsonResponse(response),
			"huggingface",
		);
	} catch (error) {
		return createAssistantFetchResponse(
			new Response(null, { status: 503 }),
			{
				error:
					error instanceof Error
						? error.message
						: "Hugging Face request failed",
			},
			"huggingface",
		);
	}
}

async function callAssistantChatWithRouting(env, body) {
	const providerAttempts = [];

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
		const payload = await parseJsonResponse(githubResponse);

		if (githubResponse.ok) {
			return jsonResponse(payload, githubResponse.status, {
				"X-Assistant-Provider": "github-models",
			});
		}

		const githubError = normalizeAssistantErrorPayload(
			payload,
			"GitHub Models request failed",
		);

		providerAttempts.push({
			provider: "github-models",
			status: githubResponse.status,
			error: githubError,
		});

		if (!isRateLimitLikeFailure(githubResponse.status, payload)) {
			return jsonResponse(
				{
					error: githubError,
					providers: providerAttempts,
				},
				githubResponse.status,
				{
					"X-Assistant-Provider": "github-models",
				},
			);
		}
	}

	const cloudflareResponse = await callCloudflareAi(body, env);

	if (cloudflareResponse.ok) {
		return jsonResponse(cloudflareResponse.payload, cloudflareResponse.status, {
			"X-Assistant-Provider": "cloudflare",
		});
	}

	const cloudflareError = normalizeAssistantErrorPayload(
		cloudflareResponse.payload,
		"Cloudflare AI request failed",
	);

	providerAttempts.push({
		provider: "cloudflare",
		status: cloudflareResponse.status,
		error: cloudflareError,
	});

	if (
		cloudflareResponse.status !== 503 &&
		!isRateLimitLikeFailure(
			cloudflareResponse.status,
			cloudflareResponse.payload,
		)
	) {
		return jsonResponse(
			{
				error: cloudflareError,
				providers: providerAttempts,
			},
			cloudflareResponse.status,
			{
				"X-Assistant-Provider": "cloudflare",
			},
		);
	}

	const huggingFaceResponse = await callHuggingFace(body, env);

	if (huggingFaceResponse.ok) {
		return jsonResponse(
			huggingFaceResponse.payload,
			huggingFaceResponse.status,
			{
				"X-Assistant-Provider": "huggingface",
			},
		);
	}

	providerAttempts.push({
		provider: "huggingface",
		status: huggingFaceResponse.status,
		error: normalizeAssistantErrorPayload(
			huggingFaceResponse.payload,
			"Hugging Face request failed",
		),
	});

	return jsonResponse(
		createGracefulRateLimitedAssistantPayload(body.model),
		200,
		{
			"X-Assistant-Provider": "rate-limit-fallback",
			"X-Assistant-Rate-Limited": "true",
			"X-Assistant-Providers": JSON.stringify(providerAttempts),
		},
	);
}

async function verifyTurnstile(token, ip, secretKey) {
	const form = new URLSearchParams();
	form.append("secret", secretKey);
	form.append("response", token);

	if (ip) {
		form.append("remoteip", ip);
	}

	try {
		const response = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{ method: "POST", body: form },
		);

		if (!response.ok) {
			console.error("Turnstile verification request failed", {
				status: response.status,
				statusText: response.statusText,
			});
			return false;
		}

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.toLowerCase().includes("application/json")) {
			console.error("Turnstile verification returned non-JSON response", {
				contentType,
			});
			return false;
		}

		const result = await response.json();
		return result.success === true;
	} catch (error) {
		console.error("Turnstile verification failed", error);
		return false;
	}
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const ASSISTANT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ASSISTANT_RATE_LIMIT_MAX = 100;
const RATE_LIMIT_MAX_ENTRIES = 10000;
const RATE_LIMIT_PRUNE_INTERVAL_MS = 60 * 1000;
const rateLimitMap = new Map();
let lastPruneTime = 0;

function pruneExpiredEntries(now) {
	if (now - lastPruneTime < RATE_LIMIT_PRUNE_INTERVAL_MS) {
		return;
	}
	lastPruneTime = now;

	for (const [ip, entry] of rateLimitMap) {
		const valid = entry.timestamps.filter(
			(ts) => now - ts < RATE_LIMIT_WINDOW_MS,
		);
		if (valid.length === 0) {
			rateLimitMap.delete(ip);
		} else {
			entry.timestamps = valid;
		}
	}

	if (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
		const excess = rateLimitMap.size - RATE_LIMIT_MAX_ENTRIES;
		const iter = rateLimitMap.keys();
		for (let i = 0; i < excess; i++) {
			rateLimitMap.delete(iter.next().value);
		}
	}
}

function isRateLimited(ip, options = {}) {
	const { windowMs = RATE_LIMIT_WINDOW_MS, max = RATE_LIMIT_MAX } = options;
	const now = Date.now();

	pruneExpiredEntries(now);

	const entry = rateLimitMap.get(ip);

	if (!entry) {
		rateLimitMap.set(ip, { timestamps: [now] });
		return false;
	}

	entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

	if (entry.timestamps.length === 0) {
		rateLimitMap.delete(ip);
		rateLimitMap.set(ip, { timestamps: [now] });
		return false;
	}

	if (entry.timestamps.length >= max) {
		return true;
	}

	entry.timestamps.push(now);
	return false;
}

const contactSchema = z.object({
	name: z
		.string({ error: "name is required" })
		.trim()
		.min(1, "name is required")
		.max(100, "name must not exceed 100 characters"),
	email: z
		.string({ error: "A valid email is required" })
		.max(254, "A valid email is required")
		.email("A valid email is required"),
	subject: z
		.string({ error: "subject is required" })
		.trim()
		.min(1, "subject is required")
		.max(200, "subject must not exceed 200 characters"),
	message: z
		.string({ error: "message is required" })
		.trim()
		.min(1, "message is required")
		.max(5000, "message must not exceed 5000 characters"),
	phone: z
		.string()
		.regex(/^\d{10}$/, "phone must be a 10-digit number")
		.optional(),
});

const assistantEmbeddingsSchema = z.object({
	action: z.literal("embeddings"),
	model: z.string().trim().min(1),
	input: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]),
});

const assistantChatSchema = z.object({
	action: z.literal("chat"),
	model: z.string().trim().min(1),
	temperature: z.number().min(0).max(2).optional(),
	max_tokens: z.number().int().positive().max(2000).optional(),
	response_format: z.object({}).passthrough().optional(),
	messages: z
		.array(
			z.object({
				role: z.enum(["system", "developer", "user", "assistant"]),
				content: z.string().trim().min(1),
			}),
		)
		.min(1),
});

const assistantRequestSchema = z.discriminatedUnion("action", [
	assistantEmbeddingsSchema,
	assistantChatSchema,
]);

function validateContactPayload(data) {
	const result = contactSchema.safeParse(data);

	if (result.success) {
		return { valid: true, errors: [] };
	}

	const isTypeError = result.error.issues.some(
		(issue) => issue.code === "invalid_type" && issue.path.length === 0,
	);

	if (isTypeError) {
		return { valid: false, errors: ["Invalid request body"] };
	}

	const errors = result.error.issues.map((issue) => issue.message);
	return { valid: false, errors };
}

function validateAssistantPayload(data) {
	const result = assistantRequestSchema.safeParse(data);

	if (result.success) {
		return { valid: true, data: result.data, errors: [] };
	}

	const errors = result.error.issues.map((issue) => issue.message);
	return { valid: false, data: null, errors };
}

async function handleAssistantRequest(request, env, url, options = {}) {
	const { routeChatWithFallbacks = false } = options;
	const origin = getRequestOrigin(request, url);

	if (!origin || !isAllowedOrigin(origin, env)) {
		return jsonResponse({ error: "Invalid origin" }, 403);
	}

	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: corsHeaders(origin),
		});
	}

	if (request.method !== "POST") {
		return jsonResponse(
			{ error: "Method not allowed" },
			405,
			corsHeaders(origin),
		);
	}

	const contentType = request.headers.get("Content-Type") || "";

	if (!contentType.includes("application/json")) {
		return jsonResponse(
			{ error: "Content-Type must be application/json" },
			415,
			corsHeaders(origin),
		);
	}

	let body;

	try {
		body = await parseJsonRequest(request, corsHeaders(origin));
	} catch (response) {
		return response;
	}

	const clientIp = request.headers.get("CF-Connecting-IP") || null;

	if (
		clientIp &&
		isRateLimited(`assistant:${clientIp}`, {
			windowMs: ASSISTANT_RATE_LIMIT_WINDOW_MS,
			max: ASSISTANT_RATE_LIMIT_MAX,
		})
	) {
		if (body && typeof body === "object" && body.action === "chat") {
			return createGracefulRateLimitedAssistantResponse(
				typeof body.model === "string" ? body.model : null,
				origin,
				"worker-rate-limit",
			);
		}

		return jsonResponse(
			{ error: "Too many requests. Please try again later." },
			429,
			corsHeaders(origin),
		);
	}

	const { valid, data, errors } = validateAssistantPayload(body);

	if (!valid || !data) {
		return jsonResponse(
			{ error: "Validation failed", fields: errors },
			422,
			corsHeaders(origin),
		);
	}

	const proxyResponse =
		data.action === "embeddings"
			? await callGitHubModels("/inference/embeddings", env, {
					model: data.model,
					input: data.input,
					encoding_format: "float",
				})
			: routeChatWithFallbacks
				? await callAssistantChatWithRouting(env, data)
				: await callGitHubModels("/inference/chat/completions", env, {
						model: data.model,
						temperature: data.temperature ?? 0,
						max_tokens: data.max_tokens ?? 220,
						response_format: data.response_format,
						messages: data.messages,
					});

	const headers = new Headers(proxyResponse.headers);

	for (const [key, value] of Object.entries(corsHeaders(origin))) {
		headers.set(key, value);
	}

	if (data.action === "chat" && proxyResponse.status === 429) {
		return createGracefulRateLimitedAssistantResponse(
			data.model,
			origin,
			headers.get("X-Assistant-Provider") || "upstream-rate-limit",
		);
	}

	return new Response(proxyResponse.body, {
		status: proxyResponse.status,
		headers,
	});
}

function getRequestOrigin(request, url) {
	const explicitOrigin = sanitizeOriginCandidate(
		url.searchParams.get("origin"),
	);

	if (explicitOrigin) {
		return explicitOrigin;
	}

	const originHeader = sanitizeOriginCandidate(request.headers.get("Origin"));

	if (originHeader) {
		return originHeader;
	}

	const refererHeader = request.headers.get("Referer");

	if (!refererHeader) {
		return null;
	}

	try {
		return new URL(refererHeader).origin;
	} catch {
		return null;
	}
}

function resetRateLimitState() {
	rateLimitMap.clear();
	lastPruneTime = 0;
}

export { rateLimitMap, resetRateLimitState };

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const callbackUrl = `${url.origin}/callback`;

		if (url.pathname === "/auth") {
			const requestedOrigin = getRequestOrigin(request, url);

			if (!requestedOrigin || !isAllowedOrigin(requestedOrigin, env)) {
				return new Response("Invalid origin", {
					status: 400,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}

			const state = createStateToken();
			const githubUrl = new URL("https://github.com/login/oauth/authorize");
			githubUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
			githubUrl.searchParams.set("scope", env.GITHUB_OAUTH_SCOPE || "repo");
			githubUrl.searchParams.set("redirect_uri", callbackUrl);
			githubUrl.searchParams.set("state", state);

			const headers = new Headers();
			headers.append("Set-Cookie", serializeCookie("oauth_state", state, 600));
			headers.append(
				"Set-Cookie",
				serializeCookie("oauth_origin", requestedOrigin, 600),
			);
			return createRedirectResponse(githubUrl.toString(), headers);
		}

		if (url.pathname === "/callback") {
			const code = url.searchParams.get("code");
			const returnedState = url.searchParams.get("state");
			const cookies = parseCookies(request.headers.get("Cookie"));
			const expectedState = cookies.oauth_state;
			const openerOrigin = cookies.oauth_origin;

			if (!code) {
				return new Response("Missing OAuth code", { status: 400 });
			}

			if (!returnedState || !expectedState || returnedState !== expectedState) {
				return new Response("Invalid OAuth state", {
					status: 400,
					headers: withClearedOauthCookies(
						new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
					),
				});
			}

			if (!openerOrigin || !isAllowedOrigin(openerOrigin, env)) {
				return new Response("Invalid opener origin", {
					status: 400,
					headers: withClearedOauthCookies(
						new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
					),
				});
			}

			const tokenResponse = await fetch(
				"https://github.com/login/oauth/access_token",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						"User-Agent": "decap-cms-oauth-worker",
					},
					body: JSON.stringify({
						client_id: env.GITHUB_CLIENT_ID,
						client_secret: env.GITHUB_CLIENT_SECRET,
						code,
						redirect_uri: callbackUrl,
					}),
				},
			);

			const tokenData = await tokenResponse.json();

			if (!tokenData.access_token) {
				return new Response(`OAuth failed: ${JSON.stringify(tokenData)}`, {
					status: 400,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}

			const profileResponse = await fetch("https://api.github.com/user", {
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${tokenData.access_token}`,
					"User-Agent": "decap-cms-oauth-worker",
				},
			});

			if (!profileResponse.ok) {
				return new Response("Failed to fetch GitHub profile", { status: 403 });
			}

			const profile = await profileResponse.json();
			const username = String(profile.login || "").toLowerCase();
			const allowedUsers = String(env.ALLOWED_GITHUB_USERS || "")
				.split(",")
				.map((value) => value.trim().toLowerCase())
				.filter(Boolean);

			if (!allowedUsers.includes(username)) {
				return new Response(`Access denied for GitHub user: ${profile.login}`, {
					status: 403,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}

			const tokenPayload = JSON.stringify({ token: tokenData.access_token });

			const headers = withClearedOauthCookies(
				new Headers({ "Content-Type": "text/html; charset=utf-8" }),
			);

			return new Response(
				`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Login complete</title>
  </head>
  <body>
    <script>
      const receiveMessage = () => {
        window.opener.postMessage(
          'authorization:github:success:${tokenPayload}',
          '${openerOrigin}'
        );
        window.removeEventListener('message', receiveMessage, false);
        window.close();
      };

      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage('authorizing:github', '${openerOrigin}');
    </script>
    Login complete. You can close this window.
  </body>
</html>`,
				{
					headers,
				},
			);
		}

		if (url.pathname === "/contact") {
			const origin = getRequestOrigin(request, url);

			if (!origin || !isAllowedOrigin(origin, env)) {
				return jsonResponse({ error: "Invalid origin" }, 403);
			}

			if (request.method === "OPTIONS") {
				return new Response(null, {
					status: 204,
					headers: corsHeaders(origin),
				});
			}

			if (request.method !== "POST") {
				return jsonResponse(
					{ error: "Method not allowed" },
					405,
					corsHeaders(origin),
				);
			}

			const contentType = request.headers.get("Content-Type") || "";

			if (!contentType.includes("application/json")) {
				return jsonResponse(
					{ error: "Content-Type must be application/json" },
					415,
					corsHeaders(origin),
				);
			}

			let body;

			try {
				body = await request.json();
			} catch {
				return jsonResponse(
					{ error: "Invalid JSON body" },
					400,
					corsHeaders(origin),
				);
			}

			if (body && typeof body === "object" && body._hp) {
				return jsonResponse(
					{ success: true, message: "Message received" },
					200,
					corsHeaders(origin),
				);
			}

			const clientIp = request.headers.get("CF-Connecting-IP") || null;

			if (clientIp && isRateLimited(clientIp)) {
				return jsonResponse(
					{ error: "Too many requests. Please try again later." },
					429,
					corsHeaders(origin),
				);
			}

			const turnstileToken =
				body && typeof body === "object" ? body.turnstileToken : undefined;

			if (env.TURNSTILE_SECRET_KEY) {
				if (!turnstileToken) {
					return jsonResponse(
						{ error: "Bot verification is required" },
						403,
						corsHeaders(origin),
					);
				}

				const turnstileValid = await verifyTurnstile(
					turnstileToken,
					clientIp,
					env.TURNSTILE_SECRET_KEY,
				);

				if (!turnstileValid) {
					return jsonResponse(
						{ error: "Bot verification failed" },
						403,
						corsHeaders(origin),
					);
				}
			}

			const { valid, errors } = validateContactPayload(body);

			if (!valid) {
				return jsonResponse(
					{ error: "Validation failed", fields: errors },
					422,
					corsHeaders(origin),
				);
			}

			const email = await sendEmail(body, env);

			if (email.skipped) {
				console.error(
					"Email delivery skipped: RESEND_API_KEY or CONTACT_EMAIL is not configured",
				);
				return jsonResponse(
					{ error: "Service temporarily unavailable. Please try again later." },
					503,
					corsHeaders(origin),
				);
			}

			if (!email.sent) {
				return jsonResponse(
					{ error: "Unable to deliver your message. Please try again later." },
					502,
					corsHeaders(origin),
				);
			}

			return jsonResponse(
				{ success: true, message: "Message received" },
				200,
				corsHeaders(origin),
			);
		}

		if (url.pathname === "/assistant") {
			return handleAssistantRequest(request, env, url);
		}

		if (url.pathname === "/assistant-routed") {
			return handleAssistantRequest(request, env, url, {
				routeChatWithFallbacks: true,
			});
		}

		return new Response("Not found", { status: 404 });
	},
};
