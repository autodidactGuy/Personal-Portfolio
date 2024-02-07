import { basePath, siteConfig } from "@/config/site";
import NextLink from "next/link";

export function Footer() {
    return (
        <footer className="container mx-auto max-w-7xl w-full flex justify-between items-center px-6 py-3 sticky bottom-0 bg-background">
            <div className="gap-3 max-w-fit hidden sm:flex">
                <NextLink className="text-left" href="/">
                    <p className="font-bold text-inherit ml-2 text-lg tracking-wide leading-3">{siteConfig.name}</p>
                    <p className="text-inherit ml-2 text-sm">{siteConfig.slogan}</p> 
                </NextLink>
            </div>
            <div className="w-full sm:w-fit">
                <p className="text-inherit ml-2 sm:text-right text-center">Crafted with &#128150; by <span className="font-bold">{siteConfig.name}</span></p>
            </div>
            {/* <Link
                isExternal
                className="flex items-center gap-1 text-current"
                href={basePath}
                title="Hassan Raza"
            >
                <span className="text-default-600">&copy; {new Date().getFullYear()} - </span>
                <p className="font-bold text-inherit ml-2">Hassan Raza</p>
            </Link> */}
        </footer>
    );
}
