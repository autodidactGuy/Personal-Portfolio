import { Button, Card, CardBody, Chip, Input } from "@heroui/react";
import type { GetStaticProps } from "next";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { HiArrowSmLeft } from "react-icons/hi";
import { SearchIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import { getSearchIndex } from "@/lib/content";
import { getGeneratedPageOgImage, getSeoImage } from "@/lib/seo";
import type { SearchIndexEntry } from "@/types/content";

const SEARCH_SYNC_EVENT = "portfolio-search-query-change";

type SearchPageProps = {
	entries: SearchIndexEntry[];
};

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

export default function SearchPage({ entries }: SearchPageProps) {
	const [query, setQuery] = useState("");
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

	const groups = groupResults(entries, deferredQuery);
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
				<Button
					as={Link}
					className="mb-5"
					color="primary"
					href="/"
					radius="full"
					size="sm"
					startContent={<HiArrowSmLeft size={18} />}
					variant="flat"
				>
					Back to Home
				</Button>

				<div className="space-y-4">
					<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
						Search
					</h1>
					<p className="text-default-700">
						Search across about, experience, education, projects, case studies,
						articles, and recommendations. Results stay grouped by type so it is
						easy to jump into the right section.
					</p>
				</div>

				<Card className="mt-8 border border-default-200/80 bg-content1/85 shadow-sm dark:bg-content1/72">
					<CardBody className="gap-5 p-5 sm:p-6">
						<form
							action="/search"
							className="flex flex-col gap-4 sm:flex-row"
							method="get"
						>
							<Input
								aria-label="Search the site"
								className="flex-1"
								name="q"
								onValueChange={setQuery}
								placeholder="Search systems, payments, AI, AWS, Amazon, recommendations..."
								startContent={
									<SearchIcon className="pointer-events-none flex-shrink-0 text-base text-default-400" />
								}
								type="search"
								value={query}
							/>
							<Button
								color="primary"
								radius="full"
								type="submit"
								variant="flat"
							>
								Search
							</Button>
						</form>

						{isSearching ? (
							<div className="flex flex-wrap items-center gap-2">
								<Chip radius="full" size="sm" variant="flat">
									{resultCount} results for &ldquo;{deferredQuery.trim()}&rdquo;
								</Chip>
							</div>
						) : null}
					</CardBody>
				</Card>

				<div className="mt-8 space-y-8">
					{isSearching && resultCount === 0 ? (
						<Card className="border border-default-200/80 bg-content1/85 shadow-sm dark:bg-content1/72">
							<CardBody className="p-5 text-default-700 sm:p-6">
								No results found for &ldquo;{deferredQuery.trim()}&rdquo;. Try a
								broader term or a company, skill, or system keyword.
							</CardBody>
						</Card>
					) : null}

					{isSearching &&
						groups.map((group) => (
							<section key={group.type} className="space-y-4">
								<div className="flex items-center justify-between gap-3">
									<h2 className="text-2xl font-semibold">{group.label}</h2>
									<Chip radius="full" size="sm" variant="flat">
										{group.items.length}
									</Chip>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									{group.items.map((entry) => (
										<Card
											key={entry.id}
											className="border border-default-200/80 bg-content1/85 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:bg-content1/72"
										>
											<CardBody className="gap-4 p-5">
												<div className="flex flex-wrap items-center gap-2">
													<Chip radius="full" size="sm" variant="flat">
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
																<Chip
																	key={`${entry.id}-${keyword}`}
																	radius="full"
																	size="sm"
																	variant="flat"
																>
																	{keyword}
																</Chip>
															),
													)}
												</div>
												<Button
													as={Link}
													className="w-fit"
													color="primary"
													href={entry.href}
													radius="full"
													variant="flat"
												>
													Read more
												</Button>
											</CardBody>
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

export const getStaticProps: GetStaticProps<SearchPageProps> = async () => {
	return {
		props: {
			entries: getSearchIndex(),
		},
	};
};
