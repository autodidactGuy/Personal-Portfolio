import { Hono } from "hono";
import { z } from "zod";
import { getRagConfig } from "./rag/config";
import { createAskResponse, jsonResponse } from "./rag/response";
import { generateAnswer, retrieveChunks } from "./rag/retrieve";
import type { RagEnv, RagRetrieveResponse } from "./rag/types";
import { corsHeaders } from "./utils/http";
import { getRequestOrigin, isAllowedOrigin } from "./utils/origin";

const askRequestSchema = z.object({
	question: z
		.string()
		.trim()
		.min(1, "question is required")
		.max(500, "question is too long"),
});

const retrieveRequestSchema = z.object({
	question: z
		.string()
		.trim()
		.min(1, "question is required")
		.max(500, "question is too long"),
	query: z
		.string()
		.trim()
		.min(1, "query is required")
		.max(5000, "query is too long")
		.optional(),
});

const app = new Hono<{ Bindings: RagEnv }>();

export function renderRagHomePage() {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Portfolio Assistant Debug</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f8fbff;
        --bg-deep: #edf4ff;
        --surface: rgba(255, 255, 255, 0.92);
        --surface-strong: rgba(255, 255, 255, 0.82);
        --ink: #0f172a;
        --muted: #475569;
        --line: rgba(148, 163, 184, 0.2);
        --line-strong: rgba(71, 85, 105, 0.24);
        --accent: #0072f5;
        --accent-strong: #0059c7;
        --accent-soft: rgba(0, 114, 245, 0.1);
        --code: #0f172a;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          color-scheme: dark;
          --bg: #020617;
          --bg-deep: #0b1220;
          --surface: rgba(15, 23, 42, 0.9);
          --surface-strong: rgba(15, 23, 42, 0.84);
          --ink: #e2e8f0;
          --muted: #94a3b8;
          --line: rgba(148, 163, 184, 0.18);
          --line-strong: rgba(148, 163, 184, 0.24);
          --accent: #3b82f6;
          --accent-strong: #60a5fa;
          --accent-soft: rgba(59, 130, 246, 0.16);
          --code: #e2e8f0;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(23, 126, 200, 0.16), transparent 28%),
          radial-gradient(circle at top right, rgba(40, 59, 181, 0.12), transparent 24%),
          linear-gradient(180deg, var(--bg) 0%, var(--bg-deep) 100%);
      }
      main {
        width: min(1120px, calc(100% - 28px));
        margin: 40px auto;
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background: var(--surface);
        backdrop-filter: blur(14px);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
      }
      .hero {
        display: grid;
        gap: 18px;
        grid-template-columns: 1.3fr 0.9fr;
        align-items: start;
      }
      .eyebrow {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--surface-strong);
        color: var(--accent-strong);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 14px 0 10px;
        font-size: clamp(2.4rem, 5vw, 4.4rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }
      .lede, p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .panel {
        padding: 18px;
        border-radius: 22px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(241,245,249,0.78));
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent-strong);
        font-size: 13px;
        font-weight: 600;
      }
      .layout {
        display: grid;
        gap: 18px;
        margin-top: 24px;
        grid-template-columns: 1.15fr 0.85fr;
      }
      .stack {
        display: grid;
        gap: 18px;
      }
      .section-title {
        margin: 0 0 6px;
        font-size: 1.05rem;
        font-weight: 700;
      }
      .section-copy {
        margin: 0 0 14px;
        font-size: 0.95rem;
      }
      .controls {
        display: grid;
        gap: 14px;
      }
      .control-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
      }
      input, select, textarea {
        width: 100%;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.85);
        color: var(--ink);
        font: inherit;
        outline: none;
        transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
      }
      input, select {
        height: 46px;
        padding: 0 14px;
      }
      textarea {
        min-height: 136px;
        padding: 14px 16px;
        resize: vertical;
      }
      input:focus, select:focus, textarea:focus {
        border-color: rgba(12, 122, 116, 0.45);
        box-shadow: 0 0 0 4px rgba(12, 122, 116, 0.08);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        padding: 12px 18px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        width: fit-content;
        transition: transform 120ms ease, background 120ms ease, opacity 120ms ease;
      }
      button:hover { background: var(--accent-strong); transform: translateY(-1px); }
      button:disabled { opacity: 0.7; cursor: progress; transform: none; }
      .secondary {
        background: white;
        color: var(--ink);
        border: 1px solid var(--line-strong);
      }
      .secondary:hover { background: rgba(255,255,255,0.72); }
      .examples {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .example {
        border: 1px solid var(--line-strong);
        border-radius: 999px;
        background: rgba(255,255,255,0.8);
        color: var(--ink);
        padding: 8px 12px;
        cursor: pointer;
        font-weight: 600;
      }
      .meta {
        display: grid;
        gap: 10px;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.64);
      }
      .meta-row strong { font-size: 13px; }
      .meta-row span { color: var(--muted); font-size: 13px; text-align: right; }
      pre {
        margin: 0;
        padding: 18px;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, #0f172a, #111827);
        color: #e5eef8;
        overflow: auto;
        min-height: 320px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .row {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .status {
        font-size: 0.92rem;
        color: var(--muted);
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 600;
      }
      .checkbox input {
        width: 18px;
        height: 18px;
        margin: 0;
      }
      .footnote {
        font-size: 12px;
        color: var(--muted);
      }
      code {
        padding: 2px 6px;
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.06);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
        font-size: 12px;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background:
            radial-gradient(circle at top left, rgba(23, 126, 200, 0.3), transparent 28%),
            radial-gradient(circle at top right, rgba(40, 59, 181, 0.18), transparent 24%),
            linear-gradient(180deg, var(--bg) 0%, var(--bg-deep) 100%);
        }
        main {
          box-shadow: 0 24px 60px rgba(2, 6, 23, 0.45);
        }
        .panel {
          background: linear-gradient(180deg, rgba(15,23,42,0.88), rgba(17,24,39,0.82));
        }
        input, select, textarea {
          background: rgba(15, 23, 42, 0.82);
          color: var(--ink);
        }
        .secondary {
          background: rgba(15, 23, 42, 0.72);
          color: var(--ink);
        }
        .secondary:hover {
          background: rgba(30, 41, 59, 0.9);
        }
        .example {
          background: rgba(15, 23, 42, 0.72);
        }
        .meta-row {
          background: rgba(15, 23, 42, 0.56);
        }
        code {
          background: rgba(148, 163, 184, 0.12);
        }
      }
      @media (max-width: 900px) {
        .hero, .layout, .control-grid { grid-template-columns: 1fr; }
        main { width: min(100% - 20px, 1120px); margin: 20px auto; padding: 18px; }
        h1 { font-size: clamp(2rem, 12vw, 3.3rem); }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="panel">
          <div class="eyebrow">Assistant Worker Debug</div>
          <h1>Portfolio assistant provider console.</h1>
          <p class="lede">Use the same worker routes that power the portfolio assistant. This page now defaults to raw provider calls through <code>/assistant-provider-raw</code>, while keeping semantic chunk inspection and frontend-style routed calls available for retrieval debugging.</p>
          <div class="chips">
            <div class="chip">GitHub Models</div>
            <div class="chip">Groq</div>
            <div class="chip">Groq Backup</div>
            <div class="chip">Hugging Face</div>
            <div class="chip">Cloudflare AI</div>
            <div class="chip">Portfolio RAG</div>
          </div>
        </div>
        <div class="panel meta">
          <div class="meta-row"><strong>Primary action</strong><span>Raw provider debug</span></div>
          <div class="meta-row"><strong>Secondary action</strong><span>Cloudflare semantic retrieval</span></div>
          <div class="meta-row"><strong>Routed simulation</strong><span>Frontend-style <code>/assistant-routed</code> payload</span></div>
          <div class="meta-row"><strong>Same worker origin</strong><span>Calls stay on this deployment</span></div>
          <div class="meta-row"><strong>Best use</strong><span>Compare primary and backup routed providers quickly</span></div>
        </div>
      </section>
      <section class="layout">
        <div class="stack">
          <div class="panel">
            <h2 class="section-title">Prompt Lab</h2>
            <p class="section-copy">These quick prompts are tuned for the portfolio data and the routed assistant stack.</p>
            <div class="examples">
              <button class="example" type="button" data-question="What did Hassan do at Overflow App Inc?">Overflow role</button>
              <button class="example" type="button" data-question="Has Hassan worked on payment infrastructure?">Payment infra</button>
              <button class="example" type="button" data-question="Where did Hassan study computer science?">Education</button>
              <button class="example" type="button" data-question="Who is Danyal Javed?">Recommendation</button>
            </div>
          </div>
          <div class="panel controls">
            <div>
              <h2 class="section-title">Raw Provider Debug</h2>
              <p class="section-copy">This mirrors the portfolio assistant debug mode and posts to <code>/assistant-provider-raw</code>. You can also inspect Vectorize-backed snippets through <code>/assistant-retrieve</code> and send those snippets through a frontend-style <code>/assistant-routed</code> request. The <code>groq_backup</code> option uses the same Groq API key with the model defined by <code>GROQ_BACKUP_MODEL</code>.</p>
            </div>
            <div class="control-grid">
              <label>
                <span>Provider</span>
                <select id="provider">
                  <option value="github-models">GitHub Models</option>
                  <option value="groq">Groq</option>
                  <option value="groq_backup">Groq Backup</option>
                  <option value="huggingface">Hugging Face</option>
                  <option value="cloudflare">Cloudflare AI</option>
                  <option value="portfolio-rag">Portfolio RAG</option>
                </select>
              </label>
              <label>
                <span>Model override</span>
                <input id="model" placeholder="optional" />
              </label>
              <label>
                <span>Temperature</span>
                <input id="temperature" inputmode="decimal" value="0" />
              </label>
              <label>
                <span>Max tokens</span>
                <input id="maxTokens" inputmode="numeric" value="500" />
              </label>
            </div>
              <label>
                <span>Question</span>
                <textarea id="question" placeholder="Ask about experience, systems work, projects, education, recommendations, or technical strengths..."></textarea>
              </label>
              <label>
                <span>Retrieval query override</span>
                <textarea id="retrievalQuery" placeholder="Optional. Leave empty to use the same question for semantic retrieval."></textarea>
              </label>
            <label class="checkbox">
              <input checked id="structuredOutput" type="checkbox" />
              <span>Request structured JSON output like the portfolio assistant debug UI</span>
            </label>
            <div class="actions">
              <button id="askRaw" type="button">Call /assistant-provider-raw</button>
              <button class="secondary" id="askRetrieve" type="button">Call /assistant-retrieve</button>
              <button class="secondary" id="askRouted" type="button">Call frontend-style /assistant-routed</button>
              <button class="secondary" id="askRag" type="button">Call grounded /ask</button>
              <span class="status" id="status">Idle</span>
            </div>
            <p class="footnote">Provider raw calls are useful for direct model behavior. <code>/assistant-retrieve</code> shows Cloudflare semantic chunk matches, and the frontend-style routed action forwards those snippets to <code>/assistant-routed</code> in the same shape the site uses.</p>
          </div>
        </div>
        <div class="panel stack">
          <div>
            <h2 class="section-title">Response</h2>
            <p class="section-copy">The raw payload, headers, and any structured assistant content will show up here exactly as returned by this worker.</p>
          </div>
          <div class="row status">
            <span>Endpoint: <code id="endpointLabel">/assistant-provider-raw</code></span>
            <span>Provider header: <code id="providerLabel">n/a</code></span>
            <span>Status: <code id="statusCode">n/a</code></span>
          </div>
          <pre id="output">{
  "hint": "Choose a provider and ask a question to inspect the worker response."
}</pre>
        </div>
      </section>
    </main>
    <script>
      const SYSTEM_PROMPT = "You are an AI assistant embedded on this portfolio website. Answer concisely and only use grounded information when possible.";
      const STRUCTURED_RESPONSE_FORMAT = {
        type: "json_schema",
        json_schema: {
          name: "resume_assistant_response",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              status: {
                type: "string",
                enum: ["answered", "missing", "rejected"]
              },
              answer: {
                type: "string"
              },
              citations: {
                type: "array",
                items: {
                  type: "string"
                },
                maxItems: 5
              }
            },
            required: ["status", "answer", "citations"]
          }
        }
      };

      const providerEl = document.getElementById("provider");
      const modelEl = document.getElementById("model");
      const temperatureEl = document.getElementById("temperature");
      const maxTokensEl = document.getElementById("maxTokens");
      const structuredOutputEl = document.getElementById("structuredOutput");
      const questionEl = document.getElementById("question");
      const retrievalQueryEl = document.getElementById("retrievalQuery");
      const outputEl = document.getElementById("output");
      const statusEl = document.getElementById("status");
      const endpointLabelEl = document.getElementById("endpointLabel");
      const providerLabelEl = document.getElementById("providerLabel");
      const statusCodeEl = document.getElementById("statusCode");
      const askRawButton = document.getElementById("askRaw");
      const askRetrieveButton = document.getElementById("askRetrieve");
      const askRoutedButton = document.getElementById("askRouted");
      const askRagButton = document.getElementById("askRag");

      if (
        !providerEl ||
        !modelEl ||
        !temperatureEl ||
        !maxTokensEl ||
        !structuredOutputEl ||
        !questionEl ||
        !retrievalQueryEl ||
        !outputEl ||
        !statusEl ||
        !endpointLabelEl ||
        !providerLabelEl ||
        !statusCodeEl ||
        !askRawButton ||
        !askRetrieveButton ||
        !askRoutedButton ||
        !askRagButton
      ) {
        throw new Error("Worker debugger UI failed to initialize because one or more controls are missing.");
      }

      function createRawRequestBody(question) {
        const temperatureValue = Number.parseFloat(temperatureEl.value);
        const maxTokensValue = Number.parseInt(maxTokensEl.value, 10);
        const structuredOutput = structuredOutputEl.checked;
        const provider = providerEl.value;
        const request = {
          action: "chat",
          temperature: Number.isFinite(temperatureValue) ? temperatureValue : 0,
          max_tokens: Number.isFinite(maxTokensValue) && maxTokensValue > 0 ? maxTokensValue : 500,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "developer",
              content: structuredOutput
                ? "Return a structured JSON response with status, answer, and citations when the provider supports it."
                : "Return a direct answer to the user question."
            },
            {
              role: "user",
              content: question
            }
          ]
        };

        if (modelEl.value.trim()) {
          request.model = modelEl.value.trim();
        }

        if (structuredOutput) {
          request.response_format = STRUCTURED_RESPONSE_FORMAT;
        }

        return {
          provider,
          request
        };
      }

      async function fetchSemanticRetrieval(question) {
        const query = retrievalQueryEl.value.trim();
        const response = await fetch("/assistant-retrieve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            ...(query ? { query } : {})
          }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload && typeof payload.error === "string"
              ? payload.error
              : "Semantic retrieval request failed."
          );
        }

        return payload;
      }

      function createFrontendStyleRoutedRequest(question, retrievalPayload) {
        const snippets = Array.isArray(retrievalPayload?.chunks)
          ? retrievalPayload.chunks.map((chunk) => ({
              id: chunk.id,
              title: chunk.title,
              text: chunk.text,
            }))
          : [];
        const snippetList = snippets.length
          ? snippets
              .map((snippet) => "[" + snippet.id + "] " + snippet.title + "\\n" + snippet.text)
              .join("\\n\\n")
          : "None";
        const temperatureValue = Number.parseFloat(temperatureEl.value);
        const maxTokensValue = Number.parseInt(maxTokensEl.value, 10);

        return {
          action: "chat",
          ...(modelEl.value.trim() ? { model: modelEl.value.trim() } : {}),
          temperature: Number.isFinite(temperatureValue) ? temperatureValue : 0,
          max_tokens: Number.isFinite(maxTokensValue) && maxTokensValue > 0 ? maxTokensValue : 500,
          response_format: structuredOutputEl.checked ? STRUCTURED_RESPONSE_FORMAT : undefined,
          messages: [
            {
              role: "system",
              content: 'You are an AI assistant embedded on this portfolio website.\\n\\nRules:\\n\\n* ONLY answer using provided resume data\\n* If info is missing: "I don\\'t have that information available."\\n* Do NOT hallucinate or guess\\n* ONLY answer about the person described in the provided resume data\\n* Reject unrelated questions\\n\\nTone:\\n\\n* Professional\\n* Concise\\n* Friendly'
            },
            {
              role: "developer",
              content: [
                "Use only the SUPPORTING_RESUME_SNIPPETS below.",
                "If the snippets do not contain the answer, respond with status \\"missing\\" and answer exactly: I don't have that information available.",
                'If the question is unrelated to the person described in the resume or recommendations, respond with status "rejected" and answer exactly: I can only answer questions based on the information available on this site.',
                "Do not infer, invent, generalize, or use outside knowledge.",
                "Every factual answer must be grounded in the snippet IDs you cite.",
                "",
                "RECENT_CHAT_CONTEXT:\\nNone",
                "",
                "SUPPORTING_RESUME_SNIPPETS:\\n" + snippetList
              ].join("\\n")
            },
            {
              role: "user",
              content: question
            }
          ]
        };
      }

      async function callEndpoint(pathname, body, providerLabel) {
        statusEl.textContent = "Calling " + pathname + "...";
        endpointLabelEl.textContent = pathname;
        providerLabelEl.textContent = providerLabel || "n/a";
        statusCodeEl.textContent = "pending";
        outputEl.textContent = "Loading...";

        try {
          const response = await fetch(pathname, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          const rawText = await response.text();
          let parsed;

          try {
            parsed = rawText ? JSON.parse(rawText) : null;
          } catch (error) {
            parsed = {
              rawText
            };
          }

          outputEl.textContent = JSON.stringify({
            endpoint: pathname,
            providerHeader: response.headers.get("X-Assistant-Provider"),
            providersHeader: response.headers.get("X-Assistant-Providers"),
            status: response.status,
            payload: parsed
          }, null, 2);
          providerLabelEl.textContent = response.headers.get("X-Assistant-Provider") || providerLabel || "n/a";
          statusCodeEl.textContent = String(response.status);
          statusEl.textContent = response.ok ? "Done" : "Request returned an error";
        } catch (error) {
          outputEl.textContent = JSON.stringify({ error: String(error) }, null, 2);
          statusCodeEl.textContent = "failed";
          statusEl.textContent = "Request failed";
        }
      }

      statusEl.textContent = "Debugger ready";

      askRawButton.addEventListener("click", () => {
        const question = questionEl.value.trim();
        if (!question) {
          statusEl.textContent = "Enter a question first";
          return;
        }
        callEndpoint("/assistant-provider-raw", createRawRequestBody(question), providerEl.value);
      });

      askRagButton.addEventListener("click", () => {
        const question = questionEl.value.trim();
        if (!question) {
          statusEl.textContent = "Enter a question first";
          return;
        }
        callEndpoint("/ask", { question }, "portfolio-rag");
      });

      askRetrieveButton.addEventListener("click", async () => {
        const question = questionEl.value.trim();
        if (!question) {
          statusEl.textContent = "Enter a question first";
          return;
        }

        statusEl.textContent = "Calling /assistant-retrieve...";
        endpointLabelEl.textContent = "/assistant-retrieve";
        providerLabelEl.textContent = "cloudflare-vectorize";
        statusCodeEl.textContent = "pending";
        outputEl.textContent = "Loading...";

        try {
          const payload = await fetchSemanticRetrieval(question);
          outputEl.textContent = JSON.stringify({
            endpoint: "/assistant-retrieve",
            query: retrievalQueryEl.value.trim() || question,
            payload
          }, null, 2);
          statusCodeEl.textContent = "200";
          statusEl.textContent = "Done";
        } catch (error) {
          outputEl.textContent = JSON.stringify({ error: String(error) }, null, 2);
          statusCodeEl.textContent = "failed";
          statusEl.textContent = "Request failed";
        }
      });

      askRoutedButton.addEventListener("click", async () => {
        const question = questionEl.value.trim();
        if (!question) {
          statusEl.textContent = "Enter a question first";
          return;
        }

        statusEl.textContent = "Building frontend-style routed request...";
        endpointLabelEl.textContent = "/assistant-routed";
        providerLabelEl.textContent = "routed";
        statusCodeEl.textContent = "pending";
        outputEl.textContent = "Loading...";

        try {
          const retrievalPayload = await fetchSemanticRetrieval(question);
          const body = createFrontendStyleRoutedRequest(question, retrievalPayload);
          await callEndpoint("/assistant-routed", body, "routed");
        } catch (error) {
          outputEl.textContent = JSON.stringify({ error: String(error) }, null, 2);
          statusCodeEl.textContent = "failed";
          statusEl.textContent = "Request failed";
        }
      });

      for (const button of document.querySelectorAll(".example")) {
        button.addEventListener("click", () => {
          questionEl.value = button.dataset.question || "";
          callEndpoint("/assistant-provider-raw", createRawRequestBody(questionEl.value), providerEl.value);
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
					answer: "I could not find relevant information.",
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
						"I found weak or incomplete matches, so I cannot answer confidently from the provided information.",
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
					"I found relevant information, but the generation step returned an empty answer.",
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

export async function handleRetrieveRequest(request: Request, env: RagEnv) {
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

	const parsed = retrieveRequestSchema.safeParse(body);
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
		const retrievalQuery = parsed.data.query || parsed.data.question;
		const retrieval = await retrieveChunks(retrievalQuery, env, config);

		if (retrieval.status === "no_match") {
			return jsonResponse(
				{
					ok: true,
					status: "no_match",
					matched: 0,
					chunks: [],
				} satisfies RagRetrieveResponse,
				200,
				origin,
			);
		}

		if (retrieval.status === "insufficient_context") {
			return jsonResponse(
				{
					ok: true,
					status: "insufficient_context",
					matched: retrieval.matched,
					chunks: [],
				} satisfies RagRetrieveResponse,
				200,
				origin,
			);
		}

		return jsonResponse(
			{
				ok: true,
				status: "ready",
				matched: retrieval.matched,
				chunks: retrieval.citations.map((citation, index) => ({
					id: citation.id,
					sourceType: citation.sourceType,
					title: citation.title,
					text: retrieval.chunks[index]?.text || "",
					url: citation.url,
					slug: citation.slug,
					section: citation.section,
					score: citation.score,
				})),
			} satisfies RagRetrieveResponse,
			200,
			origin,
		);
	} catch (error) {
		return jsonResponse(
			{
				ok: false,
				status: "error",
				matched: 0,
				chunks: [],
				error: error instanceof Error ? error.message : "Unknown error",
			} satisfies RagRetrieveResponse,
			502,
			origin,
		);
	}
}

app.get("/", () => handleRagHomeRequest());

app.all("/ask", async (c) => handleAskRequest(c.req.raw, c.env));
app.all("/assistant-retrieve", async (c) =>
	handleRetrieveRequest(c.req.raw, c.env),
);

app.notFound((c) => {
	const origin = getRequestOrigin(c.req.raw, new URL(c.req.raw.url));
	return jsonResponse({ error: "Not found" }, 404, origin);
});

export default app;
