import { Card, CardContent, CardHeader, Chip } from "@heroui/react";
import type { GetStaticPaths, GetStaticProps } from "next";

import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import { HiOutlineCalendarDays } from "react-icons/hi2";
import { MetaContentChip } from "@/components/content-chip";
import { ContentCover } from "@/components/content-cover";
import { MDXRenderer } from "@/components/mdx/mdx-renderer";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { compileMdx, getBlogBySlug, getBlogPosts } from "@/lib/content";
import {
	formatIsoDate,
	getAbsoluteImageUrl,
	getGeneratedPostOgImage,
	getPersonId,
	getSeoImage,
	getSiteUrl,
	getWebsiteId,
} from "@/lib/seo";
import { toTitleCase } from "@/lib/string";
import { PostContentTypeEnum, type PostFrontmatter } from "@/types/content";

type BlogPostPageProps = {
	post: {
		slug: string;
		frontmatter: PostFrontmatter;
	};
	source: MDXRemoteSerializeResult;
};

export default function BlogPostPage({ post, source }: BlogPostPageProps) {
	const isProject =
		post.frontmatter.contentType === PostContentTypeEnum.Project;
	const detailPath = isProject ? `/project/${post.slug}` : `/blog/${post.slug}`;
	const pageDescription = post.frontmatter.summary || siteConfig.description;
	const seoImage = getSeoImage(
		post.frontmatter.coverImage,
		getGeneratedPostOgImage(post.slug, isProject),
	);

	return (
		<DefaultLayout
			seo={{
				title: `${post.frontmatter.title}`,
				description: pageDescription,
				pathname: `/blog/${post.slug}`,
				canonicalPathname: detailPath,
				image: seoImage,
				type: "article",
				publishedTime: formatIsoDate(post.frontmatter.date),
				tags: post.frontmatter.tags,
				noindex: isProject,
				structuredData: {
					"@context": "https://schema.org",
					"@type": "BlogPosting",
					"@id": `${getSiteUrl(detailPath)}#article`,
					headline: post.frontmatter.title,
					description: pageDescription,
					datePublished: formatIsoDate(post.frontmatter.date),
					dateModified: formatIsoDate(post.frontmatter.date),
					image: getAbsoluteImageUrl(seoImage),
					author: {
						"@id": getPersonId(),
					},
					publisher: {
						"@id": getWebsiteId(),
					},
					mainEntityOfPage: getSiteUrl(detailPath),
					keywords: post.frontmatter.tags.join(", "),
				},
			}}
		>
			<article className="mx-auto max-w-4xl py-10">
				<PageBreadcrumbs
					items={[
						{ label: "Home", href: "/" },
						{ label: "Blog", href: "/blog" },
						{ label: post.frontmatter.title },
					]}
				/>
				<Card className="overflow-hidden border border-default-200/80 bg-content1/85 p-0 shadow-sm shadow-primary/5 dark:bg-content1/72">
					<div className="relative overflow-hidden border-b border-default-200/70 bg-content1/65 dark:bg-content1/55">
						<ContentCover
							coverImage={post.frontmatter.coverImage}
							eyebrow={toTitleCase(post.frontmatter.contentType || "post")}
							heightClassName="h-[210px] sm:h-[250px]"
							// subtitle={post.frontmatter.contentType}
							title={post.frontmatter.title}
						/>
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
					</div>
					<CardHeader className="flex flex-col items-start gap-5 px-6 py-6 sm:px-8 sm:py-8">
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
							<MetaContentChip>
								<HiOutlineCalendarDays className="text-primary/75" size={12} />
								<span>
									{new Date(post.frontmatter.date).toLocaleDateString("en-US", {
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
						<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
							{post.frontmatter.title}
						</h1>
						<p className="max-w-3xl text-lg text-default-700">
							{post.frontmatter.summary}
						</p>
						<div className="flex flex-wrap gap-2">
							{/* <AccentContentChip size="md">
								{toTitleCase(
									post.frontmatter.contentType || "post",
								).toUpperCase()}
							</AccentContentChip> */}
							{post.frontmatter.tags.map((tag) => (
								<Chip key={tag}>{tag}</Chip>
							))}
						</div>
					</CardHeader>
					<CardContent className="px-6 pb-8 pt-0 sm:px-8">
						<MDXRenderer source={source} />
					</CardContent>
				</Card>
			</article>
		</DefaultLayout>
	);
}

export const getStaticPaths: GetStaticPaths = async () => {
	return {
		paths: getBlogPosts().map(({ slug }) => ({
			params: { slug },
		})),
		fallback: false,
	};
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({
	params,
}) => {
	const slug = String(params?.slug);
	const post = getBlogBySlug(slug);

	return {
		props: {
			post: {
				slug: post.slug,
				frontmatter: post.frontmatter,
			},
			source: await compileMdx(post.content),
		},
	};
};
