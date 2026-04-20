"use client";

import {
	Button,
	Chip,
	Drawer,
	ScrollShadow,
	Spinner,
	TextArea,
} from "@heroui/react";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	HiMiniSparkles,
	HiOutlineSparkles,
	HiPaperAirplane,
} from "react-icons/hi2";
import { siteConfig, withBasePath } from "@/config/site";
import {
	buildResumeSnippets,
	checkQuestionGuardrails,
	DEFAULT_CHAT_MODEL,
	DEFAULT_EMBEDDING_MODEL,
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
	rankSnippetsByEmbeddings,
	rankSnippetsByKeywords,
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

function buildQuestionSuggestions(resume: ResumePayload | null) {
	if (!resume) {
		return ["Payments?", "Guardrails?", "Platform?", "Architecture?"];
	}

	const currentExperience = resume.experience?.find(
		(item) => item.to.toLowerCase() === "present",
	);

	return [
		"Payments?",
		"Guardrails?",
		currentExperience?.company
			? `${currentExperience.company.split(" ")[0]} impact?`
			: "Platform?",
		"Architecture?",
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
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	const [resume, setResume] = useState<ResumePayload | null>(null);
	const [snippets, setSnippets] = useState<ResumeSnippet[]>([]);
	const [resumeHash, setResumeHash] = useState("");
	const [resumeError, setResumeError] = useState("");
	const [messages, setMessages] = useState<ChatMessage[]>([
		buildWelcomeMessage("the person in this resume"),
	]);
	const [draft, setDraft] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [embeddingStatus, setEmbeddingStatus] =
		useState<EmbeddingStatus>("idle");
	const [snippetEmbeddings, setSnippetEmbeddings] = useState<number[][]>([]);
	const [statusMessage, setStatusMessage] = useState("");
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
					if (
						currentMessages.length === 1 &&
						currentMessages[0]?.id === "assistant-welcome"
					) {
						return [
							buildWelcomeMessage(payload.name || "the person in this resume"),
						];
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
		void messages;
		void isSending;
		messagesEndRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end",
		});
	}, [messages, isSending]);

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
					const parsed = JSON.parse(cachedValue) as number[][];

					if (parsed.length === snippets.length) {
						if (!isCancelled) {
							setSnippetEmbeddings(parsed);
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
						JSON.stringify(embeddings),
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

	const getRelevantSnippets = async (question: string) => {
		if (
			embeddingStatus === "ready" &&
			snippetEmbeddings.length === snippets.length
		) {
			const [questionEmbedding] = await fetchEmbeddings(
				workerUrl,
				DEFAULT_EMBEDDING_MODEL,
				question,
			);

			return rankSnippetsByEmbeddings(
				questionEmbedding,
				snippets,
				snippetEmbeddings,
			);
		}

		return rankSnippetsByKeywords(question, snippets);
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

		try {
			const relevantSnippets = await getRelevantSnippets(trimmedQuestion);

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
				recentMessages: [...messages, userMessage]
					.filter((message) => message.status !== "system")
					.slice(-4)
					.map((message) => ({
						role: message.role,
						content: message.content,
					})),
				snippets: relevantSnippets,
			});
			const responseCitationIds = new Set<string>(assistantResponse.citations);

			addAssistantMessage(assistantResponse.answer, {
				status: assistantResponse.status,
				citations: relevantSnippets.filter((snippet) =>
					responseCitationIds.has(snippet.id),
				),
			});
		} catch {
			addAssistantMessage(MISSING_INFORMATION_MESSAGE, {
				status: "missing",
			});
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col gap-3 sm:gap-4">
			<div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[24px] border border-default-200/70 bg-content1/90 p-2.5 shadow-sm dark:bg-content1/80 sm:rounded-[28px] sm:gap-4 sm:p-3">
				<ScrollShadow className="flex min-h-[24rem] flex-1 flex-col gap-3 pr-1 sm:min-h-[28rem]">
					{messages.map((message) => (
						<div
							className={clsx(
								"flex",
								message.role === "user" ? "justify-end" : "justify-start",
							)}
							key={message.id}
						>
							<div
								className={clsx(
									"max-w-[88%] min-w-0 rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
									message.role === "user"
										? "bg-primary text-white"
										: "border border-default-200/70 bg-default-50/80 text-foreground dark:bg-default-100/10",
								)}
							>
								<p className="break-words">{message.content}</p>
								{message.citations?.length ? (
									<div className="mt-3 flex max-w-full flex-wrap gap-2 overflow-hidden">
										{message.citations.map((citation) => (
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
										))}
									</div>
								) : null}
							</div>
						</div>
					))}

					{!hasUserMessages ? (
						<div className="flex justify-start">
							<div className="max-w-[92%] rounded-[22px] border border-default-200/70 bg-default-50/80 px-3.5 py-3 text-foreground shadow-sm dark:bg-default-100/10">
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
							<div className="flex items-center gap-3 rounded-[24px] border border-default-200/70 bg-default-50/80 px-4 py-3 text-sm text-default-600 shadow-sm dark:bg-default-100/10">
								<Spinner color="accent" size="sm" />
								<span>Thinking...</span>
							</div>
						</div>
					) : null}

					<div ref={messagesEndRef} />
				</ScrollShadow>

				{resumeError || statusMessage ? (
					<div className="px-1 text-xs text-default-500">
						{resumeError ? (
							<span className="text-danger">{resumeError}</span>
						) : (
							<span>{statusMessage}</span>
						)}
					</div>
				) : null}

				<form
					className="rounded-[22px] border border-default-200/70 bg-default-50/70 p-2.5 dark:bg-default-100/10 sm:rounded-[24px] sm:p-3"
					onSubmit={(event) => {
						event.preventDefault();
						void submitQuestion(draft);
					}}
				>
					<div className="flex flex-col gap-3">
						<TextArea
							aria-label={`Ask a question about ${personName}`}
							className="min-h-[78px] w-full rounded-[18px] border border-default-200/70 bg-content1/90 px-3.5 py-2.5 text-sm text-foreground shadow-none outline-none transition-colors placeholder:text-default-400 dark:border-default-100/14 dark:bg-content1/80 focus:border-primary/35 sm:min-h-[96px] sm:rounded-[20px] sm:px-4 sm:py-3"
							onChange={(event) => setDraft(event.target.value)}
							placeholder={`Ask about ${personName}'s background, education, experience, skills, work, projects, case studies, or system thinking...`}
							value={draft}
							variant="secondary"
						/>
						<div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
							<p className="max-w-2xl text-xs leading-5 text-default-500">
								Only resume-backed answers are allowed. Unrelated or missing
								questions are declined safely.
							</p>
							<div className="flex items-center justify-end gap-2">
								<Button
									className="rounded-full border border-default-200/70 bg-content1/90 px-3.5 text-foreground shadow-none hover:bg-default-100/70 dark:bg-content1/80"
									onClick={() => setMessages([buildWelcomeMessage(personName)])}
									type="button"
									variant="secondary"
								>
									Reset
								</Button>
								<Button
									className="rounded-full bg-primary px-3.5 text-white shadow-sm shadow-primary/20 hover:opacity-95"
									isDisabled={isSending || !resume}
									type="submit"
								>
									<span className="flex items-center gap-2">
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
						<Drawer.Dialog className="mx-auto flex h-full max-h-[94dvh] min-h-0 w-full max-w-5xl flex-col rounded-t-[2rem] border border-default-200/70 bg-background/96 backdrop-blur-xl">
							<Drawer.Header className="border-b border-default-200/60 px-4 pb-3 pt-2 sm:px-5">
								<Drawer.Handle className="mx-auto mb-3 mt-1 h-1.5 w-14 rounded-full bg-default-300/80 dark:bg-default-600/70" />
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
										className="rounded-full border border-default-200/70 bg-content1/80 p-2 text-white bg-red-600 shadow-none transition-colors"
									/>
								</div>
							</Drawer.Header>
							<Drawer.Body className="min-h-0 flex-1 overflow-hidden px-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 sm:px-5 sm:pb-5">
								<ResumeAssistant />
							</Drawer.Body>
						</Drawer.Dialog>
					</Drawer.Content>
				</Drawer.Backdrop>
			</Drawer>
		</div>
	);
}
