import { basePath, withBasePath } from "@/lib/base-path";
import { type SiteSettings, siteSettingsSchema } from "@/types/content";
import siteSettingsJson from "../../content/settings/site.json";

const siteSettings = siteSettingsSchema.parse(siteSettingsJson);

export type SiteConfig = SiteSettings;
export { basePath, withBasePath };

function getGithubHandle(githubUrl: string) {
	try {
		const pathname = new URL(githubUrl).pathname.split("/").filter(Boolean)[0];

		return pathname || null;
	} catch {
		return null;
	}
}

const githubHandle = getGithubHandle(siteSettings.links.github);

export const siteConfig: SiteSettings & {
	navItems: SiteSettings["navigation"]["primary"];
	navMenuItems: SiteSettings["navigation"]["primary"];
	githubHandle: string | null;
} = {
	...siteSettings,
	links: {
		...siteSettings.links,
		resume: withBasePath(siteSettings.links.resume),
	},
	navItems: siteSettings.navigation.primary,
	navMenuItems: siteSettings.navigation.primary,
	githubHandle,
};
