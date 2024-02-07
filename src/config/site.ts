export type SiteConfig = typeof siteConfig;

export const basePath = process.env.BASE_PATH;

export const siteConfig = {
	name: "Hassan Raza",
	initials: "HR",
	slogan: "Software Engineer",
	description: "Experienced software engineer with a diverse skill set and a proven track record of contributing to innovative solutions in the field. With a solid foundation in Java, JavaScript, TypeScript, and a wealth of experience in Spring Boot, Java, TypeScript, Node.js, React.js, RESTful APIs, Microservices, Angular, PHP, Laravel. I have consistently delivered high-quality software solutions.",
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
			label: "Praise",
			href: "#/praise",
		},
		{
			label: "Portfolio",
			href: "#/portfolio",
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
			label: "Praise",
			href: "#/praise",
		},
		{
			label: "Portfolio",
			href: "#/portfolio",
		},
		{
			label: "Contact",
			href: "/contact",
		}
	],
	links: {
		github: "https://github.com/autodidactGuy",
		twitter: "https://x.com/autodidactGuy",
		docs: "https://linkedin.com/in/autodidactGuy",
		resume: `${basePath}/HassanRaza-Resume.pdf`,
		linkedin: "https://linkedin.com/in/autodidactGuy",
		calendly: "https://calendly.com/autodidactGuy/15min",
		discord: "#",
		sponsor: "#"
	},
};