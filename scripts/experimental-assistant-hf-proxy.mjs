import http from "node:http";
import experimentalAssistantDefaults from "../config/experimental-assistant.defaults.json" with { type: "json" };

const HOST =
	process.env.HF_PROXY_HOST || experimentalAssistantDefaults.HF_PROXY_HOST;
const PORT = Number(
	process.env.HF_PROXY_PORT || experimentalAssistantDefaults.HF_PROXY_PORT,
);
const HF_TOKEN = process.env.HF_TOKEN || experimentalAssistantDefaults.HF_TOKEN;
const DEFAULT_EMBEDDING_MODEL =
	process.env.HF_EMBEDDING_MODEL ||
	experimentalAssistantDefaults.HF_EMBEDDING_MODEL;
const DEFAULT_CHAT_MODEL =
	process.env.HF_CHAT_MODEL || experimentalAssistantDefaults.HF_CHAT_MODEL;

function json(statusCode, body, origin) {
	return new Response(JSON.stringify(body), {
		status: statusCode,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Access-Control-Allow-Origin": origin || "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}

function isLocalOrigin(origin) {
	if (!origin) {
		return true;
	}

	return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

async function readRequestBody(request) {
	const chunks = [];

	for await (const chunk of request) {
		chunks.push(chunk);
	}

	if (!chunks.length) {
		return {};
	}

	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleEmbeddings(body) {
	const model = body.model || DEFAULT_EMBEDDING_MODEL;
	const input = body.input;

	if (!HF_TOKEN) {
		return {
			statusCode: 503,
			body: {
				error: "HF_TOKEN is not configured for the local proxy.",
			},
		};
	}

	if (!input || (typeof input !== "string" && !Array.isArray(input))) {
		return {
			statusCode: 400,
			body: {
				error: "Embeddings input must be a string or string array.",
			},
		};
	}

	const response = await fetch(
		`https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${HF_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				inputs: input,
				options: {
					wait_for_model: true,
				},
			}),
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		return {
			statusCode: response.status,
			body: {
				error: errorText || "Embedding request failed.",
			},
		};
	}

	const payload = await response.json();
	const normalizedPayload = Array.isArray(input) ? payload : [payload];
	const embeddings = normalizedPayload.map((embedding, index) => ({
		object: "embedding",
		index,
		embedding: Array.isArray(embedding[0]) ? embedding[0] : embedding,
	}));

	return {
		statusCode: 200,
		body: {
			object: "list",
			data: embeddings,
			model,
		},
	};
}

async function handleChat(body) {
	const model = body.model || DEFAULT_CHAT_MODEL;

	if (!HF_TOKEN) {
		return {
			statusCode: 503,
			body: {
				error: "HF_TOKEN is not configured for the local proxy.",
			},
		};
	}

	if (!model) {
		return {
			statusCode: 400,
			body: {
				error:
					"Chat model is missing. Set HF_CHAT_MODEL or pass model in the request.",
			},
		};
	}

	if (!Array.isArray(body.messages) || !body.messages.length) {
		return {
			statusCode: 400,
			body: {
				error: "Chat completions require a non-empty messages array.",
			},
		};
	}

	const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${HF_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model,
			messages: body.messages,
			temperature: body.temperature ?? 0.2,
			max_tokens: body.max_tokens ?? 500,
			response_format: body.response_format,
			stream: false,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		return {
			statusCode: response.status,
			body: {
				error: errorText || "Chat request failed.",
			},
		};
	}

	return {
		statusCode: 200,
		body: await response.json(),
	};
}

const server = http.createServer(async (request, response) => {
	const origin = request.headers.origin;

	if (!isLocalOrigin(origin)) {
		response.writeHead(403, {
			"Content-Type": "application/json; charset=utf-8",
		});
		response.end(JSON.stringify({ error: "Only local origins are allowed." }));
		return;
	}

	if (request.method === "OPTIONS") {
		response.writeHead(204, {
			"Access-Control-Allow-Origin": origin || "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		});
		response.end();
		return;
	}

	if (request.method === "GET" && request.url === "/health") {
		response.writeHead(200, {
			"Content-Type": "application/json; charset=utf-8",
			"Access-Control-Allow-Origin": origin || "*",
		});
		response.end(
			JSON.stringify({
				ok: true,
				host: HOST,
				port: PORT,
				hasToken: Boolean(HF_TOKEN),
				defaultEmbeddingModel: DEFAULT_EMBEDDING_MODEL,
				defaultChatModel: DEFAULT_CHAT_MODEL || null,
			}),
		);
		return;
	}

	let result;

	try {
		const body = await readRequestBody(request);

		if (request.method === "POST" && request.url === "/v1/embeddings") {
			result = await handleEmbeddings(body);
		} else if (
			request.method === "POST" &&
			request.url === "/v1/chat/completions"
		) {
			result = await handleChat(body);
		} else {
			result = {
				statusCode: 404,
				body: {
					error: "Not found.",
				},
			};
		}
	} catch (error) {
		result = {
			statusCode: 500,
			body: {
				error: error instanceof Error ? error.message : "Unknown proxy error.",
			},
		};
	}

	response.writeHead(result.statusCode, {
		"Content-Type": "application/json; charset=utf-8",
		"Access-Control-Allow-Origin": origin || "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	});
	response.end(JSON.stringify(result.body));
});

server.listen(PORT, HOST, () => {
	console.log(
		`Experimental Hugging Face proxy listening on http://${HOST}:${PORT}`,
	);
});
