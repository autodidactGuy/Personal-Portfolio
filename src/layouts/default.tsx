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
		<div className="relative flex flex-col h-screen">
			<Head />
			<AdminBar />
			{!shouldShowComingSoon ? <Navbar /> : null}
			<main className={`px-6 flex-grow ${animation}`}>
				{shouldShowComingSoon ? <ComingSoonScreen /> : children}
			</main>
			{!shouldShowComingSoon ? <Footer /> : null}
		</div>
	);
}
