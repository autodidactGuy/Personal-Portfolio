import type { GetStaticProps } from "next";

import { Chip } from "@nextui-org/react";

import { ContentCard } from "@/components/content-card";
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
        <div className="grid gap-5 md:grid-cols-2 xl:gap-6">
          {projects.map((project) => (
            <ContentCard
              key={project.slug}
              coverHeightClassName="h-44 transition-transform duration-500 group-hover:scale-[1.03]"
              frontmatter={project.frontmatter}
              href={`/project/${project.slug}`}
              slug={project.slug}
              typeLabel="Project"
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
