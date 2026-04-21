"use client";

import { Card, CardContent, CardHeader, Chip, Skeleton } from "@heroui/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HiArrowTopRightOnSquare, HiSparkles } from "react-icons/hi2";
import { experimentalAssistantConfig } from "@/config/experimental-assistant";
import { withBasePath } from "@/config/site";
import {
	cacheArtifact,
	cacheQueryEmbedding,
	readCachedArtifact,
	readCachedQueryEmbedding,
} from "@/lib/experimental-assistant/cache";
import { CATEGORY_DESCRIPTIONS } from "@/lib/experimental-assistant/chunking";
import {
	fetchExperimentalChatAnswer,
	fetchExperimentalQueryEmbedding,
	getExperimentalAssistantProxyUrl,
} from "@/lib/experimental-assistant/hf-client";
import {
	buildExperimentalRetrievalQuery,
	buildLocalGroundedAnswer,
	rankExperimentalChunks,
} from "@/lib/experimental-assistant/retrieval";
import type {
	ExperimentalAssistantArtifact,
	ExperimentalAssistantMessage,
	RetrievalResult,
} from "@/lib/experimental-assistant/types";
import {
	CATEGORY_LABELS,
	EXPERIMENTAL_ASSISTANT_ARTIFACT_PATH,
} from "@/lib/experimental-assistant/types";

const DEFAULT_FALLBACK_QUESTION =
	"What recent payment, platform, and AI work has Hassan done?";
const DEFAULT_CHAT_MODEL =
	process.env.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_CHAT_MODEL ||
	experimentalAssistantConfig.NEXT_PUBLIC_EXPERIMENTAL_ASSISTANT_CHAT_MODEL ||
	"";

function createMessage(
	role: ExperimentalAssistantMessage["role"],
	content: string,
	options?: Partial<ExperimentalAssistantMessage>,
): ExperimentalAssistantMessage {
	return {
		id:
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `${role}-${Date.now()}`,
		role,
		content,
		createdAt: new Date().toISOString(),
		...options,
	};
}

