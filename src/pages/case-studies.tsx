import type { GetStaticProps } from "next";

import Link from "next/link";
import { Card, CardBody } from "@nextui-org/react";

import { getCaseStudies } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { ContentFrontmatter } from "@/types/content";

type CaseStudiesPageProps = {
  caseStudies: Array<{
    slug: string;
    frontmatter: ContentFrontmatter;
  }>;
};

export default function CaseStudiesPage({ caseStudies }: CaseStudiesPageProps) {
  return (
    <DefaultLayout>
      <section className="mx-auto max-w-5xl py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-semibold">Case Studies</h1>
          <p className="mt-3 max-w-2xl text-default-700">
            Structured narratives that connect technical execution, architecture decisions, and measurable outcomes.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {caseStudies.map((entry) => (
            <Card key={entry.slug} className="border border-default-200">
              <CardBody className="gap-3">
                <h2 className="text-2xl font-semibold">{entry.frontmatter.title}</h2>
                <p className="text-default-700">{entry.frontmatter.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {entry.frontmatter.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-default-100 px-3 py-1 text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link className="text-sm font-medium text-primary" href={`/case-studies/${entry.slug}`}>
                  Read case study
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<CaseStudiesPageProps> = async () => {
  return {
    props: {
      caseStudies: getCaseStudies(),
    },
  };
};
