import {
	Button,
	Kbd,
	Link,
	Input,
	Navbar as NextUINavbar,
	NavbarContent,
	NavbarMenu,
	NavbarMenuToggle,
	NavbarBrand,
	NavbarItem,
	NavbarMenuItem,
	Avatar,
} from "@nextui-org/react";

import { link as linkStyles } from "@nextui-org/theme";

import { basePath, siteConfig } from "@/config/site";
import NextLink from "next/link";
import clsx from "clsx";

import { ThemeSwitch } from "@/components/theme-switch";
import {
	GithubIcon,
	SearchIcon,
} from "@/components/icons";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { MdMail } from "react-icons/md";

export const Navbar = () => {
	const searchInput = (
		<Input
			aria-label="Search"
			classNames={{
				inputWrapper: "bg-default-100",
				input: "text-sm",
			}}
			endContent={
				<Kbd className="hidden lg:inline-block" keys={["enter"]}>
				</Kbd>
			}
			labelPlacement="outside"
			placeholder="Search..."
			startContent={
				<SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />
			}
			type="search"
		/>
	);

	return (
		<NextUINavbar
			maxWidth="xl"
			position="sticky"
			classNames={{
				item: [
				"flex",
				"relative",
				"h-full",
				"items-center",
				"data-[active=true]:after:content-['']",
				"data-[active=true]:after:absolute",
				"data-[active=true]:after:bottom-0",
				"data-[active=true]:after:left-0",
				"data-[active=true]:after:right-0",
				"data-[active=true]:after:h-[2px]",
				"data-[active=true]:after:rounded-[2px]",
				"data-[active=true]:after:bg-primary",
				],
			}}>
			<NavbarContent className="basis-1/5 sm:basis-full" justify="start">
				<NavbarBrand className="gap-3 max-w-fit">
					<NextLink className="flex justify-start items-center gap-1" href="/">
						<Avatar src={`${basePath}/favicon.png`} name={siteConfig.initials} size="sm" />
						<p className="font-bold text-inherit ml-2">{siteConfig.name}</p>
					</NextLink>
				</NavbarBrand>
				<div className="hidden lg:flex gap-4 justify-start ml-2">
					{siteConfig.navItems.map((item) => (
						<NavbarItem key={item.href}>
							<NextLink
								className={clsx(
									linkStyles({ color: "foreground" }),
									"data-[active=true]:text-primary data-[active=true]:font-medium"
								)}
								color="foreground"
								href={item.href}
							>
								{item.label}
							</NextLink>
						</NavbarItem>
					))}
				</div>
			</NavbarContent>

      		<NavbarContent className="hidden sm:flex basis-1/5 sm:basis-full" justify="end">
				<NavbarItem className="hidden lg:flex gap-2">
					<Link isExternal href={siteConfig.links.linkedin}>
						<FaLinkedin className="text-default-500" size={24}/>
					</Link>
					<Link isExternal href={siteConfig.links.github}>
						<GithubIcon className="text-default-500" />
					</Link>
					<Link isExternal href={siteConfig.links.twitter}>
						<FaXTwitter className="text-default-500" size={24}/>
					</Link>
					<ThemeSwitch />
				</NavbarItem>
				<NavbarItem className="hidden lg:flex">{searchInput}</NavbarItem>
				<NavbarItem className="hidden lg:flex">
					<Button
						as={Link}
						className="text-sm font-normal text-default-600 bg-default-100"
						href="#/contact"
						startContent={<MdMail className="text-default-500" size={24}/>}
						variant="flat"
					>
						Contact
					</Button>
				</NavbarItem>
			</NavbarContent>

			<NavbarContent className="lg:hidden basis-1 pl-4" justify="end">
				<Link isExternal href={siteConfig.links.linkedin}>
					<FaLinkedin className="text-default-500" size={24}/>
				</Link>
				<Link isExternal href={siteConfig.links.github}>
					<GithubIcon className="text-default-500" />
				</Link>
				<Link isExternal href={siteConfig.links.twitter}>
					<FaXTwitter className="text-default-500" size={24}/>
				</Link>
				<ThemeSwitch />
				<NavbarMenuToggle />
      		</NavbarContent>

			<NavbarMenu>
				{searchInput}
				<div className="mx-4 mt-2 flex flex-col gap-2">
					{siteConfig.navMenuItems.map((item, index) => (
						<NavbarMenuItem key={`${item}-${index}`}>
							<Link
								color="foreground"
								href="#"
								size="lg"
							>
								{item.label}
							</Link>
						</NavbarMenuItem>
					))}
				</div>
			</NavbarMenu>
		</NextUINavbar>
	);
};
