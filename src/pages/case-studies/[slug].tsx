import type { GetStaticPaths, GetStaticProps } from "next";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";

import { MDXRenderer } from "@/components/mdx/mdx-renderer";
import { compileMdx, getCaseStudyBySlug, getCollectionSlugs } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { ContentFrontmatter } from "@/types/content";

type CaseStudyDetailProps = {
  caseStudy: {
    slug: string;
    frontmatter: ContentFrontmatter;
  };
  source: MDXRemoteSerializeResult;
};

export default function CaseStudyDetailPage({ caseStudy, source }: CaseStudyDetailProps) {
  return (
    <DefaultLayout>
      <article className="mx-auto max-w-3xl py-10">
        <h1 className="text-4xl font-semibold">{caseStudy.frontmatter.title}</h1>
        <p className="mt-4 text-lg text-default-700">{caseStudy.frontmatter.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {caseStudy.frontmatter.tags.map((tag) => (
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
    paths: getCollectionSlugs("case-studies").map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<CaseStudyDetailProps> = async ({ params }) => {
  const slug = String(params?.slug);
  const caseStudy = getCaseStudyBySlug(slug);

  return {
    props: {
      caseStudy: {
        slug: caseStudy.slug,
        frontmatter: caseStudy.frontmatter,
      },
      source: await compileMdx(caseStudy.content),
    },
  };
};
