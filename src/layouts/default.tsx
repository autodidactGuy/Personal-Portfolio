import { Navbar } from "@/components/navbar";
import { Head } from "./head";
import { Footer } from "./footer";
import { useTheme } from "next-themes";

export default function DefaultLayout({
	children,
}: {
	children: React.ReactNode;
}) {

	const { theme } = useTheme();

	const animation = theme === "light" ? "lightAnimation" : "darkAnimation";
	
	return (
		<div className="relative flex flex-col h-screen">
			<Head />
			<Navbar />
			<main className={`px-6 flex-grow ${animation}`}>
				{children}
			</main>
			<Footer />
		</div>
	);
}
