import type { GetStaticProps } from "next";

import Link from "next/link";
import { Card, CardBody } from "@nextui-org/react";

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
        <div className="mb-10">
          <h1 className="text-4xl font-semibold">Blog</h1>
          <p className="mt-3 max-w-2xl text-default-700">
            Technical writing, architecture notes, and portfolio narratives managed through MDX and Decap CMS.
          </p>
        </div>

        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.slug} className="border border-default-200">
              <CardBody className="gap-3">
                <p className="text-sm uppercase tracking-[0.2em] text-primary">
                  {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <h2 className="text-2xl font-semibold">{post.frontmatter.title}</h2>
                <p className="text-default-700">{post.frontmatter.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {post.frontmatter.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-default-100 px-3 py-1 text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link className="text-sm font-medium text-primary" href={`/blog/${post.slug}`}>
                  Read article
                </Link>
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
