import fs from "fs";
import path from "path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const reactIconsRoot = path.join(projectRoot, "node_modules", "react-icons");

function toTitleCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();
}

function getIconEntriesForPack(pack) {
  const dtsPath = path.join(reactIconsRoot, pack, "index.d.ts");
  const source = fs.readFileSync(dtsPath, "utf8");
  const matches = [...source.matchAll(/^export declare const (\w+): IconType;/gm)];

  return matches.map((match) => {
    const name = match[1];

    return {
      id: `${pack}:${name}`,
      pack,
      name,
      label: toTitleCase(name),
    };
  });
}

const packs = fs
  .readdirSync(reactIconsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((pack) => fs.existsSync(path.join(reactIconsRoot, pack, "index.d.ts")))
  .sort();

const icons = packs.flatMap(getIconEntriesForPack);

const generatedDir = path.join(projectRoot, "src", "generated");
const cmsDir = path.join(projectRoot, "public", "cms-admin");

fs.mkdirSync(generatedDir, { recursive: true });
fs.mkdirSync(cmsDir, { recursive: true });

const metadata = {
  generatedAt: new Date().toISOString(),
  packs,
  icons,
};

fs.writeFileSync(
  path.join(generatedDir, "content-icons.json"),
  `${JSON.stringify(metadata, null, 2)}\n`
);

fs.writeFileSync(
  path.join(cmsDir, "content-icons.json"),
  `${JSON.stringify(metadata, null, 2)}\n`
);

console.log(`Generated ${icons.length} icon metadata entries across ${packs.length} packs.`);
