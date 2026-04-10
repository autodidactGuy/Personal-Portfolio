import { z } from "zod";

import { isContentIconId } from "@/config/content-icons";

function normalizeDateInput(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

export const navigationItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const siteSettingsSchema = z.object({
  siteUrl: z.string().url(),
  name: z.string().min(1),
  initials: z.string().min(1),
  title: z.string().min(1),
  slogan: z.string().min(1),
  description: z.string().min(1),
  avatar: z.string().min(1),
  comingSoonMode: z.object({
    enabled: z.boolean().default(false),
    headline: z.string().min(1).default("Coming Soon"),
    description: z.string().min(1).default("A refreshed experience is on the way."),
  }),
  navigation: z.object({
    primary: z.array(navigationItemSchema).min(1),
    headerQuickLink: z.object({
      label: z.string().min(1),
      icon: z.string().refine(isContentIconId, "Invalid content icon id. Use pack:name format.").optional(),
      href: z.string().min(1),
    }),
  }),
  links: z.object({
    github: z.string().url(),
    twitter: z.string().url(),
    linkedin: z.string().url(),
    resume: z.string().min(1),
    calendly: z.string().url(),
  }),
});

export const contactSettingsSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  formHeading: z.string().min(1),
  scheduleHeading: z.string().min(1),
});

export const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  external: z.boolean().optional(),
});

export const homeHeroSchema = z.object({
  eyebrow: z.string().min(1),
  headline: z.string().min(1),
  highlightedText: z.string().min(1),
  supportingText: z.string().min(1),
  image: z.string().min(1),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema,
});

export const homeStatsSchema = z.object({
  title: z.string().min(1),
  badgeLabel: z.string().min(1),
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .min(1),
});

export const featuredFocusSchema = z.object({
  sectionLabel: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  pillars: z.array(z.string().min(1)).min(1),
  cta: ctaSchema.pick({ label: true, href: true }),
});

export const recommendationsSchema = z.object({
  title: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        quote: z.string().min(1),
        featured: z.boolean().default(false),
      })
    )
    .min(1),
});

export const aboutProfileSchema = z.object({
  pageLabel: z.string().min(1),
  pageTitle: z.string().min(1),
  pageDescription: z.string().min(1),
  aboutSectionTitle: z.string().min(1),
  aboutSectionSubtitle: z.string().min(1),
  summaryLabel: z.string().min(1),
  headline: z.string().min(1),
  summary: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
  photo: z.string().min(1),
  experienceTitle: z.string().min(1),
  experienceSubtitle: z.string().min(1),
  educationTitle: z.string().min(1),
  educationSubtitle: z.string().min(1),
});

export const experienceItemSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  companyComments: z.string().default(""),
  location: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  image: z.string().min(1),
});

export const educationItemSchema = z.object({
  degree: z.string().min(1),
  institute: z.string().min(1),
  location: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  result: z.string().min(1),
  image: z.string().min(1),
});

export const experienceListSchema = z.object({
  items: z.array(experienceItemSchema).min(1),
});

export const educationListSchema = z.object({
  items: z.array(educationItemSchema).min(1),
});

export const contentFrontmatterSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().default(""),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  body: z.string().optional(),
});

export enum PostContentTypeEnum {
  Article = "article",
  Note = "note",
  CaseStudy = "case-study",
  Tutorial = "tutorial",
  Announcement = "announcement",
  News = "news",
  Project = "project",
  Other = "other",
}

export const postContentTypeSchema = z.nativeEnum(PostContentTypeEnum);

export const normalizedDateStringSchema = z.preprocess(
  normalizeDateInput,
  z.string().min(1)
);

export const postFrontmatterSchema = contentFrontmatterSchema.extend({
  date: normalizedDateStringSchema,
  contentType: postContentTypeSchema,
});

export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type ContactSettings = z.infer<typeof contactSettingsSchema>;
export type HomeHero = z.infer<typeof homeHeroSchema>;
export type HomeStats = z.infer<typeof homeStatsSchema>;
export type FeaturedFocus = z.infer<typeof featuredFocusSchema>;
export type Recommendations = z.infer<typeof recommendationsSchema>;
export type AboutProfile = z.infer<typeof aboutProfileSchema>;
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type ExperienceList = z.infer<typeof experienceListSchema>;
export type EducationList = z.infer<typeof educationListSchema>;
export type ContentFrontmatter = z.infer<typeof contentFrontmatterSchema>;
export type PostContentType = z.infer<typeof postContentTypeSchema>;
export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

export type ContentCollection = "posts";

export type ContentEntry<TFrontmatter> = {
  slug: string;
  frontmatter: TFrontmatter;
  content: string;
};
