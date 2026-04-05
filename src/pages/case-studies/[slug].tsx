import type { GetStaticPaths, GetStaticProps } from "next";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

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
      <article className="mx-auto max-w-4xl py-10">
        <Card isBlurred className="border border-default-200/80 bg-background/75 shadow-sm shadow-primary/5">
          <CardHeader className="flex flex-col items-start gap-5 px-6 py-6 sm:px-8 sm:py-8">
            <Button
              as={Link}
              color="primary"
              href="/case-studies"
              radius="full"
              size="sm"
              variant="flat"
            >
              Back to Case Studies
            </Button>
            <Chip
              classNames={{
                base: "border border-primary/20 bg-primary/10 text-primary",
                content: "font-medium uppercase tracking-[0.18em] text-[11px]",
              }}
              radius="full"
              size="sm"
              variant="flat"
            >
              Case Study
            </Chip>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {caseStudy.frontmatter.title}
            </h1>
            <p className="max-w-3xl text-lg text-default-700">{caseStudy.frontmatter.summary}</p>
            <div className="flex flex-wrap gap-2">
              {caseStudy.frontmatter.tags.map((tag) => (
                <Chip key={tag} radius="full" size="sm" variant="flat">
                  {tag}
                </Chip>
              ))}
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-8 pt-2 sm:px-8">
            <MDXRenderer source={source} />
          </CardBody>
        </Card>
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
