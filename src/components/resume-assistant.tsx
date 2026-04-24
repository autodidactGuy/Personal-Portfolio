"use client";

import { Button, Chip, Drawer, ScrollShadow, Tooltip } from "@heroui/react";
import clsx from "clsx";
import NextLink from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
	HiMiniSparkles,
	HiOutlineArrowTopRightOnSquare,
	HiOutlineSparkles,
	HiPaperAirplane,
} from "react-icons/hi2";
import { siteConfig, withBasePath } from "@/config/site";
import {
	type AssistantDebugProvider,
	buildAssistantContextSnippets,
	buildClosestMatchFallbackAnswer,
	buildInitialAssistantContextSnippets,
	buildResumeSnippets,
	buildRetrievalQuery,
	checkQuestionGuardrails,
	fetchAssistantRawProviderResponse,
	fetchAssistantResponse,
	fetchSemanticRelevantSnippets,
	findAssistantInlineLinkMatches,
	type GuardrailResult,
	generateLocalResumeAnswer,
	generateLocalSmallTalkAnswer,
	getAssistantWorkerUrl,
	getSnippetHref,
	MISSING_INFORMATION_MESSAGE,
	mergeRetrievalResults,
	mergeUniqueSnippets,
	type ResumePayload,
	type ResumeSnippet,
	type RetrievalResult,
	rankSnippetEntriesByKeywords,
	resolveResumeSnippetCitations,
	shouldIncludeRecentConversationContext,
	shouldUseClosestMatchFallback,
	UNRELATED_QUESTION_MESSAGE,
} from "@/lib/resume-assistant";

type ChatMessage = {
	id: string;
	role: "assistant" | "user";
	content: string;
	status?: "answered" | "missing" | "rejected" | "system";
	citations?: ResumeSnippet[];
};

const CONVERSATION_STORAGE_KEY = "portfolio-assistant-conversation";
const IS_LOCAL_DEVELOPMENT = process.env.NODE_ENV === "development";

type AssistantDebugState = {
	retrievalResult: RetrievalResult | null;
	keywordEntries: RetrievalResult["entries"] | null;
	semanticEntries: RetrievalResult["entries"] | null;
	semanticMatched: number | null;
	initialSnippetIds: string[] | null;
	finalSnippetIds: string[] | null;
	recentContextIncluded: boolean | null;
	usedClosestMatchFallback: boolean;
	fallbackReason: string | null;
	lastProvider: string | null;
	providerContext: Array<{
		provider: string;
		status: number;
		error: string | null;
	}> | null;
};

type AssistantRawDebugResult = {
	status: number;
	provider: string | null;
	content: string;
};

const THINKING_STATES = [
	{
		label: "Thinking...",
		detail: "Checking the strongest snippets and recent context.",
	},
	{
		label: "Grounding the answer...",
		detail: "Pulling together the most relevant published details.",
	},
	{
		label: "Connecting the signals...",
		detail: "Comparing retrieval results before responding.",
	},
	{
		label: "Reviewing the best match...",
		detail: "Scanning the closest matching details.",
	},
	{
		label: "Searching the context...",
		detail: "Locating the most relevant resume snippets.",
	},
	{
		label: "Assembling the response...",
		detail: "Putting together a clear and accurate answer.",
	},
	{
		label: "Cross-referencing details...",
		detail: "Verifying consistency across multiple sources.",
	},
	{
		label: "Reasoning through this...",
		detail: "Applying context to form a thoughtful reply.",
	},
];

function renderMessageContent(
	content: string,
	citations: ResumeSnippet[] | undefined,
	resume: ResumePayload | null,
) {
	const normalizedContent = normalizeAssistantDisplayContent(content);
	const lines = normalizedContent.split("\n");
	const blocks: Array<
		| { type: "paragraph"; lines: string[] }
		| { type: "list"; items: string[]; ordered: boolean }
	> = [];
	let paragraphBuffer: string[] = [];
	let listBuffer: string[] = [];
	let listOrdered = false;
	let pendingListBreak = false;

	const flushParagraphBuffer = () => {
		if (!paragraphBuffer.length) {
			return;
		}

		blocks.push({
			type: "paragraph",
			lines: paragraphBuffer,
		});
		paragraphBuffer = [];
	};

	const flushListBuffer = () => {
		if (!listBuffer.length) {
			return;
		}

		blocks.push({
			type: "list",
			items: listBuffer,
			ordered: listOrdered,
		});
		listBuffer = [];
		listOrdered = false;
		pendingListBreak = false;
	};

	const appendToCurrentListItem = (line: string) => {
		if (!listBuffer.length) {
			return false;
		}

		const lastIndex = listBuffer.length - 1;
		listBuffer[lastIndex] = `${listBuffer[lastIndex]}\n${line}`.trim();
		return true;
	};

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line || isAssistantSeparatorLine(line)) {
			if (listBuffer.length) {
				pendingListBreak = true;
			} else {
				flushParagraphBuffer();
				flushListBuffer();
			}
			continue;
		}

		if (/^-\s+/.test(line)) {
			flushParagraphBuffer();
			if (listBuffer.length && listOrdered) {
				flushListBuffer();
			}
			listOrdered = false;
			pendingListBreak = false;
			listBuffer.push(line.replace(/^-\s+/, "").trim());
			continue;
		}

		if (/^\d+\.\s+/.test(line)) {
			flushParagraphBuffer();
			if (listBuffer.length && !listOrdered) {
				flushListBuffer();
			}
			listOrdered = true;
			pendingListBreak = false;
			listBuffer.push(line.replace(/^\d+\.\s+/, "").trim());
			continue;
		}

		if (appendToCurrentListItem(line)) {
			pendingListBreak = false;
			continue;
		}

		if (pendingListBreak) {
			flushListBuffer();
		}

		flushListBuffer();
		paragraphBuffer.push(line);
	}

	flushParagraphBuffer();
	flushListBuffer();

	if (!blocks.length) {
		return <p className="break-words">{normalizedContent}</p>;
	}

	return (
		<div className="space-y-3">
			{blocks.map((block) => {
				const blockContent =
					block.type === "list"
						? `${block.ordered ? "ordered" : "unordered"}:${block.items.join("|")}`
						: block.lines.join("|");
				const blockKey = `${block.type}:${blockContent}`;

				return block.type === "list" ? (
					block.ordered ? (
						<ol className="list-decimal space-y-2 pl-5" key={blockKey}>
							{block.items.map((item) => (
								<li
									className="break-words whitespace-break-spaces"
									key={`${blockKey}:${item}`}
								>
									{renderInlineMessageContent(item, citations, resume)}
								</li>
							))}
						</ol>
					) : (
						<ul className="list-disc space-y-2 pl-5" key={blockKey}>
							{block.items.map((item) => (
								<li
									className="break-words whitespace-break-spaces"
									key={`${blockKey}:${item}`}
								>
									{renderInlineMessageContent(item, citations, resume)}
								</li>
							))}
						</ul>
					)
				) : (
					<p className="break-words whitespace-break-spaces" key={blockKey}>
						{renderInlineMessageContent(
							block.lines.join("\n"),
							citations,
							resume,
						)}
					</p>
				);
			})}
		</div>
	);
}

