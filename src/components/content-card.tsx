import { Card, CardContent, CardHeader, Chip } from "@heroui/react";
import Link from "next/link";
import { HiOutlineCalendarDays, HiStar } from "react-icons/hi2";

import { AccentContentChip, MetaContentChip } from "@/components/content-chip";
import { ContentCover } from "@/components/content-cover";
import { siteConfig } from "@/config/site";
import { toTitleCase } from "@/lib/string";
import type { ContentFrontmatter, PostFrontmatter } from "@/types/content";

type ContentCardFrontmatter = ContentFrontmatter | PostFrontmatter;

type ContentCardProps = {
	slug: string;
	frontmatter: ContentCardFrontmatter;
	href: string;
	typeLabel?: string;
	showMeta?: boolean;
	coverHeightClassName?: string;
};

function isPostFrontmatter(
	frontmatter: ContentCardFrontmatter,
): frontmatter is PostFrontmatter {
	return "date" in frontmatter || "contentType" in frontmatter;
}

function getTypeLabel(frontmatter: ContentCardFrontmatter, typeLabel?: string) {
	if (typeLabel) {
		return typeLabel;
	}

	if (isPostFrontmatter(frontmatter)) {
		return toTitleCase(frontmatter.contentType || "post");
	}

	return "Content";
}

function getCtaLabel(displayTypeLabel: string) {
	const normalizedLabel = displayTypeLabel.toLowerCase();

	if (normalizedLabel === "project" || normalizedLabel === "case study") {
		return `View ${normalizedLabel}`;
	}

	return `Read ${normalizedLabel}`;
}

export function ContentCard({
	slug,
	frontmatter,
	href,
	typeLabel,
	showMeta = false,
	coverHeightClassName = "h-44 transition-transform duration-500 group-hover:scale-[1.03]",
}: ContentCardProps) {
	const displayTypeLabel = getTypeLabel(frontmatter, typeLabel);
	const shouldShowMeta = showMeta && isPostFrontmatter(frontmatter);
	const ctaLabel = getCtaLabel(displayTypeLabel);

	return (
		<Card
			key={slug}
			className="group h-full overflow-hidden border border-default-200/80 bg-content1/85 p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 dark:bg-content1/72"
		>
			<div className="relative overflow-hidden border-b border-default-200/70 bg-content1/65 dark:bg-content1/55">
				<ContentCover
					coverImage={frontmatter.coverImage}
					eyebrow={displayTypeLabel}
					heightClassName={coverHeightClassName}
					title={frontmatter.title}
				/>
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
			</div>
			<CardHeader className="flex flex-row items-start justify-between gap-3 px-3 pb-0 pt-3">
				<div className="min-w-0 flex-1">
					<p className="text-xl font-semibold tracking-tight">
						{frontmatter.title}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2 self-start">
					<AccentContentChip size="md">
						{displayTypeLabel.toUpperCase()}
					</AccentContentChip>
					{frontmatter.featured ? (
						<Chip variant="tertiary" color="accent">
							<HiStar
								className="drop-shadow-[0_0_10px_rgba(0,114,245,0.28)]"
								size={16}
							/>
						</Chip>
					) : null}
					{/* <div className="h-2.5 w-2.5 rounded-full bg-primary/75 shadow-[0_0_18px_rgba(0,114,245,0.35)]" /> */}
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 px-3 pb-3 pt-0">
				<p className="text-default-700">{frontmatter.summary}</p>
				<div className=" flex flex-col items-start gap-4 pt-2">
					{shouldShowMeta ? (
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
							<MetaContentChip>
								<HiOutlineCalendarDays className="text-primary/75" size={12} />
								<span>
									{new Date(frontmatter.date).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									})}
								</span>
								{siteConfig.githubHandle ? (
									<>
										<span className="h-1 w-1 rounded-full bg-default-400/90" />
										<span>@{siteConfig.githubHandle}</span>
									</>
								) : null}
							</MetaContentChip>
						</div>
					) : null}
					<div className="flex flex-wrap gap-2">
						{frontmatter.tags.map((tag) => (
							<Chip key={tag} className="px-1">
								{tag}
							</Chip>
						))}
					</div>
					<Link
						aria-label={`${ctaLabel}: ${frontmatter.title}`}
						className="inline-flex w-fit items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-transform duration-300 group-hover:translate-x-0.5"
						href={href}
					>
						{ctaLabel}
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
