import { Hono } from "hono";
import { z } from "zod";
import { getRagConfig } from "./rag/config";
import { createAskResponse, jsonResponse } from "./rag/response";
import { generateAnswer, retrieveChunks } from "./rag/retrieve";
import type { RagEnv } from "./rag/types";
import { corsHeaders } from "./utils/http";
import { getRequestOrigin, isAllowedOrigin } from "./utils/origin";

const askRequestSchema = z.object({
	question: z
		.string()
		.trim()
		.min(1, "question is required")
		.max(500, "question is too long"),
});

const app = new Hono<{ Bindings: RagEnv }>();

export function renderRagHomePage() {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Portfolio RAG Worker</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe7;
        --surface: rgba(255, 252, 245, 0.92);
        --ink: #1f2937;
        --muted: #5f6b7a;
        --line: rgba(31, 41, 55, 0.12);
        --accent: #0f766e;
        --accent-strong: #115e59;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 34%),
          radial-gradient(circle at top right, rgba(180, 83, 9, 0.14), transparent 28%),
          linear-gradient(180deg, #f8f4ec 0%, var(--bg) 100%);
      }
      main {
        width: min(920px, calc(100% - 32px));
        margin: 48px auto;
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--surface);
        backdrop-filter: blur(14px);
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 10px;
        font-size: clamp(2rem, 4vw, 3.2rem);
        line-height: 1.05;
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .grid {
        display: grid;
        gap: 18px;
        margin-top: 28px;
      }
      textarea {
        width: 100%;
        min-height: 120px;
        padding: 16px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.7);
        color: var(--ink);
        font: inherit;
        resize: vertical;
      }
      button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        padding: 12px 18px;
        font: inherit;
        cursor: pointer;
        width: fit-content;
      }
      button:hover { background: var(--accent-strong); }
      .examples {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .example {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: white;
        color: var(--ink);
        padding: 8px 12px;
        cursor: pointer;
      }
      pre {
        margin: 0;
        padding: 18px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: #111827;
        color: #e5eef8;
        overflow: auto;
        min-height: 180px;
      }
      .row {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .status {
        font-size: 0.95rem;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Portfolio RAG Worker</h1>
      <p>Ask the same worker at <code>/ask</code> from this page. It uses the deployed Vectorize, KV, and Workers AI bindings behind the same worker.</p>
      <div class="grid">
        <div class="examples">
          <button class="example" type="button" data-question="What did Hassan do at Overflow App Inc?">Overflow role</button>
          <button class="example" type="button" data-question="Has Hassan worked on payment infrastructure?">Payment infra</button>
          <button class="example" type="button" data-question="Where did Hassan study computer science?">Education</button>
          <button class="example" type="button" data-question="Who is Danyal Javed?">Recommendation</button>
        </div>
        <textarea id="question" placeholder="Ask something about experience, projects, education, recommendations, or portfolio content..."></textarea>
        <div class="row">
          <button id="ask" type="button">Ask /ask</button>
          <span class="status" id="status">Idle</span>
        </div>
        <pre id="output">{
  "hint": "Responses will appear here"
}</pre>
      </div>
    </main>
    <script>
      const questionEl = document.getElementById("question");
      const outputEl = document.getElementById("output");
      const statusEl = document.getElementById("status");

      async function ask(question) {
        statusEl.textContent = "Calling /ask...";
        outputEl.textContent = "Loading...";

        try {
          const response = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
          });

          const payload = await response.json();
          outputEl.textContent = JSON.stringify(payload, null, 2);
          statusEl.textContent = response.ok ? "Done" : "Request returned an error";
        } catch (error) {
          outputEl.textContent = JSON.stringify({ error: String(error) }, null, 2);
          statusEl.textContent = "Request failed";
        }
      }

      document.getElementById("ask").addEventListener("click", () => {
        const question = questionEl.value.trim();
        if (!question) {
          statusEl.textContent = "Enter a question first";
          return;
        }
        ask(question);
      });

      for (const button of document.querySelectorAll(".example")) {
        button.addEventListener("click", () => {
          questionEl.value = button.dataset.question || "";
          ask(questionEl.value);
        });
      }
    </script>
  </body>
</html>`;
}

export function handleRagHomeRequest() {
	return new Response(renderRagHomePage(), {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
		},
	});
}

export async function handleAskRequest(request: Request, env: RagEnv) {
	const config = getRagConfig(env);
	const url = new URL(request.url);
	const origin = getRequestOrigin(request, url);

	if (!origin || !isAllowedOrigin(origin, env, url.origin)) {
		return jsonResponse({ error: "Invalid origin" }, 403, origin);
	}

	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: corsHeaders(origin),
		});
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405, origin);
	}

	if (
		!request.headers
			.get("content-type")
			?.toLowerCase()
			.includes("application/json")
	) {
		return jsonResponse({ error: "Expected application/json" }, 415, origin);
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON body" }, 400, origin);
	}

	const parsed = askRequestSchema.safeParse(body);
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Validation failed",
				fields: parsed.error.issues.map((issue) => issue.message),
			},
			400,
			origin,
		);
	}

	try {
		const retrieval = await retrieveChunks(parsed.data.question, env, config);

		if (retrieval.status === "no_match") {
			return jsonResponse(
				createAskResponse({
					status: "no_match",
					answer: "I could not find relevant context in the portfolio dataset.",
					citations: [],
					retrievalMatched: 0,
					config,
				}),
				200,
				origin,
			);
		}

		if (retrieval.status === "insufficient_context") {
			return jsonResponse(
				createAskResponse({
					status: "insufficient_context",
					answer:
						"I found weak or incomplete matches, so I cannot answer confidently from the retrieved context.",
					citations: [],
					retrievalMatched: retrieval.matched,
					config,
				}),
				200,
				origin,
			);
		}

		const answer = await generateAnswer(
			parsed.data.question,
			retrieval.chunks,
			env,
			config,
		);
		return jsonResponse(
			createAskResponse({
				status: "answered",
				answer:
					answer ||
					"I found relevant context, but the generation step returned an empty answer.",
				citations: retrieval.citations,
				retrievalMatched: retrieval.matched,
				config,
			}),
			200,
			origin,
		);
	} catch (error) {
		return jsonResponse(
			createAskResponse({
				status: "error",
				answer:
					"The RAG request failed before a grounded answer could be generated.",
				citations: [],
				retrievalMatched: 0,
				config,
				error: error instanceof Error ? error.message : "Unknown error",
			}),
			502,
			origin,
		);
	}
}

app.get("/", () => handleRagHomeRequest());

app.all("/ask", async (c) => handleAskRequest(c.req.raw, c.env));

app.notFound((c) => {
	const origin = getRequestOrigin(c.req.raw, new URL(c.req.raw.url));
	return jsonResponse({ error: "Not found" }, 404, origin);
});

export default app;
