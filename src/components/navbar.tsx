import {
	Avatar,
	Button,
	Input,
	Kbd,
	Link,
	NavbarBrand,
	NavbarContent,
	NavbarItem,
	NavbarMenu,
	NavbarMenuItem,
	NavbarMenuToggle,
	Navbar as NextUINavbar,
} from "@heroui/react";
import { link as linkStyles } from "@heroui/theme";
import clsx from "clsx";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MdMail } from "react-icons/md";
import { SearchIcon } from "@/components/icons";
import { SocialLinks, SocialLinksCompact } from "@/components/social-links";
import { ThemeSwitch } from "@/components/theme-switch";
import { basePath, siteConfig } from "@/config/site";

const SEARCH_SYNC_EVENT = "portfolio-search-query-change";

export const Navbar = () => {
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const router = useRouter();

	useEffect(() => {
		setIsMounted(true);
		let frameId = 0;

		const handleScroll = () => {
			cancelAnimationFrame(frameId);
			frameId = window.requestAnimationFrame(() => {
				setIsScrolled(window.scrollY > 12);
			});
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => {
			cancelAnimationFrame(frameId);
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	useEffect(() => {
		const nextValue = typeof router.query.q === "string" ? router.query.q : "";
		setSearchQuery(nextValue);
	}, [router.query.q]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const handleSearchSync = (event: Event) => {
			const customEvent = event as CustomEvent<string>;
			setSearchQuery(customEvent.detail || "");
		};

		window.addEventListener(SEARCH_SYNC_EVENT, handleSearchSync);

		return () => {
			window.removeEventListener(SEARCH_SYNC_EVENT, handleSearchSync);
		};
	}, []);

	const renderSearchInput = (inputClassName?: string) => (
		<form action="/search" className={inputClassName} method="get">
			<Input
				aria-label="Search"
				classNames={{
					inputWrapper: "bg-default-100",
					input: "text-base sm:text-sm",
				}}
				endContent={
					<Kbd className="hidden lg:inline-block" keys={["enter"]}></Kbd>
				}
				labelPlacement="outside"
				name="q"
				placeholder="Search..."
				startContent={
					<SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />
				}
				type="search"
				value={isMounted ? searchQuery : ""}
				onValueChange={setSearchQuery}
			/>
		</form>
	);

	return (
		<NextUINavbar
			maxWidth="xl"
			position="static"
			classNames={{
				base: clsx(
					"z-40 border-b border-default-200/60 transition-colors duration-300",
					isScrolled
						? "bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
						: "bg-background",
				),
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
			}}
		>
			<NavbarContent
				as="ul"
				className="basis-1/5 list-none sm:basis-full"
				justify="start"
			>
				<NavbarBrand className="gap-3 max-w-fit">
					<NextLink className="flex justify-start items-center gap-1" href="/">
						<Avatar
							src={`${basePath}/favicon.png`}
							name={siteConfig.initials}
							size="sm"
						/>
						<p className="font-bold text-inherit ml-2">{siteConfig.name}</p>
					</NextLink>
				</NavbarBrand>
				{siteConfig.navItems.map((item) => (
					<NavbarItem key={item.href} className="hidden lg:flex">
						<NextLink
							className={clsx(
								linkStyles({ color: "foreground" }),
								"data-[active=true]:text-primary data-[active=true]:font-medium",
							)}
							color="foreground"
							href={item.href}
						>
							{item.label}
						</NextLink>
					</NavbarItem>
				))}
			</NavbarContent>

			<NavbarContent
				as="ul"
				className="hidden basis-1/5 list-none sm:flex sm:basis-full"
				justify="end"
			>
				<NavbarItem className="hidden lg:flex gap-2">
					<SocialLinks />
					<ThemeSwitch />
				</NavbarItem>
				<NavbarItem className="hidden lg:flex">
					{renderSearchInput("w-full")}
				</NavbarItem>
				<NavbarItem className="hidden lg:flex">
					<Button
						as={Link}
						className="text-sm font-normal text-default-600 bg-default-100"
						href={siteConfig.navigation.headerQuickLink.href}
						startContent={<MdMail className="text-default-500" size={20} />}
						variant="flat"
					>
						{siteConfig.navigation.headerQuickLink.label}
					</Button>
				</NavbarItem>
			</NavbarContent>

			<NavbarContent as="div" className="basis-1 pl-4 lg:hidden" justify="end">
				<SocialLinksCompact />
				<ThemeSwitch />
				<NavbarMenuToggle />
			</NavbarContent>

			<NavbarMenu>
				<NavbarMenuItem key="menu-search">
					{renderSearchInput("w-full")}
				</NavbarMenuItem>
				{siteConfig.navMenuItems.map((item) => (
					<NavbarMenuItem key={item.href}>
						<Link color="foreground" href={item.href} size="lg">
							{item.label}
						</Link>
					</NavbarMenuItem>
				))}
				{siteConfig.navigation.headerQuickLink?.href !== "/contact" && (
					<NavbarMenuItem key="header-quick-link">
						<Link
							color="foreground"
							href={siteConfig.navigation.headerQuickLink.href}
							size="lg"
						>
							{siteConfig.navigation.headerQuickLink.label}
						</Link>
					</NavbarMenuItem>
				)}
			</NavbarMenu>
		</NextUINavbar>
	);
};
