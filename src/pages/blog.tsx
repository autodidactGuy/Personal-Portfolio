import type { GetStaticProps } from "next";

import { Chip } from "@nextui-org/react";

import { ContentCard } from "@/components/content-card";
import { getPosts } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { PostFrontmatter } from "@/types/content";

type BlogIndexProps = {
  posts: Array<{
    slug: string;
    frontmatter: PostFrontmatter;
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

        <div className="grid gap-5 md:grid-cols-2 xl:gap-6">
          {posts.map((post) => (
            <ContentCard
              key={post.slug}
              coverHeightClassName="h-44 transition-transform duration-500 group-hover:scale-[1.03]"
              frontmatter={post.frontmatter}
              href={`/blog/${post.slug}`}
              showMeta
              slug={post.slug}
            />
          ))}
        </div>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<BlogIndexProps> = async () => {
  return {
    props: {
      posts: getPosts(),
    },
  };
};