function normalizeAssistantDisplayContent(content: string) {
	return content
		.replace(/\r\n/g, "\n")
		.replace(/\\n/g, "\n")
		.replace(/\/n/g, "\n")
		.replace(/:\s*(\d+\.\s*)/g, ":\n$1")
		.replace(/([A-Za-z),])(\d+\.\s*)/g, "$1\n$2")
		.replace(
			/([A-Za-z.)])(?=(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b)/g,
			"$1\n",
		)
		.replace(/【[^】]+】/g, "")
		.replace(
			/\[(summary|about|skills|links|contact|hero|focus|stats|experience:[^\]]+|education:[^\]]+|project:[^\]]+|article:[^\]]+|case-study:[^\]]+|recommendation:[^\]]+)\]/gi,
			"",
		)
		.replace(/([^\n])\n?(---+|___+|\*\*\*+)\n?/g, "$1\n\n")
		.replace(/(\*\*[^*\n]+\*\*)\s+[—-]\s+(?=\*\*|[A-Z0-9])/g, "$1\n- ")
		.replace(/\s+[—-]\s+(?=\*\*[^*\n]+\*\*)/g, "\n- ")
		.replace(/([^\n])\s+(\d+\.\s+\*\*[^*\n]+\*\*)/g, "$1\n$2")
		.replace(/([^\n])\s+(\d+\.\s+[A-Z][^\n]{3,})/g, "$1\n$2")
		.replace(/\*{2}\s*\n\s*/g, "**")
		.replace(/\s*\n\s*\*{2}/g, "**")
		.replace(/\*{1}\s*\n\s*/g, "*")
		.replace(/\s*\n\s*\*{1}/g, "*")
		.replace(/[ \t]{2,}/g, " ")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function isAssistantSeparatorLine(line: string) {
	return /^([-_*])\1{2,}$/.test(line.trim());
}

function renderBoldMarkdown(text: string) {
	const parts: ReactNode[] = [];
	const pattern = /(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)/g;
	let lastIndex = 0;
	let match = pattern.exec(text);

	while (match) {
		if (match.index > lastIndex) {
			parts.push(
				stripResidualAssistantMarkers(text.slice(lastIndex, match.index)),
			);
		}

		if (match[2]) {
			parts.push(<strong key={`bold-${match.index}`}>{match[2]}</strong>);
		} else if (match[4]) {
			parts.push(<em key={`italic-${match.index}`}>{match[4]}</em>);
		}

		lastIndex = match.index + match[0].length;
		match = pattern.exec(text);
	}

	if (lastIndex < text.length) {
		parts.push(stripResidualAssistantMarkers(text.slice(lastIndex)));
	}

	return parts;
}

function stripResidualAssistantMarkers(text: string) {
	return text
		.replace(/【[^】]+】/g, "")
		.replace(
			/\[(summary|about|skills|links|contact|hero|focus|stats|experience:[^\]]+|education:[^\]]+|project:[^\]]+|article:[^\]]+|case-study:[^\]]+|recommendation:[^\]]+)\]/gi,
			"",
		)
		.replace(/\*\*/g, "")
		.replace(/\*/g, "");
}

function renderInlineMessageContent(
	content: string,
	citations: ResumeSnippet[] | undefined,
	resume: ResumePayload | null,
) {
	const matches = findAssistantInlineLinkMatches({
		content,
		citations,
		resume,
	});

	if (!matches.length) {
		return renderBoldMarkdown(content);
	}

	const parts: ReactNode[] = [];
	let cursor = 0;

	for (const match of matches) {
		if (cursor < match.start) {
			parts.push(...renderBoldMarkdown(content.slice(cursor, match.start)));
		}

		parts.push(
			<NextLink
				className="inline break-words text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
				href={match.href}
				key={`${match.start}-${match.end}-${match.href}`}
				rel="noreferrer"
				target="_blank"
			>
				<span>{match.text}</span>
				<HiOutlineArrowTopRightOnSquare
					className="ml-1 inline-block align-[-1px]"
					size={12}
				/>
			</NextLink>,
		);

		cursor = match.end;
	}

	if (cursor < content.length) {
		parts.push(...renderBoldMarkdown(content.slice(cursor)));
	}

	return parts;
}

