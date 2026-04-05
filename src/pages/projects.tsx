import type { GetStaticProps } from "next";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

import { getProjects } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { ContentFrontmatter } from "@/types/content";

type ProjectsPageProps = {
  projects: Array<{
    slug: string;
    frontmatter: ContentFrontmatter;
  }>;
};

export default function ProjectsPage({ projects }: ProjectsPageProps) {
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
            Portfolio Work
          </Chip>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Projects</h1>
          <p className="mt-3 max-w-2xl text-default-700">
            Long-form project entries authored in MDX so the implementation story can evolve without touching UI code.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.slug}
              isBlurred
              className="group border border-default-200/80 bg-background/75 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
            >
              <CardHeader className="items-start justify-between gap-3 pb-0">
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-default-400">
                    Project
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {project.frontmatter.title}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {project.frontmatter.featured ? (
                    <Chip color="primary" radius="full" size="sm" variant="flat">
                      Featured
                    </Chip>
                  ) : null}
                  <div className="h-2.5 w-2.5 rounded-full bg-primary/75 shadow-[0_0_18px_rgba(0,114,245,0.35)]" />
                </div>
              </CardHeader>
              <CardBody className="gap-4 pt-3">
                <p className="text-default-700">{project.frontmatter.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {project.frontmatter.tags.map((tag) => (
                    <Chip key={tag} radius="full" size="sm" variant="flat">
                      {tag}
                    </Chip>
                  ))}
                </div>
                <Button
                  as={Link}
                  className="w-fit font-medium transition-transform duration-300 group-hover:translate-x-0.5"
                  color="primary"
                  href={`/project/${project.slug}`}
                  radius="full"
                  variant="flat"
                >
                  Read project
                </Button>
              </CardBody>
            </Card>
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
