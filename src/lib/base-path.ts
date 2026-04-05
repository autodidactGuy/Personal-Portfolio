const repositoryName =
  process.env.NEXT_PUBLIC_REPOSITORY_NAME ||
  process.env.GITHUB_REPOSITORY?.split("/")[1] ||
  "Personal-Portfolio";

export const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  process.env.BASE_PATH ??
  "";

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
