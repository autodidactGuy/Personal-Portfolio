import type { GetStaticPaths, GetStaticProps } from "next";

import { ContentCard } from "@/components/content-card";
import { PaginationControls } from "@/components/pagination-controls";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getBlogPosts } from "@/lib/content";
import {
	CONTENT_PAGE_SIZE,
	getPaginatedItems,
	getTotalPages,
} from "@/lib/pagination";
import { getGeneratedPageOgImage, getSeoImage, getSiteUrl } from "@/lib/seo";
import type { PostFrontmatter } from "@/types/content";

type BlogPageProps = {
	posts: Array<{
		slug: string;
		frontmatter: PostFrontmatter;
	}>;
	currentPage: number;
	totalPages: number;
};

export default function BlogPage({
	posts,
	currentPage,
	totalPages,
}: BlogPageProps) {
	const pageDescription =
		"Notes on system design, distributed systems, and lessons from building real-world software at scale.";
	const pathname = `/blog/page/${currentPage}`;

	return (
		<DefaultLayout
			seo={{
				title: `Blog - Page ${currentPage}`,
				description: pageDescription,
				pathname,
				image: getSeoImage(getGeneratedPageOgImage("blog")),
				structuredData: [
					{
						"@context": "https://schema.org",
						"@type": "Blog",
						name: `${siteConfig.name} Blog`,
						url: getSiteUrl(pathname),
						description: pageDescription,
					},
					{
						"@context": "https://schema.org",
						"@type": "CollectionPage",
						name: `${siteConfig.name} Writing - Page ${currentPage}`,
						url: getSiteUrl(pathname),
						description: pageDescription,
						mainEntity: {
							"@type": "ItemList",
							itemListElement: posts.map((post, index) => ({
								"@type": "ListItem",
								position: (currentPage - 1) * CONTENT_PAGE_SIZE + index + 1,
								url: getSiteUrl(`/blog/${post.slug}`),
								name: post.frontmatter.title,
							})),
						},
					},
				],
			}}
		>
			<section className="mx-auto max-w-5xl py-10">
				<div className="mb-10 space-y-4">
					<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
						Blog
					</h1>
					<p className="mt-3 text-default-700">{pageDescription}</p>
				</div>

				<div className="grid gap-5 md:grid-cols-2 xl:gap-6">
					{posts.map((post) => (
						<ContentCard
							key={post.slug}
							coverHeightClassName="h-44 transition-transform duration-500 group-hover:scale-[1.03]"
							frontmatter={post.frontmatter}
							href={`/blog/${post.slug}`}
							showMeta
							slug={post.slug}
						/>
					))}
				</div>
				<PaginationControls
					basePath="/blog"
					currentPage={currentPage}
					totalPages={totalPages}
				/>
			</section>
		</DefaultLayout>
	);
}

export const getStaticPaths: GetStaticPaths = async () => {
	const totalPages = getTotalPages(getBlogPosts().length);

	return {
		paths: Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
			params: {
				page: String(index + 2),
			},
		})),
		fallback: false,
	};
};

export const getStaticProps: GetStaticProps<BlogPageProps> = async ({
	params,
}) => {
	const posts = getBlogPosts();
	const totalPages = getTotalPages(posts.length);
	const currentPage = Number(params?.page || "1");

	if (
		!Number.isInteger(currentPage) ||
		currentPage < 2 ||
		currentPage > totalPages
	) {
		return {
			notFound: true,
		};
	}

	return {
		props: {
			posts: getPaginatedItems(posts, currentPage),
			currentPage,
			totalPages,
		},
	};
};
