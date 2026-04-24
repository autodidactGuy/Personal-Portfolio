import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import type { RagEnv } from "./rag/types";
import { handleAskRequest, handleRagHomeRequest } from "./rag-app";
import {
	corsHeaders,
	createRedirectResponse,
	jsonResponse,
	parseCookies,
	parseJsonRequest,
	serializeCookie,
	withClearedOauthCookies,
} from "./utils/http";
import { getRequestOrigin, isAllowedOrigin } from "./utils/origin";
import {
	callAssistantChatWithRouting,
	callGitHubModels,
	callRawAssistantProvider,
	createGracefulRateLimitedAssistantResponse,
	shouldGracefullyHandleAssistantRateLimit,
} from "./utils/providers";
import {
	isRateLimited,
	rateLimitMap,
	resetRateLimitState,
} from "./utils/rate-limit";

type WorkerEnv = Record<string, unknown> & {
	AI?: {
		run(model: string, input: Record<string, unknown>): Promise<unknown>;
	};
	ALLOWED_ORIGINS?: string;
	ORIGIN?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	GITHUB_OAUTH_SCOPE?: string;
	ALLOWED_GITHUB_USERS?: string;
	RESEND_API_KEY?: string;
	CONTACT_EMAIL?: string;
	FROM_EMAIL?: string;
	TURNSTILE_SECRET_KEY?: string;
	GITHUB_MODELS_CHAT_MODEL?: string;
	ASSISTANT_PROVIDER_PRIORITY?: string;
};

type ContactPayload = {
	name: string;
	email: string;
	subject: string;
	message: string;
	phone?: string;
};

async function sendEmail(body: ContactPayload, env: WorkerEnv) {
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

function createStateToken() {
	return crypto.randomUUID();
}

async function verifyTurnstile(
	token: string,
	ip: string | null,
	secretKey: string,
) {
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

		const result = (await response.json()) as { success?: boolean };
		return result.success === true;
	} catch (error) {
		console.error("Turnstile verification failed", error);
		return false;
	}
}

const ASSISTANT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ASSISTANT_RATE_LIMIT_MAX = 100;

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
	model: z.string().trim().min(1).optional(),
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

const rawProviderSchema = z.object({
	provider: z.enum([
		"github-models",
		"groq",
		"huggingface",
		"cloudflare",
		"portfolio-rag",
	]),
	request: assistantChatSchema,
});

function validateContactPayload(data: unknown) {
	const result = contactSchema.safeParse(data);

	if (result.success) {
		return { valid: true, errors: [] as string[] };
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

function validateAssistantPayload(data: unknown) {
	const result = assistantRequestSchema.safeParse(data);

	if (result.success) {
		return { valid: true, data: result.data, errors: [] as string[] };
	}

	const errors = result.error.issues.map((issue) => issue.message);
	return { valid: false, data: null, errors };
}

function validateRawProviderPayload(data: unknown) {
	const result = rawProviderSchema.safeParse(data);

	if (result.success) {
		return { valid: true, data: result.data, errors: [] as string[] };
	}

	return {
		valid: false,
		data: null,
		errors: result.error.issues.map((issue) => issue.message),
	};
}

const requireAllowedOrigin = createMiddleware(async (c, next) => {
	const requestUrl = new URL(c.req.raw.url);
	const origin = getRequestOrigin(c.req.raw, requestUrl);

	if (!origin || !isAllowedOrigin(origin, c.env, requestUrl.origin)) {
		return jsonResponse({ error: "Invalid origin" }, 403);
	}

	c.set("requestOrigin", origin);

	if (c.req.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: corsHeaders(origin),
		});
	}

	return next();
});

