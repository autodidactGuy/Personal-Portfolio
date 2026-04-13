import type { GetStaticProps } from "next";

import { ContentCard } from "@/components/content-card";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getProjects } from "@/lib/content";
import { getGeneratedPageOgImage, getSeoImage, getSiteUrl } from "@/lib/seo";
import { toTitleCase } from "@/lib/string";
import type { PostFrontmatter } from "@/types/content";

type ProjectsPageProps = {
	projects: Array<{
		slug: string;
		frontmatter: PostFrontmatter;
	}>;
};

export default function ProjectsPage({ projects }: ProjectsPageProps) {
	const pageDescription =
		"Systems I've built, explained through real-world case studies.";

	return (
		<DefaultLayout
			seo={{
				title: `Projects`,
				description: pageDescription,
				pathname: "/projects",
				image: getSeoImage(getGeneratedPageOgImage("projects")),
				structuredData: {
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: `${siteConfig.name} Projects`,
					url: getSiteUrl("/projects"),
					description: pageDescription,
					mainEntity: {
						"@type": "ItemList",
						itemListElement: projects.map((project, index) => ({
							"@type": "ListItem",
							position: index + 1,
							url: getSiteUrl(`/project/${project.slug}`),
							name: project.frontmatter.title,
						})),
					},
				},
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
            Portfolio Work
          </Chip> */}
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
			</section>
		</DefaultLayout>
	);
}

export const getStaticProps: GetStaticProps<ProjectsPageProps> = async () => {
	return {
		props: {
			projects: getProjects(),
		},
	};
};
