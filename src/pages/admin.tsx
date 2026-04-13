import { useEffect } from "react";

import { withBasePath } from "@/config/site";

export default function AdminRedirectPage() {
	useEffect(() => {
		const adminPath =
			process.env.NODE_ENV === "development"
				? withBasePath("/cms-admin/index.html")
				: withBasePath("/cms-admin/");

		window.location.replace(adminPath);
	}, []);

	return null;
}
