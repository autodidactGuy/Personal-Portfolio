import type { GetStaticPaths, GetStaticProps } from "next";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";

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
      <article className="mx-auto max-w-3xl py-10">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">
          {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <h1 className="mt-3 text-4xl font-semibold">{post.frontmatter.title}</h1>
        <p className="mt-4 text-lg text-default-700">{post.frontmatter.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {post.frontmatter.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-default-100 px-3 py-1 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-8">
          <MDXRenderer source={source} />
        </div>
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
