import contentIconsMetadata from "@/generated/content-icons.json";

type ContentIconMetadataFile = {
  generatedAt: string;
  packs: string[];
  icons: Array<{
    id: string;
    pack: string;
    name: string;
    label: string;
  }>;
};

const metadata = contentIconsMetadata as ContentIconMetadataFile;

export const contentIconMetadata = metadata.icons;
export const contentIconPackIds = metadata.packs;
export type ContentIconId = `${string}:${string}`;

const contentIconMetadataMap = new Map(
  contentIconMetadata.map((icon) => [icon.id, icon])
);

export function getContentIconMetadata(iconId?: string | null) {
  if (!iconId) {
    return null;
  }

  return contentIconMetadataMap.get(iconId) ?? null;
}

export function isContentIconId(value: string): value is ContentIconId {
  return contentIconMetadataMap.has(value);
}

export function parseContentIconId(iconId?: string | null) {
  const metadataEntry = getContentIconMetadata(iconId);

  if (!metadataEntry) {
    return null;
  }

  return {
    iconId: metadataEntry.id as ContentIconId,
    pack: metadataEntry.pack,
    name: metadataEntry.name,
  };
}

