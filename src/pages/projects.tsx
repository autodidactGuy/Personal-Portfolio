import type { GetStaticProps } from "next";

import Link from "next/link";
import { Card, CardBody } from "@nextui-org/react";

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
        <div className="mb-10">
          <h1 className="text-4xl font-semibold">Projects</h1>
          <p className="mt-3 max-w-2xl text-default-700">
            Long-form project entries authored in MDX so the implementation story can evolve without touching UI code.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.slug} className="border border-default-200">
              <CardBody className="gap-3">
                <h2 className="text-2xl font-semibold">{project.frontmatter.title}</h2>
                <p className="text-default-700">{project.frontmatter.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {project.frontmatter.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-default-100 px-3 py-1 text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link className="text-sm font-medium text-primary" href={`/project/${project.slug}`}>
                  Read project
                </Link>
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
