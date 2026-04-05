import type { GetStaticPaths, GetStaticProps } from "next";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

import { MDXRenderer } from "@/components/mdx/mdx-renderer";
import { compileMdx, getBlogPostBySlug, getCollectionSlugs } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { BlogFrontmatter } from "@/types/content";

type BlogPostPageProps = {
  post: {
    slug: string;
    frontmatter: BlogFrontmatter;
  };
  source: MDXRemoteSerializeResult;
};

export default function BlogPostPage({ post, source }: BlogPostPageProps) {
  return (
    <DefaultLayout>
      <article className="mx-auto max-w-4xl py-10">
        <Card isBlurred className="border border-default-200/80 bg-background/75 shadow-sm shadow-primary/5">
          <CardHeader className="flex flex-col items-start gap-5 px-6 py-6 sm:px-8 sm:py-8">
            <Button
              as={Link}
              color="primary"
              href="/blog"
              radius="full"
              size="sm"
              variant="flat"
            >
              Back to Blog
            </Button>
            <p className="text-sm uppercase tracking-[0.2em] text-primary">
              {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {post.frontmatter.title}
            </h1>
            <p className="max-w-3xl text-lg text-default-700">{post.frontmatter.summary}</p>
            <div className="flex flex-wrap gap-2">
              {post.frontmatter.tags.map((tag) => (
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
    paths: getCollectionSlugs("blog").map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const slug = String(params?.slug);
  const post = getBlogPostBySlug(slug);

  return {
    props: {
      post: {
        slug: post.slug,
        frontmatter: post.frontmatter,
      },
      source: await compileMdx(post.content),
    },
  };
};
