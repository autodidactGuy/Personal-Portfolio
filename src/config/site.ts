import siteSettingsJson from "../../content/settings/site.json";

import { basePath, withBasePath } from "@/lib/base-path";
import { siteSettingsSchema, type SiteSettings } from "@/types/content";

const siteSettings = siteSettingsSchema.parse(siteSettingsJson);

export type SiteConfig = SiteSettings;
export { basePath, withBasePath };

export const siteConfig: SiteSettings & {
  navItems: SiteSettings["navigation"]["primary"];
  navMenuItems: SiteSettings["navigation"]["primary"];
} = {
  ...siteSettings,
  links: {
    ...siteSettings.links,
    resume: withBasePath(siteSettings.links.resume),
  },
  navItems: siteSettings.navigation.primary,
  navMenuItems: siteSettings.navigation.primary,
};
