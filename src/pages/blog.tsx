import type { GetStaticProps } from "next";

import { Chip } from "@heroui/react";

import { ContentCard } from "@/components/content-card";
import { siteConfig } from "@/config/site";
import { getPosts } from "@/lib/content";
import { getGeneratedPageOgImage, getSeoImage, getSiteUrl } from "@/lib/seo";
import DefaultLayout from "@/layouts/default";
import { PostContentTypeEnum, type PostFrontmatter } from "@/types/content";

type BlogIndexProps = {
  posts: Array<{
    slug: string;
    frontmatter: PostFrontmatter;
  }>;
};

export default function BlogIndex({ posts }: BlogIndexProps) {
  const pageDescription =
    "Technical writing, architecture notes, and portfolio narratives managed through MDX and Decap CMS.";

  return (
    <DefaultLayout
      seo={{
        title: `Blog`,
        description: pageDescription,
        pathname: "/blog",
        image: getSeoImage(posts[0]?.frontmatter.coverImage, getGeneratedPageOgImage("blog")),
        structuredData: [
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: `${siteConfig.name} Blog`,
            url: getSiteUrl("/blog"),
            description: pageDescription,
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${siteConfig.name} Writing`,
            url: getSiteUrl("/blog"),
            description: pageDescription,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: posts.map((post, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: getSiteUrl(
                  post.frontmatter.contentType === PostContentTypeEnum.Project
                    ? `/project/${post.slug}`
                    : `/blog/${post.slug}`
                ),
                name: post.frontmatter.title,
              })),
            },
          },
        ],
      }}
    >
      <section className="mx-auto max-w-5xl py-10">
        <div className="mb-10 space-y-4">
          <Chip
            classNames={{
              base: "border border-primary/20 bg-primary/10 text-primary",
              content: "font-medium uppercase tracking-[0.10em] text-[11px]",
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
              href={
                post.frontmatter.contentType === PostContentTypeEnum.Project
                  ? `/project/${post.slug}`
                  : `/blog/${post.slug}`
              }
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
