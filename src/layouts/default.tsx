import { useTheme } from "next-themes";
import { AdminBar } from "@/components/admin-bar";
import {
	ComingSoonScreen,
	useComingSoonGate,
} from "@/components/coming-soon-gate";
import { Navbar } from "@/components/navbar";
import type { SeoEntry } from "@/lib/seo";
import { Footer } from "./footer";
import { Head } from "./head";

export default function DefaultLayout({
	children,
	seo,
}: {
	children: React.ReactNode;
	seo?: SeoEntry;
}) {
	const { resolvedTheme, theme } = useTheme();
	const { shouldShowComingSoon } = useComingSoonGate();

	const activeTheme = resolvedTheme || theme || "dark";
	const animation =
		activeTheme === "light" ? "lightAnimation" : "darkAnimation";

	return (
		<div className="relative flex min-h-screen flex-col">
			<Head seo={seo} />
			{!shouldShowComingSoon ? (
				<div className="sticky top-0 z-50">
					<AdminBar />
					<Navbar />
				</div>
			) : null}
			<main className={`px-6 flex-grow ${animation}`}>
				{shouldShowComingSoon ? <ComingSoonScreen /> : children}
			</main>
			{!shouldShowComingSoon ? <Footer /> : null}
		</div>
	);
}
