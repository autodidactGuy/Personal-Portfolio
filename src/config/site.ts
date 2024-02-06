export type SiteConfig = typeof siteConfig;

export const basePath = process.env.BASE_PATH;

export const siteConfig = {
	name: "Hassan Raza",
	description: "Software Engineer",
	navItems: [
		{
			label: "Home",
			href: "/",
		},
		{
			label: "About",
			href: "#/docs",
		},
		{
			label: "Skills",
			href: "#/skills",
		},
		{
			label: "Portfolio",
			href: "#/portfolio",
		},
		{
			label: "Recommendations",
			href: "#/recommendations",
		}
	],
	navMenuItems: [
		{
			label: "Home",
			href: "/",
		},
		{
			label: "About",
			href: "#/docs",
		},
		{
			label: "Skills",
			href: "#/skills",
		},
		{
			label: "Portfolio",
			href: "#/portfolio",
		},
		{
			label: "Recommendations",
			href: "#/recommendations",
		},
		{
			label: "Contact",
			href: "#/contact",
		}
	],
	links: {
		github: "https://github.com/autodidactGuy",
		twitter: "https://twitter.com/autodidactGuy",
		docs: "https://linkedin.com/in/autodidactGuy",
		resume: `${basePath}/HassanRaza-Resume.pdf`,
		linkedin: "https://linkedin.com/in/autodidactGuy",
		discord: "#",
		sponsor: "#"
	},
};