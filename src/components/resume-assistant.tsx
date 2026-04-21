"use client";

import { Button, Chip, Drawer, ScrollShadow, Tooltip } from "@heroui/react";
import clsx from "clsx";
import NextLink from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	HiMiniSparkles,
	HiOutlineSparkles,
	HiPaperAirplane,
} from "react-icons/hi2";
import { siteConfig, withBasePath } from "@/config/site";
import {
	buildAssistantContextSnippets,
	buildClosestMatchFallbackAnswer,
	buildResumeSnippets,
	buildRetrievalQuery,
	checkQuestionGuardrails,
	DEFAULT_CHAT_MODEL,
	DEFAULT_EMBEDDING_MODEL,
	EMBEDDINGS_CACHE_TTL_MS,
	fetchAssistantResponse,
	fetchEmbeddings,
	type GuardrailResult,
	generateLocalResumeAnswer,
	getAssistantWorkerUrl,
	getEmbeddingsCacheKey,
	hashResumePayload,
	MISSING_INFORMATION_MESSAGE,
	type ResumePayload,
	type ResumeSnippet,
	type RetrievalResult,
	rankSnippetEntriesByEmbeddings,
	rankSnippetEntriesByKeywords,
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

type EmbeddingStatus = "idle" | "loading" | "ready" | "fallback";

type EmbeddingsCachePayload = {
	createdAt: number;
	embeddings: number[][];
};

const CONVERSATION_STORAGE_KEY = "portfolio-assistant-conversation";
const IS_LOCAL_DEVELOPMENT = process.env.NODE_ENV === "development";

type AssistantDebugState = {
	retrievalResult: RetrievalResult | null;
	usedClosestMatchFallback: boolean;
	fallbackReason: string | null;
	lastProvider: string | null;
};

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
	const [resumeHash, setResumeHash] = useState("");
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
	const [embeddingStatus, setEmbeddingStatus] =
		useState<EmbeddingStatus>("idle");
	const [snippetEmbeddings, setSnippetEmbeddings] = useState<number[][]>([]);
	const [statusMessage, setStatusMessage] = useState("");
	const [debugState, setDebugState] = useState<AssistantDebugState>({
		retrievalResult: null,
		usedClosestMatchFallback: false,
		fallbackReason: null,
		lastProvider: null,
	});
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

	useEffect(() => {
		void (async () => {
			try {
				const response = await fetch(withBasePath("/api/resume.json"));

				if (!response.ok) {
					throw new Error(`Failed to fetch resume data: ${response.status}`);
				}

				const payload = (await response.json()) as ResumePayload;
				const nextSnippets = buildResumeSnippets(payload);
				const nextHash = await hashResumePayload(payload);

				setResume(payload);
				setSnippets(nextSnippets);
				setResumeHash(nextHash);
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

	useEffect(() => {
		if (!workerUrl || !resumeHash || !snippets.length) {
			setEmbeddingStatus("idle");
			return;
		}

		let isCancelled = false;

		void (async () => {
			setEmbeddingStatus("loading");

			try {
				const cachedValue =
					typeof window !== "undefined"
						? window.localStorage.getItem(
								getEmbeddingsCacheKey(resumeHash, DEFAULT_EMBEDDING_MODEL),
							)
						: null;

				if (cachedValue) {
					const parsed = JSON.parse(cachedValue) as
						| number[][]
						| EmbeddingsCachePayload;
					const parsedEmbeddings = Array.isArray(parsed)
						? parsed
						: parsed.embeddings;
					const cacheAge = Array.isArray(parsed)
						? Number.POSITIVE_INFINITY
						: Date.now() - parsed.createdAt;
					const cacheIsFresh = cacheAge <= EMBEDDINGS_CACHE_TTL_MS;

					if (
						cacheIsFresh &&
						Array.isArray(parsedEmbeddings) &&
						parsedEmbeddings.length === snippets.length
					) {
						if (!isCancelled) {
							setSnippetEmbeddings(parsedEmbeddings);
							setEmbeddingStatus("ready");
						}

						return;
					}
				}

				const embeddings = await fetchEmbeddings(
					workerUrl,
					DEFAULT_EMBEDDING_MODEL,
					snippets.map((snippet) => `${snippet.title}\n${snippet.text}`),
				);

				if (isCancelled) {
					return;
				}

				setSnippetEmbeddings(embeddings);
				setEmbeddingStatus("ready");
				setStatusMessage("Embeddings cached and ready.");

				if (typeof window !== "undefined") {
					window.localStorage.setItem(
						getEmbeddingsCacheKey(resumeHash, DEFAULT_EMBEDDING_MODEL),
						JSON.stringify({
							createdAt: Date.now(),
							embeddings,
						} satisfies EmbeddingsCachePayload),
					);
				}
			} catch {
				if (!isCancelled) {
					setEmbeddingStatus("fallback");
					setSnippetEmbeddings([]);
					setStatusMessage(
						"Embeddings are unavailable, so retrieval is using keyword matching instead.",
					);
				}
			}
		})();

		return () => {
			isCancelled = true;
		};
	}, [resumeHash, snippets, workerUrl]);

	const addAssistantMessage = (
		content: string,
		options?: Partial<Pick<ChatMessage, "status" | "citations">>,
	) => {
		setMessages((currentMessages) => [
			...currentMessages,
			createMessage("assistant", content, options),
		]);
	};

	const resolveCitations = (citationIds: string[]) =>
		snippets.filter((snippet) => citationIds.includes(snippet.id));

	const getCitationHref = (citation: ResumeSnippet) => {
		if (!citation.url) {
			return null;
		}

		try {
			const parsedUrl = new URL(citation.url);
			return withBasePath(
				`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
			);
		} catch {
			return citation.url.startsWith("/")
				? withBasePath(citation.url)
				: citation.url;
		}
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

	const getRelevantSnippets = async (
		question: string,
		recentMessages: Array<{
			role: "user" | "assistant";
			content: string;
		}>,
	): Promise<RetrievalResult> => {
		const retrievalQuery = buildRetrievalQuery({
			question,
			recentMessages,
		});

		if (
			embeddingStatus === "ready" &&
			snippetEmbeddings.length === snippets.length
		) {
			const [questionEmbedding] = await fetchEmbeddings(
				workerUrl,
				DEFAULT_EMBEDDING_MODEL,
				retrievalQuery,
			);

			return {
				query: retrievalQuery,
				mode: "embeddings",
				entries: rankSnippetEntriesByEmbeddings(
					retrievalQuery,
					questionEmbedding,
					snippets,
					snippetEmbeddings,
				),
			};
		}

		return {
			query: retrievalQuery,
			mode: "keywords",
			entries: rankSnippetEntriesByKeywords(retrievalQuery, snippets),
		};
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

		const localResponse = generateLocalResumeAnswer(
			trimmedQuestion,
			resume,
			snippets,
		);

		if (localResponse) {
			addAssistantMessage(localResponse.answer, {
				status: localResponse.status,
				citations: resolveCitations(localResponse.citations),
			});
			return;
		}

		if (!workerUrl) {
			addAssistantMessage(MISSING_INFORMATION_MESSAGE, {
				status: "missing",
			});
			return;
		}

		setIsSending(true);
		setStatusMessage("");
		updateDebugState({
			retrievalResult: null,
			usedClosestMatchFallback: false,
			fallbackReason: null,
			lastProvider: null,
		});

		try {
			const recentMessages = getRecentConversationMessages([
				...messages,
				userMessage,
			]);
			const retrievalResult = await getRelevantSnippets(
				trimmedQuestion,
				recentMessages,
			);
			updateDebugState({
				retrievalResult,
				lastProvider: null,
			});
			const relevantSnippets = buildAssistantContextSnippets({
				question: trimmedQuestion,
				result: retrievalResult,
				allSnippets: snippets,
			});

			if (!relevantSnippets.length) {
				addAssistantMessage(MISSING_INFORMATION_MESSAGE, {
					status: "missing",
				});
				return;
			}

			const assistantResponse = await fetchAssistantResponse({
				workerUrl,
				model: DEFAULT_CHAT_MODEL,
				question: trimmedQuestion,
				recentMessages,
				snippets: relevantSnippets,
			});
			updateDebugState({
				lastProvider: assistantResponse.provider || null,
			});
			const responseCitationIds = new Set<string>(assistantResponse.citations);

			addAssistantMessage(assistantResponse.answer, {
				status: assistantResponse.status,
				citations: relevantSnippets.filter((snippet) =>
					responseCitationIds.has(snippet.id),
				),
			});
		} catch {
			const recentMessages = getRecentConversationMessages([
				...messages,
				userMessage,
			]);

			try {
				const retrievalResult = await getRelevantSnippets(
					trimmedQuestion,
					recentMessages,
				);
				updateDebugState({
					retrievalResult,
				});
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
						fallbackReason: "model_request_failed_with_strong_retrieval_match",
						lastProvider: null,
					});
					addAssistantMessage(closestMatchFallback.answer, {
						status: closestMatchFallback.status,
						citations: resolveCitations(closestMatchFallback.citations),
					});
					return;
				}
			} catch {
				// fall through to the standard missing response
			}

			addAssistantMessage(MISSING_INFORMATION_MESSAGE, {
				status: "missing",
			});
			updateDebugState({
				usedClosestMatchFallback: false,
				fallbackReason: "no_safe_closest_match_fallback",
				lastProvider: null,
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
									<p className="break-words">{message.content}</p>
									{message.citations?.length ? (
										<div className="mt-3 flex max-w-full flex-wrap gap-2 overflow-hidden">
											{message.citations.map((citation) => {
												const href = getCitationHref(citation);

												return href ? (
													<NextLink href={href} key={citation.id}>
														<Tooltip delay={0}>
															<Chip
																className="max-w-full border border-primary/15 bg-primary/8 text-primary transition-colors hover:bg-primary/12 cursor-pointer"
																size="sm"
																variant="secondary"
															>
																<Chip.Label className="max-w-full truncate">
																	{citation.title}
																</Chip.Label>
															</Chip>
															<Tooltip.Content showArrow>
																<Tooltip.Arrow />
																<p>Click to view more about {citation.title}</p>
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
								<div className="flex items-center gap-2.5 rounded-[24px] border border-default-200/70 bg-content1/80 px-4 py-3 text-sm text-default-600 shadow-sm shadow-primary/5 dark:bg-[#11233b]/75">
									<span className="flex items-end gap-0.5 text-primary">
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
									<span>Thinking...</span>
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
									<div className="mt-2 space-y-2">
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
												isDisabled={isSending || !resume}
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
