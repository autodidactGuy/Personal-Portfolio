import { AdminBar } from "@/components/admin-bar";
import { Navbar } from "@/components/navbar";
import { Head } from "./head";
import { Footer } from "./footer";
import { useTheme } from "next-themes";
import { ComingSoonScreen, useComingSoonGate } from "@/components/coming-soon-gate";

export default function DefaultLayout({
	children,
}: {
	children: React.ReactNode;
}) {

	const { theme } = useTheme();
	const { shouldShowComingSoon } = useComingSoonGate();

	const animation = theme === "light" ? "lightAnimation" : "darkAnimation";
	
	return (
		<div className="relative flex min-h-screen flex-col">
			<Head />
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
