import { Chip } from "@heroui/react";
import NextLink from "next/link";
import { HiOutlineCommandLine } from "react-icons/hi2";
import { SocialLinks } from "@/components/social-links";
import { siteConfig } from "@/config/site";

export function Footer() {
	return (
		<footer className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
			<div className="mx-auto w-full max-w-7xl rounded-3xl bg-background px-5 py-5 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-5">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="space-y-2">
							<NextLink className="inline-block" href="/">
								<p className="text-lg font-semibold tracking-tight text-foreground">
									{siteConfig.name}
								</p>
								<p className="text-sm text-default-600 dark:text-default-400">
									{siteConfig.title}
								</p>
							</NextLink>
							{/* <p className="max-w-xl text-sm leading-6 text-default-600">{siteConfig.description}</p> */}
						</div>

						<SocialLinks />
					</div>

					<div className="flex flex-col gap-3 pt-4 text-sm text-default-600 dark:text-default-400 sm:flex-row sm:items-center sm:justify-between">
						<p>
							&copy; {new Date().getFullYear()} {siteConfig.name}. All rights
							reserved.
						</p>
						<Chip
							color="default"
							variant="soft"
							className="inline-flex items-center gap-2 border border-default-400/70 shadow-sm bg-content1/35 font-mono font-medium tracking-[0.01em] text-foreground backdrop-blur-sm"
						>
							<HiOutlineCommandLine className="shrink-0" size={18} />
							<Chip.Label>$ build systems --for clarity --at scale</Chip.Label>
						</Chip>
					</div>
				</div>
			</div>
		</footer>
	);
}