function buildQuestionSuggestions(resume: ResumePayload | null) {
	if (!resume) {
		return [
			"What payment work has he done?",
			"How does he handle guardrails?",
			"What platform work has he led?",
			"How does he approach architecture?",
		];
	}

	const currentExperience = resume.experience?.find(
		(item) => item.to.toLowerCase() === "present",
	);

	return [
		"What payment work has he done?",
		"How does he handle guardrails?",
		currentExperience?.company
			? `What did he do at ${currentExperience.company.split(" ")[0]}?`
			: "What platform work has he led?",
		"How does he approach architecture?",
	];
}

function buildWelcomeMessage(personName: string): ChatMessage {
	return {
		id: "assistant-welcome",
		role: "assistant",
		status: "system",
		content: `Ask about ${personName}'s experience, systems work, projects, education, or technical strengths. I only answer from the published information on this site.`,
	};
}

function createMessage(
	role: ChatMessage["role"],
	content: string,
	options?: Partial<Pick<ChatMessage, "status" | "citations">>,
): ChatMessage {
	return {
		id:
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
		role,
		content,
		...options,
	};
}

export function ResumeAssistant() {
	const lastMessageRef = useRef<HTMLDivElement | null>(null);
	const scrollPanelRef = useRef<HTMLDivElement | null>(null);

	const [resume, setResume] = useState<ResumePayload | null>(null);
	const [snippets, setSnippets] = useState<ResumeSnippet[]>([]);
	const [resumeError, setResumeError] = useState("");
	const [messages, setMessages] = useState<ChatMessage[]>(() => {
		if (typeof window === "undefined") {
			return [buildWelcomeMessage("the person in this resume")];
		}

		try {
			const stored = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);

			if (stored) {
				const parsed = JSON.parse(stored) as ChatMessage[];

				if (Array.isArray(parsed) && parsed.length > 0) {
					return parsed;
				}
			}
		} catch {
			// ignore parse/storage errors
		}

		return [buildWelcomeMessage("the person in this resume")];
	});
	const [draft, setDraft] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [statusMessage, setStatusMessage] = useState("");
	const [debugState, setDebugState] = useState<AssistantDebugState>({
		retrievalResult: null,
		keywordEntries: null,
		semanticEntries: null,
		semanticMatched: null,
		initialSnippetIds: null,
		finalSnippetIds: null,
		recentContextIncluded: null,
		usedClosestMatchFallback: false,
		fallbackReason: null,
		lastProvider: null,
		providerContext: null,
	});
	const [rawDebugProvider, setRawDebugProvider] =
		useState<AssistantDebugProvider>("github-models");
	const [rawDebugQuestion, setRawDebugQuestion] = useState("");
	const [rawDebugModel, setRawDebugModel] = useState("");
	const [rawDebugTemperature, setRawDebugTemperature] = useState("0");
	const [rawDebugMaxTokens, setRawDebugMaxTokens] = useState("500");
	const [rawDebugStructuredOutput, setRawDebugStructuredOutput] =
		useState(true);
	const [rawDebugLoading, setRawDebugLoading] = useState(false);
	const [rawDebugResult, setRawDebugResult] =
		useState<AssistantRawDebugResult | null>(null);
	const [rawDebugError, setRawDebugError] = useState("");
	const workerUrl = getAssistantWorkerUrl();

	const personName = resume?.name || "the person in this resume";
	const questionSuggestions = buildQuestionSuggestions(resume);
	const hasUserMessages = useMemo(
		() => messages.some((message) => message.role === "user"),
		[messages],
	);

	const hasConversationContext = useMemo(
		() =>
			messages.some(
				(message) =>
					message.role === "assistant" &&
					message.status !== "system" &&
					message.content !== UNRELATED_QUESTION_MESSAGE,
			),
		[messages],
	);
	const latestUserQuestion = useMemo(
		() =>
			Array.from(messages)
				.reverse()
				.find((message) => message.role === "user")?.content || "",
		[messages],
	);
	const thinkingState = useMemo(() => {
		// Subtract 1 because the user message is already appended when isSending
		// is true, so index 0 ("Thinking...") correctly shows on the first send.
		const userMessageCount = Math.max(
			0,
			messages.filter((message) => message.role === "user").length - 1,
		);

		return THINKING_STATES[userMessageCount % THINKING_STATES.length];
	}, [messages]);

	useEffect(() => {
		void (async () => {
			try {
				const response = await fetch(withBasePath("/api/resume.json"));

				if (!response.ok) {
					throw new Error(`Failed to fetch resume data: ${response.status}`);
				}

				const payload = (await response.json()) as ResumePayload;
				const nextSnippets = buildResumeSnippets(payload);

				setResume(payload);
				setSnippets(nextSnippets);
				setMessages((currentMessages) => {
					const welcomeName = payload.name || "the person in this resume";

					if (currentMessages[0]?.id === "assistant-welcome") {
						return [
							buildWelcomeMessage(welcomeName),
							...currentMessages.slice(1),
						];
					}

					if (currentMessages.length === 0) {
						return [buildWelcomeMessage(welcomeName)];
					}

					return currentMessages;
				});
			} catch {
				setResumeError(
					"Resume data could not be loaded right now. Please try again in a moment.",
				);
			}
		})();
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const latestMessageId = messages[messages.length - 1]?.id;

		if (!latestMessageId && !isSending) {
			return;
		}

		const frame = window.requestAnimationFrame(() => {
			lastMessageRef.current?.scrollIntoView({
				behavior: latestMessageId === "assistant-welcome" ? "auto" : "smooth",
				block: "end",
			});

			const container = scrollPanelRef.current;
			if (container) {
				container.scrollTo({
					top: container.scrollHeight,
					behavior: latestMessageId === "assistant-welcome" ? "auto" : "smooth",
				});
			}
		});

		return () => window.cancelAnimationFrame(frame);
	}, [messages, isSending]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		try {
			window.localStorage.setItem(
				CONVERSATION_STORAGE_KEY,
				JSON.stringify(messages),
			);
		} catch {
			// ignore storage errors (e.g. private browsing quota exceeded)
		}
	}, [messages]);

	const addAssistantMessage = (
		content: string,
		options?: Partial<Pick<ChatMessage, "status" | "citations">>,
	) => {
		setMessages((currentMessages) => [
			...currentMessages,
			createMessage("assistant", content, options),
		]);
	};

	const getRecentConversationMessages = (
		nextMessages: ChatMessage[],
		limit = 6,
	) =>
		nextMessages
			.filter((message) => message.status !== "system")
			.slice(-limit)
			.map((message) => ({
				role: message.role,
				content: message.content,
			}));

	const updateDebugState = (nextState: Partial<AssistantDebugState>) => {
		if (!IS_LOCAL_DEVELOPMENT) {
			return;
		}

		setDebugState((currentState) => ({
			...currentState,
			...nextState,
		}));
	};

	const runRawProviderDebug = async () => {
		if (!IS_LOCAL_DEVELOPMENT || !workerUrl || !resume) {
			return;
		}

		const debugQuestion = (
			rawDebugQuestion.trim() ||
			draft.trim() ||
			latestUserQuestion.trim()
		).trim();

		if (!debugQuestion) {
			setRawDebugError("Add a question, or reuse the current draft.");
			setRawDebugResult(null);
			return;
		}

		setRawDebugLoading(true);
		setRawDebugError("");
		setRawDebugResult(null);

		try {
			const recentMessages = getRecentConversationMessages(messages);
			const { semanticSnippets } = await getHybridRelevantSnippets(
				debugQuestion,
				recentMessages,
			);
			const initialSnippets = buildInitialAssistantContextSnippets(
				debugQuestion,
				mergeUniqueSnippets([...snippets, ...semanticSnippets]),
			);
			const response = await fetchAssistantRawProviderResponse({
				workerUrl,
				provider: rawDebugProvider,
				question: debugQuestion,
				recentMessages,
				snippets: initialSnippets,
				model: rawDebugModel.trim() || undefined,
				temperature: Number(rawDebugTemperature) || 0,
				maxTokens: Number(rawDebugMaxTokens) || 500,
				structuredOutput: rawDebugStructuredOutput,
			});

			setRawDebugResult({
				status: response.status,
				provider: response.provider,
				content:
					typeof response.payload === "string"
						? response.payload
						: response.payload
							? JSON.stringify(response.payload, null, 2)
							: response.rawText || "",
			});
		} catch (error) {
			setRawDebugError(
				error instanceof Error ? error.message : "Raw provider request failed.",
			);
		} finally {
			setRawDebugLoading(false);
		}
	};

	const getHybridRelevantSnippets = async (
		question: string,
		recentMessages: Array<{
			role: "user" | "assistant";
			content: string;
		}>,
	) => {
		const retrievalQuery = buildRetrievalQuery({
			question,
			recentMessages,
		});
		const keywordResult = {
			query: retrievalQuery,
			mode: "keywords" as const,
			entries: rankSnippetEntriesByKeywords(retrievalQuery, snippets),
		};

		if (!workerUrl) {
			return {
				retrievalResult: keywordResult satisfies RetrievalResult,
				keywordEntries: keywordResult.entries,
				semanticEntries: [] as RetrievalResult["entries"],
				semanticMatched: 0,
				semanticSnippets: [] as ResumeSnippet[],
			};
		}

		try {
			const semanticResult = await fetchSemanticRelevantSnippets({
				workerUrl,
				question,
				query: retrievalQuery,
			});

			if (!semanticResult.entries.length) {
				return {
					retrievalResult: keywordResult satisfies RetrievalResult,
					keywordEntries: keywordResult.entries,
					semanticEntries: [] as RetrievalResult["entries"],
					semanticMatched: semanticResult.matched,
					semanticSnippets: [] as ResumeSnippet[],
				};
			}

			return {
				retrievalResult: mergeRetrievalResults({
					query: retrievalQuery,
					keywordEntries: keywordResult.entries,
					semanticEntries: semanticResult.entries,
				}),
				keywordEntries: keywordResult.entries,
				semanticEntries: semanticResult.entries,
				semanticMatched: semanticResult.matched,
				semanticSnippets: semanticResult.snippets,
			};
		} catch {
			setStatusMessage(
				"Semantic retrieval is unavailable right now, so retrieval is using keyword matching.",
			);
			return {
				retrievalResult: keywordResult satisfies RetrievalResult,
				keywordEntries: keywordResult.entries,
				semanticEntries: [] as RetrievalResult["entries"],
				semanticMatched: 0,
				semanticSnippets: [] as ResumeSnippet[],
			};
		}
	};

	const canSubmitDraft = Boolean(draft.trim()) && !isSending && Boolean(resume);

	const addAssistantResponseMessage = (
		response: Awaited<ReturnType<typeof fetchAssistantResponse>>,
		availableSnippets: ResumeSnippet[],
	) => {
		const responseCitationIds = new Set<string>(response.citations);

		addAssistantMessage(response.answer, {
			status: response.status,
			citations: resolveResumeSnippetCitations(
				Array.from(responseCitationIds),
				availableSnippets,
			),
		});
	};

	const submitQuestion = async (question: string) => {
		const trimmedQuestion = question.trim();

		if (!trimmedQuestion || isSending || !resume) {
			return;
		}

		const guardrailResult: GuardrailResult = checkQuestionGuardrails(
			trimmedQuestion,
			snippets,
			hasConversationContext,
		);

		if (!guardrailResult.allowed) {
			setDraft("");
			addAssistantMessage(guardrailResult.message, {
				status:
					guardrailResult.message === UNRELATED_QUESTION_MESSAGE
						? "rejected"
						: "system",
			});
			return;
		}

		const userMessage = createMessage("user", trimmedQuestion);
		setMessages((currentMessages) => [...currentMessages, userMessage]);
		setDraft("");

		const smallTalkResponse = generateLocalSmallTalkAnswer(
			trimmedQuestion,
			resume,
		);

		if (smallTalkResponse) {
			addAssistantMessage(smallTalkResponse.answer, {
				status: smallTalkResponse.status,
				citations: resolveResumeSnippetCitations(
					smallTalkResponse.citations,
					snippets,
				),
			});
			return;
		}

		if (!workerUrl) {
			const localResponse = generateLocalResumeAnswer(
				trimmedQuestion,
				resume,
				snippets,
			);

			if (localResponse) {
				addAssistantMessage(localResponse.answer, {
					status: localResponse.status,
					citations: resolveResumeSnippetCitations(
						localResponse.citations,
						snippets,
					),
				});
				return;
			}

			addAssistantMessage(MISSING_INFORMATION_MESSAGE, { status: "missing" });
			return;
		}

		setIsSending(true);
		setStatusMessage("");
		updateDebugState({
			retrievalResult: null,
			keywordEntries: null,
			semanticEntries: null,
			semanticMatched: null,
			initialSnippetIds: null,
			finalSnippetIds: null,
			recentContextIncluded: null,
			usedClosestMatchFallback: false,
			fallbackReason: null,
			lastProvider: null,
			providerContext: null,
		});

		const recentMessages = shouldIncludeRecentConversationContext(
			trimmedQuestion,
		)
			? getRecentConversationMessages([...messages, userMessage])
			: [];
		const recentContextIncluded = recentMessages.length > 0;

		try {
			const {
				retrievalResult: hybridRetrievalResult,
				keywordEntries,
				semanticEntries,
				semanticMatched,
				semanticSnippets,
			} = await getHybridRelevantSnippets(trimmedQuestion, recentMessages);
			const snippetPool = mergeUniqueSnippets([
				...snippets,
				...semanticSnippets,
			]);
			const initialSnippets = buildInitialAssistantContextSnippets(
				trimmedQuestion,
				snippetPool,
			);
			updateDebugState({
				keywordEntries,
				semanticEntries,
				semanticMatched,
				initialSnippetIds: initialSnippets.map((snippet) => snippet.id),
				recentContextIncluded,
			});

			if (initialSnippets.length) {
				const initialAssistantResponse = await fetchAssistantResponse({
					workerUrl,
					question: trimmedQuestion,
					recentMessages,
					snippets: initialSnippets,
				});
				updateDebugState({
					lastProvider: initialAssistantResponse.provider || null,
					providerContext: initialAssistantResponse.providerContext || null,
				});

				if (initialAssistantResponse.status !== "missing") {
					addAssistantResponseMessage(
						initialAssistantResponse,
						initialSnippets,
					);
					return;
				}
			}

			const retrievalResult: RetrievalResult = hybridRetrievalResult;
			updateDebugState({
				retrievalResult,
				keywordEntries,
				semanticEntries,
				semanticMatched,
				lastProvider: null,
				providerContext: null,
			});
			const relevantSnippets = buildAssistantContextSnippets({
				question: trimmedQuestion,
				result: retrievalResult,
				allSnippets: snippetPool,
			});
			updateDebugState({
				finalSnippetIds: relevantSnippets.map((snippet) => snippet.id),
			});

			if (relevantSnippets.length) {
				const assistantResponse = await fetchAssistantResponse({
					workerUrl,
					question: trimmedQuestion,
					recentMessages,
					snippets: relevantSnippets,
				});
				updateDebugState({
					lastProvider: assistantResponse.provider || null,
					providerContext: assistantResponse.providerContext || null,
				});

				if (assistantResponse.status !== "missing") {
					addAssistantResponseMessage(assistantResponse, relevantSnippets);
					return;
				}
			}

			const localResponse = generateLocalResumeAnswer(
				trimmedQuestion,
				resume,
				snippets,
			);

			if (localResponse) {
				addAssistantMessage(localResponse.answer, {
					status: localResponse.status,
					citations: resolveResumeSnippetCitations(
						localResponse.citations,
						snippets,
					),
				});
				updateDebugState({
					usedClosestMatchFallback: false,
					fallbackReason: retrievalResult
						? "llm_and_retrieval_fell_back_to_local_match"
						: "llm_fell_back_to_local_match",
				});
				return;
			}

			const closestMatchFallback = shouldUseClosestMatchFallback({
				query: retrievalResult.query,
				result: retrievalResult,
			})
				? buildClosestMatchFallbackAnswer({
						result: retrievalResult,
					})
				: null;

			if (closestMatchFallback) {
				updateDebugState({
					usedClosestMatchFallback: true,
					fallbackReason: "retrieval_fell_back_to_closest_match",
					lastProvider: null,
					providerContext: null,
				});
				addAssistantMessage(closestMatchFallback.answer, {
					status: closestMatchFallback.status,
					citations: resolveResumeSnippetCitations(
						closestMatchFallback.citations,
						snippetPool,
					),
				});
				return;
			}

			addAssistantMessage(MISSING_INFORMATION_MESSAGE, {
				status: "missing",
			});
			updateDebugState({
				usedClosestMatchFallback: false,
				fallbackReason: "no_answer_after_llm_retrieval_and_local_match",
				lastProvider: null,
				providerContext: null,
			});
		} catch {
			const localResponse = generateLocalResumeAnswer(
				trimmedQuestion,
				resume,
				snippets,
			);

			if (localResponse) {
				addAssistantMessage(localResponse.answer, {
					status: localResponse.status,
					citations: resolveResumeSnippetCitations(
						localResponse.citations,
						snippets,
					),
				});
				updateDebugState({
					usedClosestMatchFallback: false,
					fallbackReason: "request_failed_fell_back_to_local_match",
					lastProvider: null,
					providerContext: null,
				});
				return;
			}

			addAssistantMessage(MISSING_INFORMATION_MESSAGE, {
				status: "missing",
			});
			updateDebugState({
				usedClosestMatchFallback: false,
				fallbackReason: "request_failed_no_local_match",
				lastProvider: null,
				providerContext: null,
			});
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col">
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-default-200/70 bg-content1/85 shadow-sm shadow-primary/5 dark:bg-content1/75 sm:rounded-[28px]">
				<ScrollShadow
					className="min-h-0 flex-1 rounded-[inherit] px-2.5 pt-2.5 sm:px-3 sm:pt-3"
					ref={scrollPanelRef}
					visibility="none"
				>
					<div className="flex min-h-full flex-col gap-3 pb-2 sm:gap-4 sm:pb-3">
						{messages.map((message, index) => (
							<div
								className={clsx(
									"flex scroll-mb-28",
									message.role === "user" ? "justify-end" : "justify-start",
								)}
								key={message.id}
								ref={index === messages.length - 1 ? lastMessageRef : null}
							>
								<div
									className={clsx(
										"max-w-[88%] min-w-0 rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
										message.role === "user"
											? "bg-primary/95 text-white"
											: "border border-default-200/70 bg-content1/80 text-foreground dark:bg-[#11233b]/80",
									)}
								>
									{renderMessageContent(
										message.content,
										message.citations,
										resume,
									)}
									{message.citations?.length ? (
										<div className="mt-3 flex max-w-full flex-wrap gap-2 overflow-hidden">
											{message.citations.map((citation) => {
												const href = getSnippetHref(citation);

												return href ? (
													<NextLink
														href={href}
														key={citation.id}
														rel="noreferrer"
														target="_blank"
													>
														<Tooltip delay={0}>
															<Chip
																className="max-w-full cursor-pointer border border-primary/15 bg-primary/8 text-primary transition-colors hover:bg-primary/12"
																size="sm"
																variant="secondary"
															>
																<Chip.Label className="flex max-w-full items-center gap-1 truncate">
																	<span className="truncate">
																		{citation.title}
																	</span>
																	<HiOutlineArrowTopRightOnSquare
																		className="shrink-0"
																		size={12}
																	/>
																</Chip.Label>
															</Chip>
															<Tooltip.Content showArrow>
																<Tooltip.Arrow />
																<p>Open {citation.title} in a new tab</p>
															</Tooltip.Content>
														</Tooltip>
													</NextLink>
												) : (
													<Chip
														className="max-w-full border border-primary/15 bg-primary/8 text-primary"
														key={citation.id}
														size="sm"
														variant="secondary"
													>
														<Chip.Label className="max-w-full truncate">
															{citation.title}
														</Chip.Label>
													</Chip>
												);
											})}
										</div>
									) : null}
								</div>
							</div>
						))}

						{!hasUserMessages ? (
							<div className="flex justify-start">
								<div className="max-w-[92%] rounded-[22px] border border-default-200/70 bg-content1/80 px-3.5 py-3 text-foreground shadow-sm shadow-primary/5 dark:bg-[#11233b]/75">
									<p className="text-sm text-default-600">
										Try asking something from these:
									</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{questionSuggestions.map((question) => (
											<Button
												className="h-7 rounded-full border border-primary/15 bg-primary/8 px-2.5 text-[10px] font-medium text-primary shadow-none hover:bg-primary/12 sm:h-8 sm:px-3 sm:text-[11px]"
												key={question}
												onClick={() => void submitQuestion(question)}
												size="sm"
												variant="secondary"
											>
												{question}
											</Button>
										))}
									</div>
								</div>
							</div>
						) : null}

						{isSending ? (
							<div className="flex justify-start">
								<div className="flex max-w-[88%] min-w-0 items-center gap-2.5 rounded-[24px] border border-default-200/70 bg-content1/80 px-4 py-3 text-sm text-default-600 shadow-sm shadow-primary/5 dark:bg-[#11233b]/75">
									<span className="flex shrink-0 items-end gap-0.5 text-primary">
										<HiMiniSparkles className="animate-spark" size={14} />
										<HiMiniSparkles
											className="animate-spark-delay-1"
											size={11}
										/>
										<HiMiniSparkles
											className="animate-spark-delay-2"
											size={14}
										/>
									</span>
									<span className="truncate">{thinkingState.label}</span>
								</div>
							</div>
						) : null}

						<div className="sticky bottom-0 z-10 mt-auto rounded-[22px] border border-default-200/70 bg-content1/92 px-2.5 pb-2 pt-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-default-100/10 dark:bg-[#0d1b2f]/92 sm:rounded-[24px] sm:px-3 sm:pb-3 sm:pt-3">
							{resumeError || statusMessage ? (
								<div className="px-1 pb-2 text-xs text-default-500 hidden">
									{resumeError ? (
										<span className="text-danger">{resumeError}</span>
									) : (
										<span>{statusMessage}</span>
									)}
								</div>
							) : null}

							{IS_LOCAL_DEVELOPMENT ? (
								<details className="mb-3 rounded-2xl border border-primary/10 bg-primary/5 px-3 py-2 text-xs text-default-600">
									<summary className="cursor-pointer select-none font-medium text-primary">
										Assistant Debug
									</summary>
									<div className="mt-2 space-y-3">
										<p>
											Mode:{" "}
											<span className="font-mono">
												{debugState.retrievalResult?.mode || "n/a"}
											</span>
										</p>
										<p>
											Query:{" "}
											<span className="font-mono">
												{debugState.retrievalResult?.query || "n/a"}
											</span>
										</p>
										<p>
											Recent context included:{" "}
											<span className="font-mono">
												{debugState.recentContextIncluded === null
													? "n/a"
													: debugState.recentContextIncluded
														? "yes"
														: "no"}
											</span>
										</p>
										<p>
											Semantic matched:{" "}
											<span className="font-mono">
												{debugState.semanticMatched ?? "n/a"}
											</span>
										</p>
										<p>
											Closest-match fallback:{" "}
											<span className="font-mono">
												{debugState.usedClosestMatchFallback ? "yes" : "no"}
											</span>
										</p>
										<p>
											Fallback reason:{" "}
											<span className="font-mono">
												{debugState.fallbackReason || "n/a"}
											</span>
										</p>
										<p>
											Last provider:{" "}
											<span className="font-mono">
												{debugState.lastProvider || "n/a"}
											</span>
										</p>
										{debugState.providerContext?.length ? (
											<div className="space-y-1">
												<p className="font-medium text-foreground">
													Provider Trail
												</p>
												{debugState.providerContext.map((entry) => (
													<p
														className="font-mono"
														key={`${entry.provider}-${entry.status}-${entry.error || "ok"}`}
													>
														{entry.provider} | {entry.status} |{" "}
														{entry.error || "ok"}
													</p>
												))}
											</div>
										) : null}
										{debugState.retrievalResult?.entries?.length ? (
											<div className="space-y-1">
												<p className="font-medium text-foreground">
													Top Retrieval Results
												</p>
												{debugState.retrievalResult.entries.map((entry) => (
													<p className="font-mono" key={entry.snippet.id}>
														{entry.snippet.category} | {entry.score.toFixed(3)}{" "}
														| {entry.snippet.title}
													</p>
												))}
											</div>
										) : null}
										{debugState.keywordEntries?.length ? (
											<div className="space-y-1">
												<p className="font-medium text-foreground">
													Keyword Matches
												</p>
												{debugState.keywordEntries.map((entry) => (
													<p
														className="font-mono"
														key={`kw-${entry.snippet.id}`}
													>
														{entry.snippet.category} | {entry.score.toFixed(3)}{" "}
														| {entry.snippet.title}
													</p>
												))}
											</div>
										) : null}
										{debugState.semanticEntries?.length ? (
											<div className="space-y-1">
												<p className="font-medium text-foreground">
													Semantic Matches
												</p>
												{debugState.semanticEntries.map((entry) => (
													<p
														className="font-mono"
														key={`sem-${entry.snippet.id}`}
													>
														{entry.snippet.category} | {entry.score.toFixed(3)}{" "}
														| {entry.snippet.title}
													</p>
												))}
											</div>
										) : null}
										{debugState.initialSnippetIds?.length ? (
											<div className="space-y-1">
												<p className="font-medium text-foreground">
													Initial Snippet IDs
												</p>
												{debugState.initialSnippetIds.map((id) => (
													<p className="font-mono" key={`initial-${id}`}>
														{id}
													</p>
												))}
											</div>
										) : null}
										{debugState.finalSnippetIds?.length ? (
											<div className="space-y-1">
												<p className="font-medium text-foreground">
													Final Snippet IDs
												</p>
												{debugState.finalSnippetIds.map((id) => (
													<p className="font-mono" key={`final-${id}`}>
														{id}
													</p>
												))}
											</div>
										) : null}
										<div className="rounded-2xl border border-primary/10 bg-content1/70 p-3">
											<p className="font-medium text-foreground">
												Raw Provider Debug
											</p>
											<div className="mt-2 grid gap-2 sm:grid-cols-2">
												<label className="flex flex-col gap-1">
													<span>Provider</span>
													<select
														className="rounded-xl border border-default-200/80 bg-content1 px-3 py-2 text-xs text-foreground outline-none"
														onChange={(event) =>
															setRawDebugProvider(
																event.target.value as AssistantDebugProvider,
															)
														}
														value={rawDebugProvider}
													>
														<option value="github-models">GitHub Models</option>
														<option value="groq">Groq</option>
														<option value="groq_backup">Groq Backup</option>
														<option value="huggingface">Hugging Face</option>
														<option value="cloudflare">Cloudflare AI</option>
														<option value="portfolio-rag">Portfolio RAG</option>
													</select>
												</label>
												<label className="flex flex-col gap-1">
													<span>Model override</span>
													<input
														className="rounded-xl border border-default-200/80 bg-content1 px-3 py-2 text-xs text-foreground outline-none"
														onChange={(event) =>
															setRawDebugModel(event.target.value)
														}
														placeholder="optional"
														value={rawDebugModel}
													/>
												</label>
												<label className="flex flex-col gap-1 sm:col-span-2">
													<span>Question</span>
													<textarea
														className="min-h-20 rounded-xl border border-default-200/80 bg-content1 px-3 py-2 text-xs text-foreground outline-none"
														onChange={(event) =>
															setRawDebugQuestion(event.target.value)
														}
														placeholder={
															latestUserQuestion
																? "Leave empty to reuse the current draft or latest user question"
																: "Ask a raw provider debug question"
														}
														rows={3}
														value={rawDebugQuestion}
													/>
												</label>
												<label className="flex flex-col gap-1">
													<span>Temperature</span>
													<input
														className="rounded-xl border border-default-200/80 bg-content1 px-3 py-2 text-xs text-foreground outline-none"
														inputMode="decimal"
														onChange={(event) =>
															setRawDebugTemperature(event.target.value)
														}
														value={rawDebugTemperature}
													/>
												</label>
												<label className="flex flex-col gap-1">
													<span>Max tokens</span>
													<input
														className="rounded-xl border border-default-200/80 bg-content1 px-3 py-2 text-xs text-foreground outline-none"
														inputMode="numeric"
														onChange={(event) =>
															setRawDebugMaxTokens(event.target.value)
														}
														value={rawDebugMaxTokens}
													/>
												</label>
											</div>
											<label className="mt-2 flex items-center gap-2 text-xs text-foreground">
												<input
													checked={rawDebugStructuredOutput}
													onChange={(event) =>
														setRawDebugStructuredOutput(event.target.checked)
													}
													type="checkbox"
												/>
												<span>Use structured output</span>
											</label>
											<div className="mt-3 flex items-center gap-2">
												<Button
													className="rounded-full bg-primary px-3 text-white shadow-none hover:opacity-95"
													isDisabled={rawDebugLoading || !workerUrl}
													onClick={() => {
														void runRawProviderDebug();
													}}
													size="sm"
													type="button"
												>
													{rawDebugLoading ? "Running..." : "Run Raw Provider"}
												</Button>
												{rawDebugResult ? (
													<span className="font-mono text-[11px]">
														{rawDebugResult.provider || rawDebugProvider} |{" "}
														{rawDebugResult.status}
													</span>
												) : null}
											</div>
											{rawDebugError ? (
												<p className="mt-2 text-danger">{rawDebugError}</p>
											) : null}
											{rawDebugResult ? (
												<pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-default-200/80 bg-content1 p-3 font-mono text-[11px] leading-5 text-foreground whitespace-pre-wrap">
													{rawDebugResult.content || "(empty response)"}
												</pre>
											) : null}
										</div>
									</div>
								</details>
							) : null}

							<form
								className="flex flex-col gap-3"
								onSubmit={(event) => {
									event.preventDefault();
									void submitQuestion(draft);
								}}
							>
								<div className="flex flex-col gap-3">
									<textarea
										aria-label={`Ask a question about ${personName}`}
										className="min-h-28 w-full resize-y rounded-2xl border border-default-200/80 bg-content1/90 px-4 py-3 text-sm leading-6 text-foreground shadow-none outline-none transition-colors placeholder:text-default-400 dark:border-default-100/14 dark:bg-[#13233c] focus:border-primary/45"
										onChange={(event) => setDraft(event.target.value)}
										onKeyDown={(event) => {
											if (event.key !== "Enter" || event.shiftKey) {
												return;
											}

											event.preventDefault();

											if (canSubmitDraft) {
												void submitQuestion(draft);
											}
										}}
										placeholder={`Ask about ${personName}'s background, education, experience, skills, work, projects, case studies, or system thinking...`}
										rows={3}
										value={draft}
									/>
									<div className="flex flex-col gap-2.5">
										<p className="max-w-2xl text-xs leading-5 text-default-500">
											Only resume-backed answers are allowed. Unrelated or
											missing questions are declined safely.
										</p>
										<div className="flex w-full items-center gap-2 sm:justify-end">
											<Button
												className="flex-1 rounded-full border border-default-200/70 bg-content1/90 px-3.5 text-foreground shadow-none hover:bg-default-100/70 dark:bg-[#13233c]/80 sm:flex-none"
												onClick={() => {
													setDraft("");
													setStatusMessage("");
													setMessages([buildWelcomeMessage(personName)]);

													if (typeof window !== "undefined") {
														window.localStorage.removeItem(
															CONVERSATION_STORAGE_KEY,
														);
													}
												}}
												type="button"
												variant="secondary"
											>
												Reset
											</Button>
											<Button
												className="flex-1 rounded-full bg-primary px-3.5 text-white shadow-sm shadow-primary/20 hover:opacity-95 sm:flex-none"
												isDisabled={!canSubmitDraft}
												type="submit"
											>
												<span className="flex items-center justify-center gap-2">
													<HiPaperAirplane size={16} />
													Send
												</span>
											</Button>
										</div>
									</div>
								</div>
							</form>
						</div>
					</div>
				</ScrollShadow>
			</div>
		</div>
	);
}

