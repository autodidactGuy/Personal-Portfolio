import { Navbar } from "@/components/navbar";
import { Link } from "@nextui-org/link";
import { Head } from "./head";
import { useTheme } from "next-themes";
import { basePath, siteConfig } from "@/config/site";
import { Avatar } from "@nextui-org/react";
import { Footer } from "./Footer";

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
