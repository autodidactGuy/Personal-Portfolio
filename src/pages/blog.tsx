import type { GetStaticProps } from "next";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

import { getAllPosts } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { BlogFrontmatter } from "@/types/content";

type BlogIndexProps = {
  posts: Array<{
    slug: string;
    frontmatter: BlogFrontmatter;
  }>;
};

export default function BlogIndex({ posts }: BlogIndexProps) {
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
            Writing
          </Chip>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Blog</h1>
          <p className="mt-3 max-w-2xl text-default-700">
            Technical writing, architecture notes, and portfolio narratives managed through MDX and Decap CMS.
          </p>
        </div>

        <div className="grid gap-4">
          {posts.map((post) => (
            <Card
              key={post.slug}
              isBlurred
              className="group border border-default-200/80 bg-background/75 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
            >
              <CardHeader className="items-start justify-between gap-3 pb-0">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.2em] text-primary">
                    {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">{post.frontmatter.title}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {post.frontmatter.featured ? (
                    <Chip color="primary" radius="full" size="sm" variant="flat">
                      Featured
                    </Chip>
                  ) : null}
                  <div className="h-2.5 w-2.5 rounded-full bg-primary/75 shadow-[0_0_18px_rgba(0,114,245,0.35)]" />
                </div>
              </CardHeader>
              <CardBody className="gap-4 pt-3">
                <p className="text-default-700">{post.frontmatter.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {post.frontmatter.tags.map((tag) => (
                    <Chip key={tag} radius="full" size="sm" variant="flat">
                      {tag}
                    </Chip>
                  ))}
                </div>
                <Button
                  as={Link}
                  className="w-fit font-medium transition-transform duration-300 group-hover:translate-x-0.5"
                  color="primary"
                  href={`/blog/${post.slug}`}
                  radius="full"
                  variant="flat"
                >
                  Read article
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<BlogIndexProps> = async () => {
  return {
    props: {
      posts: getAllPosts(),
    },
  };
};
