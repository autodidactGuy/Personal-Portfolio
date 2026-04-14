import {
	Avatar,
	Button,
	Navbar as HeroNavbar,
	NavbarBrand,
	NavbarContent,
	NavbarItem,
	NavbarMenu,
	NavbarMenuItem,
	NavbarMenuToggle,
	SearchField,
} from "@heroui/react";
import clsx from "clsx";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MdMail } from "react-icons/md";
import { SocialLinks, SocialLinksCompact } from "@/components/social-links";
import { ThemeSwitch } from "@/components/theme-switch";
import { basePath, siteConfig } from "@/config/site";

const SEARCH_SYNC_EVENT = "portfolio-search-query-change";

export const Navbar = () => {
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
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

	useEffect(() => {
		const closeMenuOnRouteChange = () => {
			setIsMenuOpen(false);
		};

		router.events.on("routeChangeStart", closeMenuOnRouteChange);

		return () => {
			router.events.off("routeChangeStart", closeMenuOnRouteChange);
		};
	}, [router.events]);

	const renderSearchInput = (inputClassName?: string) => (
		<form action="/search" className={inputClassName} method="get">
			<SearchField aria-label="Search the site">
				<SearchField.Group>
					<SearchField.SearchIcon />
					<SearchField.Input
						aria-label="Search"
						className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-default-400 sm:text-sm"
						name="q"
						placeholder="Search..."
						type="search"
						value={isMounted ? searchQuery : ""}
						onChange={(event) => setSearchQuery(event.target.value)}
					/>
					<SearchField.ClearButton />
				</SearchField.Group>
			</SearchField>
		</form>
	);

	return (
		<HeroNavbar
			isBordered
			isMenuOpen={isMenuOpen}
			maxWidth="2xl"
			onMenuOpenChange={setIsMenuOpen}
			classNames={{
				base: clsx(
					"border-default-200/60 transition-colors duration-300",
					isScrolled
						? "bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
						: "bg-background",
				),
				wrapper: "px-4 py-3",
				menu: "bg-background/95 pb-6 pt-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85",
			}}
		>
			<NavbarContent className="gap-6" justify="start">
				<NavbarBrand>
					<NextLink className="flex items-center gap-2" href="/">
						<Avatar>
							<Avatar.Image
								alt={siteConfig.initials}
								src={`${basePath}/favicon.png`}
							/>
							<Avatar.Fallback>{siteConfig.initials}</Avatar.Fallback>
						</Avatar>
						<p className="truncate font-bold text-inherit">{siteConfig.name}</p>
					</NextLink>
				</NavbarBrand>

				{siteConfig.navItems.map((item) =>
					item.href === siteConfig.navigation.headerQuickLink.href ? null : (
						<NavbarItem key={item.href} className="hidden xl:flex">
							<NextLink
								className="text-md text-foreground transition-colors hover:text-primary"
								href={item.href}
							>
								{item.label}
							</NextLink>
						</NavbarItem>
					),
				)}
			</NavbarContent>

			<NavbarContent className="hidden gap-3 xl:flex" justify="end">
				<NavbarItem>
					<SocialLinks />
				</NavbarItem>
				<NavbarItem>
					<ThemeSwitch />
				</NavbarItem>
				<NavbarItem>{renderSearchInput("w-56")}</NavbarItem>
				<NavbarItem>
					<NextLink
						className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-white shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
						href={siteConfig.navigation.headerQuickLink.href}
					>
						<MdMail size={20} />
						{siteConfig.navigation.headerQuickLink.label}
					</NextLink>
				</NavbarItem>
			</NavbarContent>

			<NavbarContent className="gap-3 xl:hidden" justify="end">
				<NavbarItem>
					<SocialLinksCompact />
				</NavbarItem>
				<NavbarItem>
					<ThemeSwitch />
				</NavbarItem>
				<NavbarItem>
					<NavbarMenuToggle
						aria-controls="mobile-navigation-menu"
						aria-label="Toggle menu"
					/>
				</NavbarItem>
			</NavbarContent>

			<NavbarMenu id="mobile-navigation-menu">
				<div className="mx-auto w-full max-w-7xl space-y-4 px-2">
					{renderSearchInput("w-full")}
					<div className="space-y-3">
						{siteConfig.navMenuItems.map((item) =>
							item.href ===
							siteConfig.navigation.headerQuickLink.href ? null : (
								<NavbarMenuItem key={item.href}>
									<NextLink
										className="block text-md text-foreground"
										href={item.href}
										onClick={() => setIsMenuOpen(false)}
									>
										{item.label}
									</NextLink>
								</NavbarMenuItem>
							),
						)}
						<NavbarMenuItem>
							<NextLink
								className="block text-md text-foreground"
								href={siteConfig.navigation.headerQuickLink.href}
								onClick={() => setIsMenuOpen(false)}
							>
								{siteConfig.navigation.headerQuickLink.label}
							</NextLink>
						</NavbarMenuItem>
					</div>
					<Button
						as={NextLink}
						className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-white shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
						href={siteConfig.navigation.headerQuickLink.href}
						onClick={() => setIsMenuOpen(false)}
					>
						<MdMail size={20} />
						{siteConfig.navigation.headerQuickLink.label}
					</Button>
				</div>
			</NavbarMenu>
		</HeroNavbar>
	);
};
