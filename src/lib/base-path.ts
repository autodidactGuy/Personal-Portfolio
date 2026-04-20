import { publicEnv } from "@/config/public-env";

export const basePath = publicEnv.NEXT_PUBLIC_BASE_PATH;

export function withBasePath(assetPath?: string | null) {
	if (!assetPath) {
		return "";
	}

	if (/^https?:\/\//.test(assetPath)) {
		return assetPath;
	}

	if (assetPath.startsWith(basePath)) {
		return assetPath;
	}

	if (assetPath.startsWith("/")) {
		return `${basePath}${assetPath}`;
	}

	return assetPath;
}
