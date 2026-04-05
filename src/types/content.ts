import { z } from "zod";

export const navigationItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const siteSettingsSchema = z.object({
  name: z.string().min(1),
  initials: z.string().min(1),
  title: z.string().min(1),
  slogan: z.string().min(1),
  description: z.string().min(1),
  avatar: z.string().min(1),
  navigation: z.object({
    primary: z.array(navigationItemSchema).min(1),
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
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .min(1),
});

export const proposedEndeavorSchema = z.object({
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
      })
    )
    .min(1),
});

export const aboutProfileSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
  photo: z.string().min(1),
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
  coverImage: z.string().min(1).default("/favicon.png"),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  body: z.string().optional(),
});

export const blogFrontmatterSchema = contentFrontmatterSchema.extend({
  date: z.string().min(1),
});

export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type ContactSettings = z.infer<typeof contactSettingsSchema>;
export type HomeHero = z.infer<typeof homeHeroSchema>;
export type HomeStats = z.infer<typeof homeStatsSchema>;
export type ProposedEndeavor = z.infer<typeof proposedEndeavorSchema>;
export type Recommendations = z.infer<typeof recommendationsSchema>;
export type AboutProfile = z.infer<typeof aboutProfileSchema>;
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type ExperienceList = z.infer<typeof experienceListSchema>;
export type EducationList = z.infer<typeof educationListSchema>;
export type ContentFrontmatter = z.infer<typeof contentFrontmatterSchema>;
export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

export type ContentCollection = "blog" | "projects" | "case-studies";

export type ContentEntry<TFrontmatter> = {
  slug: string;
  frontmatter: TFrontmatter;
  content: string;
};
