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
	const { shouldShowComingSoon } = useComingSoonGate();

	return (
		<div className="relative flex min-h-screen flex-col">
			<Head seo={seo} />
			{!shouldShowComingSoon ? (
				<div className="sticky top-0 z-50">
					<AdminBar />
					<Navbar />
				</div>
			) : null}
			<main className="page-shell-theme flex-grow px-6">
				{shouldShowComingSoon ? <ComingSoonScreen /> : children}
			</main>
			{!shouldShowComingSoon ? <Footer /> : null}
		</div>
	);
}
