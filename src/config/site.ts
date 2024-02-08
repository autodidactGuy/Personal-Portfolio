export type SiteConfig = typeof siteConfig;

export const basePath = process.env.BASE_PATH;

export const siteConfig = {
	name: "Hassan Raza",
	initials: "HR",
	title: "Software Engineer",
	slogan: "Tech Artisan: Excellence Reimagined",
	description: "Experienced software engineer with a diverse skill set and a proven track record of contributing to innovative solutions in the field. With a solid foundation in Java, JavaScript, TypeScript, and a wealth of experience in Spring Boot, Java, TypeScript, Node.js, React.js, RESTful APIs, Microservices, Angular, PHP, Laravel. I have consistently delivered high-quality software solutions.",
	experience: [
		{
			title: "Software Development Engineer II",
			company: "Amazon Inc",
			companyComments: "Contracted via Insight Global",
			location: "Seattle, Washington",
			from: "05 / 2023",
			to: "01 / 2024",
			image: `${basePath}/experience/amazon.svg`
		},
		{
			title: "Full Stack Developer",
			company: "ThinkGeniux Private Limited",
			companyComments: "",
			location: "Lahore, Pakistan",
			from: "10 / 2018",
			to: "07 / 2022",
			image: `${basePath}/experience/tgx.png`
		},
		{
			title: "Web App Developer",
			company: "Metologix Private Limited",
			companyComments: "",
			location: "Lahore, Pakistan",
			from: "08 / 2016",
			to: "09 / 2018",
			image: `${basePath}/experience/metologix.png`
		}
	],
	education: [
		{
			degree: "Masters of Science in Computer Science",
			institute: "Maharishi International University",
			location: "Fairfield, Iowa",
			from: "08 / 2022",
			to: "04 / 2024",
			result: "3.95",
			image: `${basePath}/education/miu.png`
		},
		{
			degree: "Bachelors of Science in Computer Science",
			institute: "The University of Lahore",
			location: "Lahore, Pakistan",
			from: "09 / 2015",
			to: "03 / 2019",
			result: "3.83",
			image: `${basePath}/education/uol.png`
		},
	],
	navItems: [
		{
			label: "Home",
			href: "/",
		},
		{
			label: "About",
			href: "/about",
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
			href: "/about",
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