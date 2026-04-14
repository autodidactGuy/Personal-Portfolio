import type { GetStaticPaths, GetStaticProps } from "next";

import { ContentCard } from "@/components/content-card";
import { PaginationControls } from "@/components/pagination-controls";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getProjects } from "@/lib/content";
import {
	CONTENT_PAGE_SIZE,
	getPaginatedItems,
	getTotalPages,
} from "@/lib/pagination";
import { getGeneratedPageOgImage, getSeoImage, getSiteUrl } from "@/lib/seo";
import { toTitleCase } from "@/lib/string";
import type { PostFrontmatter } from "@/types/content";

type ProjectsPageProps = {
	projects: Array<{
		slug: string;
		frontmatter: PostFrontmatter;
	}>;
	currentPage: number;
	totalPages: number;
};

export default function ProjectsListingPage({
	projects,
	currentPage,
	totalPages,
}: ProjectsPageProps) {
	const pageDescription =
		"Systems I've built, explained through real-world case studies.";
	const pathname = `/projects/page/${currentPage}`;

	return (
		<DefaultLayout
			seo={{
				title: `Projects - Page ${currentPage}`,
				description: pageDescription,
				pathname,
				image: getSeoImage(getGeneratedPageOgImage("projects")),
				structuredData: {
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: `${siteConfig.name} Projects - Page ${currentPage}`,
					url: getSiteUrl(pathname),
					description: pageDescription,
					mainEntity: {
						"@type": "ItemList",
						itemListElement: projects.map((project, index) => ({
							"@type": "ListItem",
							position: (currentPage - 1) * CONTENT_PAGE_SIZE + index + 1,
							url: getSiteUrl(`/project/${project.slug}`),
							name: project.frontmatter.title,
						})),
					},
				},
			}}
		>
			<section className="mx-auto max-w-5xl py-10">
				<div className="mb-10 space-y-4">
					<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
						Projects
					</h1>
					<p className="mt-3 text-default-700">{pageDescription}</p>
				</div>
				<div className="grid gap-5 md:grid-cols-2 xl:gap-6">
					{projects.map((project) => (
						<ContentCard
							key={project.slug}
							coverHeightClassName="h-44 transition-transform duration-500 group-hover:scale-[1.03]"
							frontmatter={project.frontmatter}
							href={`/project/${project.slug}`}
							slug={project.slug}
							typeLabel={toTitleCase(project.frontmatter.contentType)}
						/>
					))}
				</div>
				<PaginationControls
					basePath="/projects"
					currentPage={currentPage}
					totalPages={totalPages}
				/>
			</section>
		</DefaultLayout>
	);
}

export const getStaticPaths: GetStaticPaths = async () => {
	const totalPages = getTotalPages(getProjects().length);

	return {
		paths: Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
			params: {
				page: String(index + 2),
			},
		})),
		fallback: false,
	};
};

export const getStaticProps: GetStaticProps<ProjectsPageProps> = async ({
	params,
}) => {
	const projects = getProjects();
	const totalPages = getTotalPages(projects.length);
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
			projects: getPaginatedItems(projects, currentPage),
			currentPage,
			totalPages,
		},
	};
};
