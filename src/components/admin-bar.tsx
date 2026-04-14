import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import {
	CMS_USER_STORAGE_KEYS,
	useComingSoonGate,
} from "@/components/coming-soon-gate";
import { siteConfig, withBasePath } from "@/config/site";

export function AdminBar() {
	const router = useRouter();
	const { cmsSession, isCmsRoute, shouldShowComingSoon } = useComingSoonGate();

	if (!cmsSession.isLoggedIn || isCmsRoute) {
		return null;
	}

	const isPreviewMode =
		siteConfig.comingSoonMode.enabled && !shouldShowComingSoon;

	const handleLogout = () => {
		for (const storageKey of CMS_USER_STORAGE_KEYS) {
			window.localStorage.removeItem(storageKey);
		}

		router.reload();
	};

	return (
		<div className="border-b border-primary/20 bg-primary/10 px-4 py-2 backdrop-blur-sm">
			<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 overflow-x-clip">
				<p className="min-w-0 text-sm font-medium text-primary">
					{isPreviewMode ? "Preview mode enabled" : "Admin mode enabled"}
				</p>
				<div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
					<Link
						className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/15 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
						href={withBasePath("/cms-admin/")}
					>
						Open CMS Admin
					</Link>
					<div className="flex max-w-full items-center gap-2 rounded-full border border-default-200/70 bg-background px-2 py-1">
						<div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-default-100">
							<Image
								alt={siteConfig.initials}
								className="h-full w-full object-cover"
								height={28}
								src={withBasePath(siteConfig.avatar)}
								width={28}
							/>
						</div>
						<span className="max-w-[140px] truncate text-sm text-foreground">
							{cmsSession.displayName}
						</span>
						<button
							className="inline-flex items-center justify-center rounded-full border border-danger/20 px-3 py-1 text-sm text-danger transition-colors hover:bg-danger/10"
							onClick={handleLogout}
							type="button"
						>
							Log out
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
