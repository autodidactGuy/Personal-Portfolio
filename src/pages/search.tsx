import {
	Card,
	CardContent,
	Chip,
	Input,
	Label,
	Spinner,
	TextField,
} from "@heroui/react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { HiArrowSmLeft } from "react-icons/hi";
import { SearchIcon } from "@/components/icons";
import { withBasePath } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getGeneratedPageOgImage, getSeoImage } from "@/lib/seo";
import type { SearchIndexEntry } from "@/types/content";

const SEARCH_SYNC_EVENT = "portfolio-search-query-change";

const TYPE_ORDER: SearchIndexEntry["type"][] = [
	"project",
	"case-study",
	"article",
	"experience",
	"education",
	"about",
	"recommendation",
];

const TYPE_SECTION_LABELS: Record<SearchIndexEntry["type"], string> = {
	project: "Projects",
	"case-study": "Case Studies",
	article: "Articles",
	experience: "Experience",
	education: "Education",
	about: "About",
	recommendation: "Recommendations",
};

function normalizeQuery(value: string) {
	return value.trim().toLowerCase();
}

function tokenizeQuery(value: string) {
	return normalizeQuery(value).split(/\s+/).filter(Boolean);
}

function matchesEntry(entry: SearchIndexEntry, tokens: string[]) {
	if (!tokens.length) {
		return true;
	}

	const haystack = entry.searchText.toLowerCase();

	return tokens.every((token) => haystack.includes(token));
}

function groupResults(entries: SearchIndexEntry[], query: string) {
	const tokens = tokenizeQuery(query);
	const matches = entries.filter((entry) => matchesEntry(entry, tokens));

	return TYPE_ORDER.map((type) => ({
		type,
		label: TYPE_SECTION_LABELS[type],
		items: matches.filter((entry) => entry.type === type),
	})).filter((group) => group.items.length > 0);
}

