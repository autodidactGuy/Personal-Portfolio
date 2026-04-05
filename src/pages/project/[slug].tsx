import type { GetStaticPaths, GetStaticProps } from "next";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";

import { MDXRenderer } from "@/components/mdx/mdx-renderer";
import { compileMdx, getCollectionSlugs, getProjectBySlug } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { ContentFrontmatter } from "@/types/content";

type ProjectDetailProps = {
  project: {
    slug: string;
    frontmatter: ContentFrontmatter;
  };
  source: MDXRemoteSerializeResult;
};

export default function ProjectDetailPage({ project, source }: ProjectDetailProps) {
  return (
    <DefaultLayout>
      <article className="mx-auto max-w-3xl py-10">
        <h1 className="text-4xl font-semibold">{project.frontmatter.title}</h1>
        <p className="mt-4 text-lg text-default-700">{project.frontmatter.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {project.frontmatter.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-default-100 px-3 py-1 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-8">
          <MDXRenderer source={source} />
        </div>
      </article>
    </DefaultLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: getCollectionSlugs("projects").map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<ProjectDetailProps> = async ({ params }) => {
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
