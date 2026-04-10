import type { GetStaticPaths, GetStaticProps } from "next";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip } from "@nextui-org/react";
import { HiArrowLongLeft, HiOutlineCalendarDays } from "react-icons/hi2";

import { ContentCover } from "@/components/content-cover";
import { MDXRenderer } from "@/components/mdx/mdx-renderer";
import { compileMdx, getCollectionSlugs, getPostBySlug } from "@/lib/content";
import { formatIsoDate, getAbsoluteImageUrl, getGeneratedPostOgImage, getSeoImage, getSiteUrl } from "@/lib/seo";
import { toTitleCase } from "@/lib/string";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { PostContentTypeEnum, type PostFrontmatter } from "@/types/content";

type BlogPostPageProps = {
  post: {
    slug: string;
    frontmatter: PostFrontmatter;
  };
  source: MDXRemoteSerializeResult;
};

export default function BlogPostPage({ post, source }: BlogPostPageProps) {
  const isProject = post.frontmatter.contentType === PostContentTypeEnum.Project;
  const detailPath = isProject ? `/project/${post.slug}` : `/blog/${post.slug}`;
  const pageDescription = post.frontmatter.summary || siteConfig.description;
  const seoImage = getSeoImage(post.frontmatter.coverImage, getGeneratedPostOgImage(post.slug, isProject));

  return (
    <DefaultLayout
      seo={{
        title: `${post.frontmatter.title}`,
        description: pageDescription,
        pathname: `/blog/${post.slug}`,
        canonicalPathname: detailPath,
        image: seoImage,
        type: "article",
        publishedTime: formatIsoDate(post.frontmatter.date),
        tags: post.frontmatter.tags,
        noindex: isProject,
        structuredData: {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.frontmatter.title,
          description: pageDescription,
          datePublished: formatIsoDate(post.frontmatter.date),
          dateModified: formatIsoDate(post.frontmatter.date),
          image: getAbsoluteImageUrl(seoImage),
          author: {
            "@type": "Person",
            name: siteConfig.name,
            url: getSiteUrl("/about"),
          },
          publisher: {
            "@type": "Person",
            name: siteConfig.name,
            url: getSiteUrl("/"),
          },
          mainEntityOfPage: getSiteUrl(detailPath),
          keywords: post.frontmatter.tags.join(", "),
        },
      }}
    >
      <article className="mx-auto max-w-4xl py-10">
        <Card isBlurred className="overflow-hidden border border-default-200/80 bg-background/75 shadow-sm shadow-primary/5">
          <div className="relative overflow-hidden border-b border-default-200/70 bg-default-100/30">
            <ContentCover
              coverImage={post.frontmatter.coverImage}
              eyebrow={toTitleCase(post.frontmatter.contentType || "post")}
              heightClassName="h-[210px] sm:h-[250px]"
              subtitle={post.frontmatter.contentType}
              title={post.frontmatter.title}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>
          <CardHeader className="flex flex-col items-start gap-5 px-6 py-6 sm:px-8 sm:py-8">
            <Button
              as={Link}
              color="primary"
              href="/blog"
              radius="full"
              size="sm"
              startContent={<HiArrowLongLeft size={18} />}
              variant="flat"
            >
              Back to Blog
            </Button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-default-200/60 bg-default-100/25 px-2.5 py-1 text-xs font-medium text-default-500">
                <HiOutlineCalendarDays className="text-primary/75" size={13} />
                <span>
                  {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {siteConfig.githubHandle ? (
                  <>
                    <span className="h-1 w-1 rounded-full bg-default-300/90" />
                    <span>By @{siteConfig.githubHandle}</span>
                  </>
                ) : null}
              </div>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {post.frontmatter.title}
            </h1>
            <p className="max-w-3xl text-lg text-default-700">{post.frontmatter.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Chip radius="full" size="sm" variant="flat">
                {toTitleCase(post.frontmatter.contentType || "post")}
              </Chip>
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
    paths: getCollectionSlugs("posts").map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const slug = String(params?.slug);
  const post = getPostBySlug(slug);

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
