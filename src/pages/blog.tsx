import type { GetStaticProps } from "next";

import { ContentCard } from "@/components/content-card";
import { PaginationControls } from "@/components/pagination-controls";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getBlogPosts } from "@/lib/content";
import { getPaginatedItems, getTotalPages } from "@/lib/pagination";
import {
	getGeneratedPageOgImage,
	getPersonId,
	getSeoImage,
	getSiteUrl,
	getWebsiteId,
} from "@/lib/seo";
import type { PostFrontmatter } from "@/types/content";

type BlogIndexProps = {
	posts: Array<{
		slug: string;
		frontmatter: PostFrontmatter;
	}>;
	currentPage: number;
	totalPages: number;
};

export default function BlogIndex({
	posts,
	currentPage,
	totalPages,
}: BlogIndexProps) {
	const pageDescription =
		"Writing on software engineering, AI systems, distributed systems, and lessons from building production platforms at scale.";

	return (
		<DefaultLayout
			seo={{
				fullTitle: "Blog | Software Engineering, AI & Systems",
				description: pageDescription,
				pathname: "/blog",
				image: getSeoImage(getGeneratedPageOgImage("blog")),
				imageAlt: `${siteConfig.name} writing page`,
				structuredData: [
					{
						"@context": "https://schema.org",
						"@type": "Blog",
						name: `${siteConfig.name} Blog`,
						url: getSiteUrl("/blog"),
						description: pageDescription,
						author: {
							"@id": getPersonId(),
						},
						isPartOf: {
							"@id": getWebsiteId(),
						},
					},
					{
						"@context": "https://schema.org",
						"@type": "CollectionPage",
						name: `${siteConfig.name} Writing`,
						url: getSiteUrl("/blog"),
						description: pageDescription,
						about: {
							"@id": getPersonId(),
						},
						mainEntity: {
							"@type": "ItemList",
							itemListElement: posts.map((post, index) => ({
								"@type": "ListItem",
								position: index + 1,
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
					{/* <Chip
            classNames={{
              base: "border border-primary/20 bg-primary/10 text-primary",
              content: "font-medium uppercase tracking-[0.10em] text-[11px]",
            }}
            radius="full"
            size="sm"
            variant="flat"
          >
            Writing
          </Chip> */}
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

export const getStaticProps: GetStaticProps<BlogIndexProps> = async () => {
	const posts = getBlogPosts();

	return {
		props: {
			posts: getPaginatedItems(posts, 1),
			currentPage: 1,
			totalPages: getTotalPages(posts.length),
		},
	};
};
