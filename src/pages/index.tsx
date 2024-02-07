import { Link } from "@nextui-org/link";
import { button as buttonStyles } from "@nextui-org/theme";
import { basePath, siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import { FaLinkedin } from "react-icons/fa6";
import { IoDocument } from "react-icons/io5";
import { Code, Snippet } from "@nextui-org/react";
import {Image} from "@nextui-org/react";
import { MdMail } from "react-icons/md";

export default function IndexPage() {
	return (
		<DefaultLayout>
			<section className="flex flex-col items-center justify-center gap-4 py-8 sm:py-40">
				<div className="contents lg:flex gap-6 places-items-center">
					<Image
						isBlurred
						alt="Hassan Raza"
						width={200}
						height={200}
						src={`${basePath}/favicon.png`}
					/>
					<div className="inline-block max-w-lg text-center lg:text-left justify-center">
						<h1 className={title()}>Crafting the next&nbsp;</h1><br/>
						<h1 className={title({ color: "blue" })}>wave of tech&nbsp;</h1>
						<h1 className={title()}>
							with cloud and software innovation.
						</h1>
						<h4 className={subtitle({ class: "mt-4" })}>
							Cloud Dreams: Coding Tomorrow&apos;s Reality.
						</h4>
					</div>
				</div>
				
				<div className="flex gap-3">
					<Link
						isExternal
						className={buttonStyles({ variant: "bordered", radius: "full" })}
						href={siteConfig.links.linkedin}
					>
						<FaLinkedin size={20} />
						LinkedIn
					</Link>
					{/* <Link
						isExternal
						className={buttonStyles({ variant: "bordered", radius: "full" })}
						href={siteConfig.links.github}
					>
						<GithubIcon size={20} />
						GitHub
					</Link> */}
					<Link
						isExternal
						href={siteConfig.links.resume}
						className={buttonStyles({
							color: "primary",
							radius: "full",
							variant: "solid",
						})}
					>
						<IoDocument size={20} />
						Resume
					</Link>
					<Link
						href="/contact"
						className={buttonStyles({
							radius: "full",
							variant: "bordered"
						})}
					>
						<MdMail size={20}/>
						Contact
					</Link>
				</div>

				{/* <div className="mt-8">
					<Snippet hideSymbol hideCopyButton variant="bordered">
						<span>
							Get started by editing <Code color="primary">pages/index.tsx</Code>
						</span>
					</Snippet>
				</div> */}
			</section>
		</DefaultLayout>
	);
}
