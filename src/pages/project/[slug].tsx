import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";
import type { GetStaticPaths, GetStaticProps } from "next";

import Link from "next/link";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import { HiArrowSmLeft } from "react-icons/hi";
import { ContentCover } from "@/components/content-cover";
import { MDXRenderer } from "@/components/mdx/mdx-renderer";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { compileMdx, getProjectBySlug, getProjectSlugs } from "@/lib/content";
import {
	getAbsoluteImageUrl,
	getGeneratedPostOgImage,
	getSeoImage,
	getSiteUrl,
} from "@/lib/seo";
import { toTitleCase } from "@/lib/string";
import { type ContentFrontmatter, PostContentTypeEnum } from "@/types/content";

type ProjectDetailProps = {
	project: {
		slug: string;
		frontmatter: ContentFrontmatter;
	};
	source: MDXRemoteSerializeResult;
};

export default function ProjectDetailPage({
	project,
	source,
}: ProjectDetailProps) {
	const pageDescription = project.frontmatter.summary || siteConfig.description;
	const seoImage = getSeoImage(
		project.frontmatter.coverImage,
		getGeneratedPostOgImage(project.slug, true),
	);

	return (
		<DefaultLayout
			seo={{
				title: `${project.frontmatter.title}`,
				description: pageDescription,
				pathname: `/project/${project.slug}`,
				canonicalPathname: `/project/${project.slug}`,
				image: seoImage,
				type: "article",
				tags: project.frontmatter.tags,
				structuredData: {
					"@context": "https://schema.org",
					"@type": "CreativeWork",
					name: project.frontmatter.title,
					description: pageDescription,
					image: getAbsoluteImageUrl(seoImage),
					url: getSiteUrl(`/project/${project.slug}`),
					author: {
						"@type": "Person",
						name: siteConfig.name,
						url: getSiteUrl("/about"),
					},
					keywords: project.frontmatter.tags.join(", "),
				},
			}}
		>
			<article className="mx-auto max-w-4xl py-10">
				<Button
					as={Link}
					color="primary"
					href="/projects"
					radius="full"
					size="sm"
					className="mb-5"
					startContent={<HiArrowSmLeft size={18} />}
					variant="flat"
				>
					Back to Projects
				</Button>
				<Card className="overflow-hidden border border-default-200/80 bg-content1/85 shadow-sm shadow-primary/5 dark:bg-content1/72">
					<div className="relative overflow-hidden border-b border-default-200/70 bg-content1/65 dark:bg-content1/55">
						<ContentCover
							coverImage={project.frontmatter.coverImage}
							eyebrow={toTitleCase(PostContentTypeEnum.Project)}
							heightClassName="h-[210px] sm:h-[250px]"
							title={project.frontmatter.title}
						/>
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
					</div>
					<CardHeader className="flex flex-col items-start gap-5 px-6 py-6 sm:px-8 sm:py-8">
						{/* <Chip
              classNames={{
                base: "border border-primary/20 bg-primary/10 text-primary",
                content: "font-medium uppercase tracking-[0.18em] text-[11px]",
              }}
              radius="full"
              size="sm"
              variant="flat"
            >
              Project
            </Chip> */}
						<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
							{project.frontmatter.title}
						</h1>
						<p className="max-w-3xl text-lg text-default-700">
							{project.frontmatter.summary}
						</p>
						<div className="flex flex-wrap gap-2">
							{project.frontmatter.tags.map((tag) => (
								<Chip key={tag} radius="full" size="sm" variant="flat">
									{tag}
								</Chip>
							))}
						</div>
					</CardHeader>
					<CardBody className="px-6 pb-8 pt-0 sm:px-8">
						<MDXRenderer source={source} />
					</CardBody>
				</Card>
			</article>
		</DefaultLayout>
	);
}

export const getStaticPaths: GetStaticPaths = async () => {
	return {
		paths: getProjectSlugs().map((slug) => ({
			params: { slug },
		})),
		fallback: false,
	};
};

export const getStaticProps: GetStaticProps<ProjectDetailProps> = async ({
	params,
}) => {
	const slug = String(params?.slug);
	const project = getProjectBySlug(slug);

	return {
		props: {
			project: {
				slug: project.slug,
				frontmatter: project.frontmatter,
			},
			source: await compileMdx(project.content),
		},
	};
};