export function FooterAssistantLauncher() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="fixed bottom-5 right-5 z-[1] sm:bottom-6 sm:right-6">
			<Drawer
				isOpen={isOpen}
				key="portfolio-assistant"
				onOpenChange={setIsOpen}
			>
				<Drawer.Trigger
					aria-label="Open portfolio assistant"
					className={clsx(
						"inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-95 sm:h-14 sm:w-14",
						isOpen ? "pointer-events-none opacity-0" : "opacity-100",
					)}
				>
					<HiMiniSparkles size={20} />
				</Drawer.Trigger>
				<Drawer.Backdrop isDismissable variant="blur">
					<Drawer.Content placement="bottom">
						<Drawer.Dialog className="mx-auto flex h-[calc(100%+6rem)] max-h-[calc(94dvh+6rem)] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] border border-default-200/70 -mb-24 pb-24 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:mb-0 sm:h-full sm:max-h-[94dvh] sm:pb-6">
							<Drawer.Header className="shrink-0 rounded-t-[inherit] border-b border-default-200/60 px-4 pb-3 pt-2 sm:px-5">
								<Drawer.Handle />
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-3">
										<span className="inline-flex rounded-2xl border border-primary/20 bg-primary/10 p-2 text-primary">
											<HiOutlineSparkles size={18} />
										</span>
										<div>
											<Drawer.Heading className="text-sm font-semibold">
												Ask about {siteConfig.name}
											</Drawer.Heading>
											<p className="text-xs text-default-500">
												Resume-grounded answers only
											</p>
										</div>
									</div>
									<Drawer.CloseTrigger
										aria-label="Close portfolio assistant"
										className="!h-12 !w-12 rounded-full border border-danger/40 bg-red-600 text-white shadow-sm shadow-danger/20 transition-colors hover:bg-red-500 [&_svg]:!size-6"
									/>
								</div>
							</Drawer.Header>
							<Drawer.Body className="min-h-0 flex-1 overflow-hidden bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 sm:px-5 sm:pb-5">
								<ResumeAssistant />
							</Drawer.Body>
						</Drawer.Dialog>
					</Drawer.Content>
				</Drawer.Backdrop>
			</Drawer>
		</div>
	);
}
