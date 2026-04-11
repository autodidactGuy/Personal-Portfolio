import fs from "fs";
import path from "path";

import matter from "gray-matter";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
const projectRoot = process.cwd();
const contentRoot = path.join(projectRoot, "content");
const publicRoot = path.join(projectRoot, "public");
const outputRoot = path.join(publicRoot, "og");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(contentRoot, relativePath), "utf8"));
}

function ensureDir(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function readLocalImageBuffer(imagePath) {
  if (!imagePath || /^https?:\/\//.test(imagePath)) {
    return null;
  }

  const normalized = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  const fullPath = path.join(publicRoot, normalized);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fs.readFileSync(fullPath);
}

function wrapText(text, maxCharsPerLine, maxLines) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return [];
  }

  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]*$/, "")}...`;
  }

  return lines;
}

function buildOverlaySvg({
  eyebrow,
  title,
  summary,
  footerLabel,
  metaLabel,
  tagLabel,
}) {
  const titleLines = wrapText(title, 28, 3);
  const summaryLines = wrapText(summary, 60, 3);
  const safeEyebrow = escapeXml(eyebrow);
  const safeFooterLabel = escapeXml(footerLabel);
  const safeMetaLabel = escapeXml(metaLabel);
  const safeTagLabel = escapeXml(tagLabel);
  const titleStartY = 208;
  const titleLineHeight = 68;
  const summaryStartY = titleStartY + titleLines.length * titleLineHeight + 40;
  const summaryLineHeight = 34;
  const footerRuleY = 520;
  const footerTextY = 558;

  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="88" y="${titleStartY + index * titleLineHeight}" fill="#f8fafc" font-size="54" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="700" letter-spacing="-1.8">${escapeXml(line)}</text>`
    )
    .join("");

  const summarySvg = summaryLines
    .map(
      (line, index) =>
        `<text x="88" y="${summaryStartY + index * summaryLineHeight}" fill="#dbe4f0" font-size="26" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="400">${escapeXml(line)}</text>`
    )
    .join("");

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardGlow" x1="80" y1="80" x2="1120" y2="560" gradientUnits="userSpaceOnUse">
          <stop stop-color="rgba(56, 189, 248, 0.18)"/>
          <stop offset="1" stop-color="rgba(14, 165, 233, 0.04)"/>
        </linearGradient>
        <linearGradient id="panelStroke" x1="120" y1="160" x2="1080" y2="580" gradientUnits="userSpaceOnUse">
          <stop stop-color="rgba(148, 163, 184, 0.38)"/>
          <stop offset="1" stop-color="rgba(148, 163, 184, 0.10)"/>
        </linearGradient>
      </defs>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="#07111f"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#cardGlow)"/>
      <rect x="62" y="58" width="1076" height="514" rx="34" fill="rgba(8, 15, 28, 0.72)" stroke="url(#panelStroke)"/>

      <path d="M698 124H1048C1072 124 1092 144 1092 168V482C1092 506 1072 526 1048 526H698" stroke="rgba(148,163,184,0.18)" />
      <path d="M734 486V276" stroke="rgba(148,163,184,0.12)" />
      <path d="M786 486V236" stroke="rgba(148,163,184,0.12)" />
      <path d="M838 486V316" stroke="rgba(148,163,184,0.12)" />
      <path d="M890 486V206" stroke="rgba(148,163,184,0.12)" />
      <path d="M942 486V254" stroke="rgba(148,163,184,0.12)" />
      <path d="M994 486V170" stroke="rgba(148,163,184,0.12)" />
      <path d="M734 486H1046" stroke="rgba(148,163,184,0.18)" />
      <rect x="746" y="354" width="34" height="132" rx="10" fill="rgba(56, 189, 248, 0.62)" />
      <rect x="798" y="304" width="34" height="182" rx="10" fill="rgba(59, 130, 246, 0.72)" />
      <rect x="850" y="388" width="34" height="98" rx="10" fill="rgba(14, 165, 233, 0.55)" />
      <rect x="902" y="250" width="34" height="236" rx="10" fill="rgba(37, 99, 235, 0.78)" />
      <rect x="954" y="328" width="34" height="158" rx="10" fill="rgba(56, 189, 248, 0.55)" />
      <rect x="1006" y="212" width="34" height="274" rx="10" fill="rgba(99, 102, 241, 0.68)" />

      <text x="88" y="112" fill="#7dd3fc" font-size="15" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="600" letter-spacing="2.2">${safeEyebrow.toUpperCase()}</text>
      <path d="M88 126H210" stroke="rgba(56, 189, 248, 0.30)" stroke-linecap="round"/>

      ${titleSvg}
      ${summarySvg}

      <path d="M88 ${footerRuleY}H650" stroke="rgba(148,163,184,0.14)" stroke-linecap="round"/>
      <circle cx="94" cy="${footerTextY - 7}" r="5" fill="#38bdf8"/>
      <text x="110" y="${footerTextY}" fill="#dbe4f0" font-size="18" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="500">${safeTagLabel}</text>
      <path d="M236 ${footerTextY - 17}V${footerTextY + 5}" stroke="rgba(148,163,184,0.22)" stroke-linecap="round"/>
      <text x="650" y="${footerTextY}" fill="#cbd5e1" font-size="18" text-anchor="end" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="500">${safeMetaLabel}</text>

      <text x="1048" y="104" fill="#94a3b8" font-size="18" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">$ ${safeFooterLabel}</text>
    </svg>
  `;
}

async function buildBaseImage(imagePath) {
  const imageBuffer = readLocalImageBuffer(imagePath);

  if (imageBuffer) {
    return sharp(imageBuffer)
      .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" })
      .modulate({ brightness: 0.55, saturation: 1.15 })
      .blur(2.5)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
              <rect width="${WIDTH}" height="${HEIGHT}" fill="rgba(4,9,18,0.28)"/>
              <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
                  <stop stop-color="rgba(8,15,28,0.90)"/>
                  <stop offset="0.55" stop-color="rgba(8,15,28,0.72)"/>
                  <stop offset="1" stop-color="rgba(8,15,28,0.92)"/>
                </linearGradient>
              </defs>
            </svg>`
          ),
        },
      ])
      .png()
      .toBuffer();
  }

  return sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: "#07111f",
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg" x1="40" y1="24" x2="1160" y2="614" gradientUnits="userSpaceOnUse">
                <stop stop-color="#10233b"/>
                <stop offset="0.55" stop-color="#081321"/>
                <stop offset="1" stop-color="#0f1728"/>
              </linearGradient>
              <radialGradient id="glowA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(250 120) rotate(35) scale(260 200)">
                <stop stop-color="rgba(56, 189, 248, 0.20)"/>
                <stop offset="1" stop-color="rgba(56, 189, 248, 0)"/>
              </radialGradient>
              <radialGradient id="glowB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1020 520) rotate(25) scale(260 180)">
                <stop stop-color="rgba(59, 130, 246, 0.18)"/>
                <stop offset="1" stop-color="rgba(59, 130, 246, 0)"/>
              </radialGradient>
            </defs>
            <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
            <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowA)"/>
            <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowB)"/>
          </svg>`
        ),
      },
    ])
    .png()
    .toBuffer();
}

async function writeOgImage(relativeOutputPath, options) {
  const targetPath = path.join(outputRoot, relativeOutputPath);
  ensureDir(path.dirname(targetPath));

  const baseImage = await buildBaseImage(options.image);
  const overlaySvg = buildOverlaySvg(options);

  await sharp(baseImage)
    .composite([{ input: Buffer.from(overlaySvg) }])
    .png()
    .toFile(targetPath);
}

function parsePostEntries() {
  const postsDir = path.join(contentRoot, "posts");

  return fs
    .readdirSync(postsDir)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(postsDir, fileName), "utf8");
      const { data } = matter(source);

      return {
        slug,
        frontmatter: data,
      };
    })
    .filter((entry) => entry.frontmatter.published !== false);
}

const site = readJson("settings/site.json");
const hero = readJson("home/hero.json");
const about = readJson("about/profile.json");
const recommendations = readJson("recommendations/index.json");
const contact = readJson("settings/contact.json");

const pageEntries = [
  {
    output: "home.png",
    eyebrow: "Portfolio",
    title: site.name,
    summary: site.title,
    image: hero.image || site.avatar,
    metaLabel: site.name,
    tagLabel: "Home",
  },
  {
    output: "about.png",
    eyebrow: "About",
    title: `About - ${site.name}`,
    // summary: about.summary,
    image: about.photo || site.avatar,
    metaLabel: site.name,
    tagLabel: "Profile",
  },
  {
    output: "blog.png",
    eyebrow: "Writing",
    title: `Blog - ${site.name}`,
    // summary: "Technical articles and project narratives focused on software architecture, system design, and developer experience.",
    image: hero.image || site.avatar,
    metaLabel: site.name,
    tagLabel: "Blog",
  },
  {
    output: "projects.png",
    eyebrow: "Projects",
    title: `Projects - ${site.name}`,
    // summary: "Open source projects, prototypes, and experiments focused on developer experience and productivity.",
    image: hero.image || site.avatar,
    metaLabel: site.name,
    tagLabel: "Projects",
  },
  {
    output: "recommendations.png",
    eyebrow: "Recommendations",
    title: recommendations.title,
    // summary: recommendations.description,
    image: site.avatar,
    metaLabel: site.name,
    tagLabel: "Recommendations",
  },
  {
    output: "contact.png",
    eyebrow: "Contact",
    title: `Contact - ${site.name}`,
    summary: contact.title,
    image: site.avatar,
    metaLabel: site.name,
    tagLabel: "Contact",
  },
];

const footerLabel = "build systems --for clarity --at scale";

await Promise.all(
  pageEntries.map((entry) =>
    writeOgImage(entry.output, {
      ...entry,
      footerLabel,
    })
  )
);

const posts = parsePostEntries();

await Promise.all(
  posts.map((post) => {
    const isProject = post.frontmatter.contentType === "project";

    return writeOgImage(
      isProject ? `projects/${post.slug}.png` : `posts/${post.slug}.png`,
      {
        eyebrow: isProject ? "Project" : "Post",
        title: post.frontmatter.title,
        summary: post.frontmatter.summary,
        image: post.frontmatter.coverImage || hero.image || site.avatar,
        metaLabel: site.name,
        tagLabel: post.frontmatter.contentType || "Post",
        footerLabel,
      }
    );
  })
);