export default function SearchPage() {
	const [query, setQuery] = useState("");
	const [entries, setEntries] = useState<SearchIndexEntry[] | null>(null);
	const [isLoadingIndex, setIsLoadingIndex] = useState(false);
	const [hasRequestedIndex, setHasRequestedIndex] = useState(false);
	const deferredQuery = useDeferredValue(query);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const searchParams = new URLSearchParams(window.location.search);
		const nextValue = searchParams.get("q") || "";

		setQuery(nextValue);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		window.dispatchEvent(
			new CustomEvent<string>(SEARCH_SYNC_EVENT, {
				detail: query,
			}),
		);
	}, [query]);

	useEffect(() => {
		if (
			!normalizeQuery(deferredQuery) ||
			entries !== null ||
			isLoadingIndex ||
			hasRequestedIndex
		) {
			return;
		}

		const loadIndex = async () => {
			setHasRequestedIndex(true);
			setIsLoadingIndex(true);

			try {
				const response = await fetch(withBasePath("/search-index.json"));

				if (!response.ok) {
					throw new Error(`Failed to load search index: ${response.status}`);
				}

				const payload = (await response.json()) as SearchIndexEntry[];
				setEntries(payload);
			} catch {
				setEntries([]);
			} finally {
				setIsLoadingIndex(false);
			}
		};

		void loadIndex();
	}, [deferredQuery, entries, hasRequestedIndex, isLoadingIndex]);

	const groups = groupResults(entries || [], deferredQuery);
	const resultCount = groups.reduce(
		(count, group) => count + group.items.length,
		0,
	);
	const isSearching = Boolean(normalizeQuery(deferredQuery));

	return (
		<DefaultLayout
			seo={{
				title: "Search",
				description:
					"Search across portfolio work, case studies, articles, experience, education, and recommendations.",
				pathname: "/search",
				image: getSeoImage(getGeneratedPageOgImage("about")),
			}}
		>
			<section className="mx-auto max-w-5xl py-10">
				<Link
					className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
					href="/"
				>
					<HiArrowSmLeft size={18} />
					Back to Home
				</Link>

				<div className="space-y-4">
					<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
						Search
					</h1>
					<p className="text-default-700">
						Search across about, experience, education, projects, case studies,
						articles, and recommendations.
					</p>
				</div>

				<Card className="mt-8 border border-default-200/80 bg-content1/85 shadow-sm dark:bg-content1/72">
					<CardContent className="gap-5 p-5 sm:p-6">
						<form
							action="/search"
							className="flex flex-col gap-4 sm:flex-row"
							method="get"
						>
							<TextField className="flex-1" name="q" value={query}>
								<Label className="sr-only">Search the site</Label>
								<div className="relative">
									<SearchIcon className="pointer-events-none absolute left-4 top-1/2 z-10 flex-shrink-0 -translate-y-1/2 text-base text-default-400" />
									<Input
										aria-label="Search the site"
										className="w-full rounded-2xl border border-default-200/80 bg-content1/90 py-3 pl-12 pr-4 text-base text-foreground shadow-none outline-none transition-colors placeholder:text-default-400 sm:text-sm dark:border-default-100/14 dark:bg-[#13233c] focus:border-primary/45"
										name="q"
										onChange={(event) => setQuery(event.target.value)}
										placeholder="Search projects, case studies, articles, experience, education, and recommendations..."
										type="search"
										variant="secondary"
									/>
								</div>
							</TextField>
							<button
								className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
								type="submit"
							>
								Search
							</button>
						</form>

						{isSearching && !isLoadingIndex && entries ? (
							<div className="flex flex-wrap items-center gap-2">
								<span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
									{resultCount} results for &ldquo;{deferredQuery.trim()}&rdquo;
								</span>
							</div>
						) : null}
					</CardContent>
				</Card>

				<div className="mt-8 space-y-8">
					{isSearching && isLoadingIndex ? (
						<Card className="border border-default-200/80 bg-content1/85 shadow-sm dark:bg-content1/72 p-0">
							<CardContent className="flex flex-row items-center gap-3 p-5 text-default-700 sm:p-6">
								<Spinner color="accent" size="sm" />
								<p>Searching...</p>
							</CardContent>
						</Card>
					) : null}

					{isSearching && !isLoadingIndex && entries && resultCount === 0 ? (
						<Card className="border border-default-200/80 bg-content1/85 shadow-sm dark:bg-content1/72 p-0">
							<CardContent className="p-5 text-default-700 sm:p-6">
								No results found for &ldquo;{deferredQuery.trim()}&rdquo;. Try a
								broader term or a company, skill, or system keyword.
							</CardContent>
						</Card>
					) : null}

					{isSearching &&
						!isLoadingIndex &&
						entries &&
						groups.map((group) => (
							<section key={group.type} className="space-y-4">
								<div className="flex items-center justify-between gap-3">
									<h2 className="text-2xl font-semibold">{group.label}</h2>
									<span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
										{group.items.length}
									</span>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									{group.items.map((entry) => (
										<Card
											key={entry.id}
											className="p-0 border border-default-200/80 bg-content1/85 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:bg-content1/72"
										>
											<CardContent className="gap-4 p-5">
												<div className="flex flex-wrap items-center gap-2">
													<Chip size="md" color="accent" variant="soft">
														{entry.typeLabel}
													</Chip>
													{entry.meta ? (
														<p className="text-xs text-default-500">
															{entry.meta}
														</p>
													) : null}
												</div>
												<div className="space-y-2">
													<h3 className="text-lg font-semibold tracking-tight">
														{entry.title}
													</h3>
													<p className="text-default-700">{entry.summary}</p>
												</div>
												<div className="flex flex-wrap gap-2">
													{entry.keywords.slice(0, 4).map(
														(keyword) =>
															keyword && (
																<Chip key={`${entry.id}-${keyword}`} size="sm">
																	{keyword}
																</Chip>
															),
													)}
												</div>
												<Link
													className="inline-flex w-fit items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-transform duration-300 hover:translate-x-0.5"
													href={entry.href}
												>
													Read more
												</Link>
											</CardContent>
										</Card>
									))}
								</div>
							</section>
						))}
				</div>
			</section>
		</DefaultLayout>
	);
}
