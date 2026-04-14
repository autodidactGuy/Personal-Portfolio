import { Avatar, Button, SearchField } from "@heroui/react";
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

	const renderSearchInput = (inputClassName?: string) => (
		<form action="/search" className={inputClassName} method="get">
			<SearchField>
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
		<nav
			className={clsx(
				"z-40 border-b border-default-200/60 transition-colors duration-300",
				isScrolled
					? "bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
					: "bg-background",
			)}
		>
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
				<div className="flex min-w-0 items-center gap-6">
					<NextLink className="flex items-center gap-2" href="/">
						<Avatar>
							<Avatar.Image
								alt={siteConfig.initials}
								// className="rounded-full object-cover"
								src={`${basePath}/favicon.png`}
							/>
							<Avatar.Fallback>{siteConfig.initials}</Avatar.Fallback>
						</Avatar>
						<p className="truncate font-bold text-inherit">{siteConfig.name}</p>
					</NextLink>
					<ul className="hidden items-center gap-4 xl:flex">
						{siteConfig.navItems.map((item) =>
							item.href ===
							siteConfig.navigation.headerQuickLink.href ? null : (
								<li key={item.href}>
									<NextLink
										className="text-md text-foreground transition-colors hover:text-primary"
										href={item.href}
									>
										{item.label}
									</NextLink>
								</li>
							),
						)}
					</ul>
				</div>

				<div className="hidden items-center gap-3 xl:flex">
					<SocialLinks />
					<ThemeSwitch />
					{renderSearchInput("w-56")}
					<NextLink
						className={clsx(
							"inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-white shadow-sm shadow-primary/20 transition-opacity hover:opacity-90",
						)}
						href={siteConfig.navigation.headerQuickLink.href}
					>
						<MdMail size={20} />
						{siteConfig.navigation.headerQuickLink.label}
					</NextLink>
				</div>

				<div className="flex items-center gap-3 xl:hidden">
					<SocialLinksCompact />
					<ThemeSwitch />
					<Button
						className="xl:hidden"
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						aria-label="Toggle menu"
						aria-expanded={isMenuOpen}
					>
						<span className="sr-only">Menu</span>
						<svg
							className="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Toggle menu</title>
							{isMenuOpen ? (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							) : (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 12h16M4 18h16"
								/>
							)}
						</svg>
					</Button>
				</div>
			</div>

			{isMenuOpen ? (
				<div className="border-t border-default-200/60 px-4 py-4 xl:hidden">
					<div className="mx-auto max-w-7xl space-y-4">
						{renderSearchInput("w-full")}
						<div className="space-y-3">
							{siteConfig.navMenuItems.map((item) =>
								item.href ===
								siteConfig.navigation.headerQuickLink.href ? null : (
									<NextLink
										key={item.href}
										className="block text-md text-foreground"
										href={item.href}
										onClick={() => setIsMenuOpen(false)}
									>
										{item.label}
									</NextLink>
								),
							)}
							<NextLink
								className="block text-md text-foreground"
								href={siteConfig.navigation.headerQuickLink.href}
								onClick={() => setIsMenuOpen(false)}
							>
								{siteConfig.navigation.headerQuickLink.label}
							</NextLink>
						</div>
					</div>
				</div>
			) : null}
		</nav>
	);
};