async function handleAssistantRequest(
	request: Request,
	env: WorkerEnv,
	url: URL,
	options: { routeChatWithFallbacks?: boolean } = {},
) {
	const { routeChatWithFallbacks = false } = options;
	const origin = getRequestOrigin(request, url);
	const defaultChatModel = env.GITHUB_MODELS_CHAT_MODEL;

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

	let body: unknown;

	try {
		body = await parseJsonRequest(request, corsHeaders(origin));
	} catch (response) {
		return response as Response;
	}

	const clientIp = request.headers.get("CF-Connecting-IP") || null;

	if (
		clientIp &&
		isRateLimited(`assistant:${clientIp}`, {
			windowMs: ASSISTANT_RATE_LIMIT_WINDOW_MS,
			max: ASSISTANT_RATE_LIMIT_MAX,
		})
	) {
		const bodyRecord =
			body && typeof body === "object"
				? (body as Record<string, unknown>)
				: null;

		if (bodyRecord?.action === "chat") {
			return createGracefulRateLimitedAssistantResponse(
				typeof bodyRecord.model === "string" ? bodyRecord.model : null,
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
				? await callAssistantChatWithRouting(env, {
						...data,
						model: data.model || defaultChatModel,
					})
				: await callGitHubModels("/inference/chat/completions", env, {
						model: data.model || defaultChatModel,
						temperature: data.temperature ?? 0,
						max_tokens: data.max_tokens ?? 220,
						response_format: data.response_format,
						messages: data.messages,
					});

	const headers = new Headers(proxyResponse.headers);

	for (const [key, value] of Object.entries(corsHeaders(origin))) {
		headers.set(key, value);
	}

	if (
		data.action === "chat" &&
		(await shouldGracefullyHandleAssistantRateLimit(proxyResponse))
	) {
		return createGracefulRateLimitedAssistantResponse(
			data.model ?? null,
			origin,
			headers.get("X-Assistant-Provider") || "upstream-rate-limit",
		);
	}

	return new Response(proxyResponse.body, {
		status: proxyResponse.status,
		headers,
	});
}

async function handleRawProviderRequest(
	request: Request,
	env: WorkerEnv,
	url: URL,
) {
	const origin = getRequestOrigin(request, url);

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

	let body: unknown;

	try {
		body = await parseJsonRequest(request, corsHeaders(origin));
	} catch (response) {
		return response as Response;
	}

	const { valid, data, errors } = validateRawProviderPayload(body);

	if (!valid || !data) {
		return jsonResponse(
			{ error: "Validation failed", fields: errors },
			422,
			corsHeaders(origin),
		);
	}

	const providerResponse = await callRawAssistantProvider(
		data.provider,
		data.request,
		env,
	);
	const headers = new Headers(providerResponse.headers);

	for (const [key, value] of Object.entries(corsHeaders(origin))) {
		headers.set(key, value);
	}

	headers.set("X-Assistant-Provider", data.provider);

	return new Response(providerResponse.body, {
		status: providerResponse.status,
		headers,
	});
}

async function handleContactRequest(
	request: Request,
	env: WorkerEnv,
	url: URL,
) {
	const origin = getRequestOrigin(request, url);

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

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return jsonResponse(
			{ error: "Invalid JSON body" },
			400,
			corsHeaders(origin),
		);
	}

	const bodyRecord =
		body && typeof body === "object" ? (body as Record<string, unknown>) : null;

	if (bodyRecord?._hp) {
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
		typeof bodyRecord?.turnstileToken === "string"
			? bodyRecord.turnstileToken
			: undefined;

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

	const email = await sendEmail(body as ContactPayload, env);

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

export { rateLimitMap, resetRateLimitState };

const app = new Hono<{ Bindings: WorkerEnv }>();
app.use("/contact", requireAllowedOrigin);
app.use("/assistant", requireAllowedOrigin);
app.use("/assistant-routed", requireAllowedOrigin);
app.use("/assistant-provider-raw", requireAllowedOrigin);

app.get("/", () => handleRagHomeRequest());

app.all("/ask", async (c) =>
	handleAskRequest(c.req.raw, c.env as unknown as RagEnv),
);

app.all("/auth", async (c) => {
	const request = c.req.raw;
	const env = c.env as WorkerEnv;
	const url = new URL(request.url);
	const callbackUrl = `${url.origin}/callback`;
	const requestedOrigin = getRequestOrigin(request, url);

	if (!requestedOrigin || !isAllowedOrigin(requestedOrigin, env, url.origin)) {
		return new Response("Invalid origin", {
			status: 400,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}

	const state = createStateToken();
	const githubUrl = new URL("https://github.com/login/oauth/authorize");
	githubUrl.searchParams.set("client_id", String(env.GITHUB_CLIENT_ID || ""));
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
});

app.all("/callback", async (c) => {
	const request = c.req.raw;
	const env = c.env as WorkerEnv;
	const url = new URL(request.url);
	const callbackUrl = `${url.origin}/callback`;
	const code = url.searchParams.get("code");
	const returnedState = url.searchParams.get("state");
	const cookies = parseCookies(request.headers.get("Cookie")) as Record<
		string,
		string | undefined
	>;
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

	if (!openerOrigin || !isAllowedOrigin(openerOrigin, env, url.origin)) {
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

	const tokenData = (await tokenResponse.json()) as { access_token?: string };

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

	const profile = (await profileResponse.json()) as { login?: string };
	const username = String(profile.login || "").toLowerCase();
	const allowedUsers = String(env.ALLOWED_GITHUB_USERS || "")
		.split(",")
		.map((value: string) => value.trim().toLowerCase())
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
});

app.all("/contact", async (c) => {
	const request = c.req.raw;
	const env = c.env as WorkerEnv;
	const url = new URL(request.url);
	return handleContactRequest(request, env, url);
});

app.all("/assistant", async (c) => {
	const request = c.req.raw;
	const env = c.env as WorkerEnv;
	const url = new URL(request.url);
	return handleAssistantRequest(request, env, url);
});

app.all("/assistant-routed", async (c) => {
	const request = c.req.raw;
	const env = c.env as WorkerEnv;
	const url = new URL(request.url);
	return handleAssistantRequest(request, env, url, {
		routeChatWithFallbacks: true,
	});
});

app.all("/assistant-provider-raw", async (c) => {
	const request = c.req.raw;
	const env = c.env as WorkerEnv;
	const url = new URL(request.url);
	return handleRawProviderRequest(request, env, url);
});

app.notFound(() => new Response("Not found", { status: 404 }));

export default app;
