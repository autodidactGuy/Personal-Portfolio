import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip, Tooltip } from "@nextui-org/react";
import { HiOutlineCalendarDays, HiStar } from "react-icons/hi2";

import { ContentCover } from "@/components/content-cover";
import { siteConfig } from "@/config/site";
import { toTitleCase } from "@/lib/string";
import type { ContentFrontmatter, PostFrontmatter } from "@/types/content";

type ContentCardFrontmatter = ContentFrontmatter | PostFrontmatter;

type ContentCardProps = {
  slug: string;
  frontmatter: ContentCardFrontmatter;
  href: string;
  typeLabel?: string;
  showMeta?: boolean;
  coverHeightClassName?: string;
};

function isPostFrontmatter(frontmatter: ContentCardFrontmatter): frontmatter is PostFrontmatter {
  return "date" in frontmatter || "contentType" in frontmatter;
}

function getTypeLabel(frontmatter: ContentCardFrontmatter, typeLabel?: string) {
  if (typeLabel) {
    return typeLabel;
  }

  if (isPostFrontmatter(frontmatter)) {
    return toTitleCase(frontmatter.contentType || "post");
  }

  return "Content";
}

export function ContentCard({
  slug,
  frontmatter,
  href,
  typeLabel,
  showMeta = false,
  coverHeightClassName = "h-44 transition-transform duration-500 group-hover:scale-[1.03]",
}: ContentCardProps) {
  const displayTypeLabel = getTypeLabel(frontmatter, typeLabel);
  const shouldShowMeta = showMeta && isPostFrontmatter(frontmatter);

  return (
    <Card
      key={slug}
      isBlurred
      className="group h-full overflow-hidden border border-default-200/80 bg-background/75 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="relative overflow-hidden border-b border-default-200/70 bg-default-100/30">
        <ContentCover
          coverImage={frontmatter.coverImage}
          eyebrow={displayTypeLabel}
          heightClassName={coverHeightClassName}
          title={frontmatter.title}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
      <CardHeader className="items-start justify-between gap-3 pb-0 pt-5">
        <div className="space-y-2">
          <p className="text-xl font-semibold tracking-tight">{frontmatter.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Chip
            classNames={{
              base: "border border-primary/20 bg-primary/10 text-primary",
              content: "font-medium uppercase tracking-[0.18em] text-[11px]",
            }}
            radius="full"
            size="sm"
            variant="flat"
          >
            {displayTypeLabel}
          </Chip>
          {frontmatter.featured ? (
            <Tooltip content="Featured" delay={150}>
              <span className="inline-flex h-8 w-8 items-center justify-center text-primary transition-transform duration-300 group-hover:scale-110">
                <HiStar className="drop-shadow-[0_0_10px_rgba(0,114,245,0.28)]" size={16} />
              </span>
            </Tooltip>
          ) : null}
          {/* <div className="h-2.5 w-2.5 rounded-full bg-primary/75 shadow-[0_0_18px_rgba(0,114,245,0.35)]" /> */}
        </div>
      </CardHeader>
      <CardBody className="gap-4 pb-3 pt-3">
        <p className="text-default-700">{frontmatter.summary}</p>
        <div className=" flex flex-col items-start gap-4 pt-2">
          {shouldShowMeta ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-default-200/60 bg-default-100/25 px-2.5 py-0.5 text-[11px] font-medium text-default-500">
                  <HiOutlineCalendarDays className="text-primary/75" size={12} />
                  <span>
                    {new Date(frontmatter.date).toLocaleDateString("en-US", {
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
          ) : null}
          <div className="flex flex-wrap gap-2">  
            {frontmatter.tags.map((tag) => (
              <Chip key={tag} radius="full" size="sm" variant="flat">
                {tag}
              </Chip>
            ))}
          </div>
          <Button
            as={Link}
            className="w-fit font-medium transition-transform duration-300 group-hover:translate-x-0.5"
            color="primary"
            href={href}
            radius="full"
            variant="flat"
          >
            Read more
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
