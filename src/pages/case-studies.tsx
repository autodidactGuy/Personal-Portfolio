import type { GetStaticProps } from "next";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

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
        <div className="mb-10 space-y-4">
          <Chip
            classNames={{
              base: "border border-primary/20 bg-primary/10 text-primary",
              content: "font-medium uppercase tracking-[0.18em] text-[11px]",
            }}
            radius="full"
            size="sm"
            variant="flat"
          >
            Deep Dives
          </Chip>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Case Studies</h1>
          <p className="mt-3 max-w-2xl text-default-700">
            Structured narratives that connect technical execution, architecture decisions, and measurable outcomes.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {caseStudies.map((entry) => (
            <Card
              key={entry.slug}
              isBlurred
              className="group border border-default-200/80 bg-background/75 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
            >
              <CardHeader className="items-start justify-between gap-3 pb-0">
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-default-400">
                    Case Study
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {entry.frontmatter.title}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {entry.frontmatter.featured ? (
                    <Chip color="primary" radius="full" size="sm" variant="flat">
                      Featured
                    </Chip>
                  ) : null}
                  <div className="h-2.5 w-2.5 rounded-full bg-primary/75 shadow-[0_0_18px_rgba(0,114,245,0.35)]" />
                </div>
              </CardHeader>
              <CardBody className="gap-4 pt-3">
                <p className="text-default-700">{entry.frontmatter.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {entry.frontmatter.tags.map((tag) => (
                    <Chip key={tag} radius="full" size="sm" variant="flat">
                      {tag}
                    </Chip>
                  ))}
                </div>
                <Button
                  as={Link}
                  className="w-fit font-medium transition-transform duration-300 group-hover:translate-x-0.5"
                  color="primary"
                  href={`/case-studies/${entry.slug}`}
                  radius="full"
                  variant="flat"
                >
                  Read case study
                </Button>
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