export function ExperimentalAssistantLab() {
	const [artifact, setArtifact] =
		useState<ExperimentalAssistantArtifact | null>(null);
	const [artifactError, setArtifactError] = useState("");
	const [messages, setMessages] = useState<ExperimentalAssistantMessage[]>([]);
	const [question, setQuestion] = useState(DEFAULT_FALLBACK_QUESTION);
	const [isLoadingArtifact, setIsLoadingArtifact] = useState(true);
	const [isRunning, setIsRunning] = useState(false);
	const [useHfFallback, setUseHfFallback] = useState(
		Boolean(DEFAULT_CHAT_MODEL),
	);
	const [retrievalResult, setRetrievalResult] =
		useState<RetrievalResult | null>(null);
	const [statusMessage, setStatusMessage] = useState(
		"Load the generated artifact, then test retrieval and optional HF synthesis.",
	);

	useEffect(() => {
		let isCancelled = false;

		void (async () => {
			setIsLoadingArtifact(true);
			setArtifactError("");

			try {
				const response = await fetch(
					withBasePath(EXPERIMENTAL_ASSISTANT_ARTIFACT_PATH),
				);

				if (!response.ok) {
					throw new Error(`Artifact request failed: ${response.status}`);
				}

				const payload =
					(await response.json()) as ExperimentalAssistantArtifact;

				if (isCancelled) {
					return;
				}

				const cached = readCachedArtifact(payload.sourceHash);
				const resolvedArtifact = cached || payload;
				setArtifact(resolvedArtifact);
				cacheArtifact(payload);
				setStatusMessage(
					`Loaded ${payload.chunks.length} chunks embedded with ${payload.embeddingModel}.`,
				);
			} catch {
				if (!isCancelled) {
					setArtifactError(
						"Experimental artifact is missing. Run yarn assistant:experiment:generate first.",
					);
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingArtifact(false);
				}
			}
		})();

		return () => {
			isCancelled = true;
		};
	}, []);

	const citationMap = useMemo(() => {
		if (!artifact) {
			return new Map<string, ExperimentalAssistantArtifact["chunks"][number]>();
		}

		return new Map(artifact.chunks.map((chunk) => [chunk.id, chunk]));
	}, [artifact]);

	const proxyUrl = getExperimentalAssistantProxyUrl();
	const canUseChatFallback = useHfFallback && Boolean(DEFAULT_CHAT_MODEL);

	async function handleAsk() {
		const trimmedQuestion = question.trim();

		if (!trimmedQuestion || !artifact) {
			return;
		}

		setIsRunning(true);
		setStatusMessage("Running retrieval...");
		const nextUserMessage = createMessage("user", trimmedQuestion);
		const nextMessages = [...messages, nextUserMessage];
		setMessages(nextMessages);

		try {
			const retrievalQuery = buildExperimentalRetrievalQuery(
				trimmedQuestion,
				nextMessages,
			);
			let queryEmbedding: number[] | null = null;
			const cachedEmbedding = readCachedQueryEmbedding(
				artifact.sourceHash,
				artifact.embeddingModel,
				retrievalQuery,
			);

			if (cachedEmbedding) {
				queryEmbedding = cachedEmbedding;
			} else {
				try {
					queryEmbedding = await fetchExperimentalQueryEmbedding({
						model: artifact.embeddingModel,
						query: retrievalQuery,
					});
					cacheQueryEmbedding(
						artifact.sourceHash,
						artifact.embeddingModel,
						retrievalQuery,
						queryEmbedding,
					);
				} catch {
					setStatusMessage(
						"Query embedding failed, so the experiment dropped to keyword-only ranking.",
					);
				}
			}

			const nextRetrieval = rankExperimentalChunks({
				query: retrievalQuery,
				chunks: artifact.chunks,
				embeddings: artifact.embeddings,
				queryEmbedding,
			});
			setRetrievalResult(nextRetrieval);

			const topContext = nextRetrieval.entries.slice(0, 5).map((entry) => ({
				id: entry.chunk.id,
				title: entry.chunk.title,
				text: entry.chunk.text,
				url: entry.chunk.url,
			}));

			if (canUseChatFallback) {
				setStatusMessage(
					"Retrieval complete. Asking the local HF proxy for synthesis...",
				);

				try {
					const answer = await fetchExperimentalChatAnswer({
						model: DEFAULT_CHAT_MODEL,
						question: trimmedQuestion,
						context: topContext,
					});

					setMessages((currentMessages) => [
						...currentMessages,
						createMessage("assistant", answer.answer, {
							citations: answer.citations,
							mode: "hf-chat",
						}),
					]);
					setStatusMessage("HF synthesis succeeded.");
					return;
				} catch {
					setStatusMessage(
						"HF synthesis failed. Falling back to a retrieval-only grounded answer.",
					);
				}
			}

			const fallback = buildLocalGroundedAnswer(nextRetrieval.entries);
			setMessages((currentMessages) => [
				...currentMessages,
				createMessage("assistant", fallback.answer, {
					citations: fallback.citations,
					mode: "retrieval",
				}),
			]);
			setStatusMessage("Returned a retrieval-only answer.");
		} finally {
			setIsRunning(false);
		}
	}

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-10 sm:py-14">
			<div className="space-y-4">
				<Chip
					color="warning"
					variant="soft"
					className="border border-warning/25 bg-warning/10 text-warning-700"
				>
					Local-only experiment
				</Chip>
				<div className="space-y-2">
					<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
						Experimental Assistant Lab
					</h1>
					<p className="max-w-3xl text-default-700">
						This page is completely separate from the production assistant. It
						uses a generated local artifact, embeddings-first retrieval, hybrid
						ranking, and an optional Hugging Face synthesis fallback through a
						standalone local proxy.
					</p>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
				<Card className="border border-default-200/80 bg-content1/90 shadow-sm">
					<CardHeader className="flex flex-col items-start gap-2">
						<div className="flex items-center gap-2 text-lg font-semibold">
							<HiSparkles className="text-warning" size={20} />
							Assistant Playground
						</div>
						<p className="text-sm text-default-600">
							Ask a question against the generated portfolio corpus.
						</p>
					</CardHeader>
					<CardContent className="gap-4 p-6">
						{isLoadingArtifact ? (
							<div className="space-y-3">
								<Skeleton className="h-10 rounded-2xl" />
								<Skeleton className="h-28 rounded-2xl" />
							</div>
						) : null}

						{artifactError ? (
							<Card className="border border-danger/25 bg-danger/5 shadow-none">
								<CardContent className="gap-3 p-4">
									<p className="text-sm text-danger">{artifactError}</p>
									<pre className="rounded-xl bg-content2/80 px-3 py-2 text-xs text-default-700">
										yarn assistant:experiment:generate
									</pre>
								</CardContent>
							</Card>
						) : null}

						{artifact ? (
							<>
								<div className="flex flex-wrap items-center gap-2 text-sm text-default-700">
									<Chip variant="soft">{artifact.embeddingModel}</Chip>
									<Chip variant="soft">{artifact.chunks.length} chunks</Chip>
									<Chip variant="soft">Proxy: {proxyUrl}</Chip>
								</div>

								<label className="space-y-2">
									<span className="text-sm font-medium text-default-700">
										Question
									</span>
									<textarea
										className="min-h-32 w-full rounded-2xl border border-default-200/80 bg-content2/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50"
										placeholder="Ask about payments, architecture, projects, AI work, experience chronology, or contact details..."
										value={question}
										onChange={(event) => setQuestion(event.target.value)}
									/>
								</label>

								<div className="flex flex-wrap items-center justify-between gap-3">
									<label className="flex items-center gap-3 text-sm text-default-700">
										<input
											type="checkbox"
											className="h-4 w-4 rounded border-default-300"
											checked={useHfFallback}
											disabled={!DEFAULT_CHAT_MODEL}
											onChange={(event) =>
												setUseHfFallback(event.target.checked)
											}
										/>
										<span>Use HF synthesis fallback</span>
									</label>
									<button
										type="button"
										className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={!artifact || isRunning}
										onClick={() => void handleAsk()}
									>
										{isRunning ? "Running..." : "Run experiment"}
									</button>
								</div>

								<p className="text-sm text-default-600">{statusMessage}</p>

								<div className="space-y-3">
									{messages.length ? (
										messages.map((message) => (
											<Card
												key={message.id}
												className="border border-default-200/70 bg-content2/50 shadow-none"
											>
												<CardContent className="gap-3 p-4">
													<div className="flex items-center justify-between gap-3">
														<div className="text-sm font-semibold capitalize">
															{message.role}
														</div>
														{message.mode ? (
															<Chip size="sm" variant="soft">
																{message.mode}
															</Chip>
														) : null}
													</div>
													<p className="whitespace-pre-wrap text-sm text-default-800">
														{message.content}
													</p>
													{message.citations?.length ? (
														<div className="flex flex-wrap gap-2">
															{message.citations.map((citationId) => {
																const chunk = citationMap.get(citationId);

																if (!chunk) {
																	return (
																		<Chip
																			key={citationId}
																			size="sm"
																			variant="soft"
																		>
																			{citationId}
																		</Chip>
																	);
																}

																return chunk.url ? (
																	<Link
																		key={citationId}
																		href={chunk.url}
																		className="inline-flex"
																	>
																		<Chip size="sm" variant="soft">
																			<span className="inline-flex items-center gap-1">
																				{chunk.title}
																				<HiArrowTopRightOnSquare size={12} />
																			</span>
																		</Chip>
																	</Link>
																) : (
																	<Chip
																		key={citationId}
																		size="sm"
																		variant="soft"
																	>
																		{chunk.title}
																	</Chip>
																);
															})}
														</div>
													) : null}
												</CardContent>
											</Card>
										))
									) : (
										<p className="text-sm text-default-600">
											No messages yet. Start with the suggested question or try
											a chronology-heavy query like “What did he do most
											recently?”
										</p>
									)}
								</div>
							</>
						) : null}
					</CardContent>
				</Card>

				<div className="space-y-6">
					<Card className="border border-default-200/80 bg-content1/90 shadow-sm">
						<CardHeader className="flex flex-col items-start gap-2">
							<h2 className="text-lg font-semibold">Retrieval Debug</h2>
							<p className="text-sm text-default-600">
								Hybrid scoring combines semantic similarity, lexical overlap,
								intent boosts, and chronology signals.
							</p>
						</CardHeader>
						<CardContent className="gap-3 p-6">
							{retrievalResult ? (
								<>
									<pre className="whitespace-pre-wrap break-words rounded-xl bg-content2/80 px-3 py-2 text-xs text-default-700">
										mode: {retrievalResult.mode}
										{"\n"}
										query: {retrievalResult.query}
									</pre>
									<div className="space-y-3">
										{retrievalResult.entries.map((entry) => (
											<Card
												key={entry.chunk.id}
												className="border border-default-200/70 bg-content2/50 shadow-none"
											>
												<CardContent className="gap-2 p-4">
													<div className="flex items-start justify-between gap-3">
														<div>
															<p className="font-semibold">
																{entry.chunk.title}
															</p>
															<p className="text-xs text-default-500">
																{CATEGORY_LABELS[entry.chunk.category]} ·{" "}
																{entry.chunk.section}
															</p>
														</div>
														<Chip size="sm" variant="soft">
															{entry.score.toFixed(3)}
														</Chip>
													</div>
													<p className="text-sm text-default-700">
														{entry.chunk.text}
													</p>
													<pre className="whitespace-pre-wrap break-words rounded-xl bg-content2/80 px-3 py-2 text-xs text-default-700">
														semantic: {entry.breakdown.semantic.toFixed(3)}
														{"\n"}
														lexical: {entry.breakdown.lexical.toFixed(3)}
														{"\n"}
														keyword: {entry.breakdown.keyword.toFixed(3)}
														{"\n"}
														intent: {entry.breakdown.intent.toFixed(3)}
														{"\n"}
														chronology: {entry.breakdown.chronology.toFixed(3)}
														{"\n"}
														topic: {entry.breakdown.topic.toFixed(3)}
														{"\n"}
														entity: {entry.breakdown.entity.toFixed(3)}
														{"\n"}
														length: {entry.breakdown.length.toFixed(3)}
														{"\n"}
														duplicate penalty:{" "}
														{entry.breakdown.duplicatePenalty.toFixed(3)}
													</pre>
												</CardContent>
											</Card>
										))}
									</div>
								</>
							) : (
								<p className="text-sm text-default-600">
									Run a question to inspect the ranking output.
								</p>
							)}
						</CardContent>
					</Card>

					<Card className="border border-default-200/80 bg-content1/90 shadow-sm">
						<CardHeader className="flex flex-col items-start gap-2">
							<h2 className="text-lg font-semibold">Corpus Shape</h2>
							<p className="text-sm text-default-600">
								Chunk categories in the experimental artifact.
							</p>
						</CardHeader>
						<CardContent className="gap-3 p-6">
							{Object.entries(CATEGORY_LABELS).map(([category, label]) => (
								<div
									key={category}
									className="rounded-2xl border border-default-200/70 bg-content2/45 p-3"
								>
									<p className="font-semibold">{label}</p>
									<p className="text-sm text-default-600">
										{
											CATEGORY_DESCRIPTIONS[
												category as keyof typeof CATEGORY_DESCRIPTIONS
											]
										}
									</p>
								</div>
							))}
							<label className="space-y-2">
								<span className="text-sm font-medium text-default-700">
									Artifact path
								</span>
								<input
									readOnly
									className="w-full rounded-2xl border border-default-200/80 bg-content2/60 px-4 py-3 text-sm text-foreground"
									value={withBasePath(EXPERIMENTAL_ASSISTANT_ARTIFACT_PATH)}
								/>
							</label>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
