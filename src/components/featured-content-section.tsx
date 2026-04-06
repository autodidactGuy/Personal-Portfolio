import { ContentCard } from "@/components/content-card";
import { HomeSectionHeader } from "@/components/home-section-header";
import type { ContentFrontmatter, PostFrontmatter } from "@/types/content";

type FeaturedContentSectionProps = {
  title: string;
  actionHref: string;
  actionLabel?: string;
  items: Array<{
    slug: string;
    frontmatter: ContentFrontmatter | PostFrontmatter;
  }>;
  getHref: (slug: string) => string;
  showMeta?: boolean;
  typeLabel?: string;
  sectionClassName?: string;
  cardsClassName?: string;
};

export function FeaturedContentSection({
  title,
  actionHref,
  actionLabel,
  items,
  getHref,
  showMeta = false,
  typeLabel,
  sectionClassName = "space-y-4",
  cardsClassName = "grid gap-4 lg:grid-cols-2",
}: FeaturedContentSectionProps) {
  return (
    <section className={sectionClassName}>
      <HomeSectionHeader actionHref={actionHref} actionLabel={actionLabel} title={title} />
      <div className={cardsClassName}>
        {items.map((item) => (
          <ContentCard
            key={item.slug}
            coverHeightClassName="h-44 transition-transform duration-500 group-hover:scale-[1.03]"
            frontmatter={item.frontmatter}
            href={getHref(item.slug)}
            showMeta={showMeta}
            slug={item.slug}
            typeLabel={typeLabel}
          />
        ))}
      </div>
    </section>
  );
}
