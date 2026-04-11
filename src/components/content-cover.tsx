import NextImage from "next/image";
import { Image } from "@heroui/react";

import { withBasePath } from "@/config/site";
import { toTitleCase } from "@/lib/string";

type ContentCoverProps = {
  title: string;
  coverImage?: string | null;
  eyebrow?: string;
  subtitle?: string;
  heightClassName?: string;
};

function hasCoverImage(coverImage?: string | null) {
  return Boolean(coverImage && coverImage.trim().length > 0);
}

export function ContentCover({
  title,
  coverImage,
  eyebrow,
  subtitle,
  heightClassName = "h-44",
}: ContentCoverProps) {
  if (hasCoverImage(coverImage)) {
    return (
      <div className={`relative w-full overflow-hidden ${heightClassName}`}>
        <Image
          as={NextImage}
          alt={title}
          classNames={{
            img: "h-full w-full object-cover",
            wrapper: "!max-w-full w-full h-full",
          }}
          className="h-full w-full object-cover"
          height={"100"}
          radius="none"
          src={withBasePath(coverImage as string)}
          width={1200}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex w-full items-end overflow-hidden bg-[linear-gradient(135deg,_rgba(244,247,251,0.96),_rgba(235,241,248,0.98)_45%,_rgba(224,232,242,0.96))] dark:bg-[linear-gradient(135deg,_rgba(17,24,39,0.94),_rgba(20,30,52,0.94)_45%,_rgba(13,20,36,0.96))] ${heightClassName}`}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.18)_22%,transparent_44%)] dark:bg-[linear-gradient(120deg,transparent_0%,rgba(96,165,250,0.08)_22%,transparent_44%)]" />
        <div className="absolute right-6 top-6 h-16 w-16 rounded-full border border-black/6 dark:border-white/6" />
        <div className="absolute right-12 top-12 h-24 w-24 rounded-full border border-black/5 dark:border-white/5" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/12 via-black/4 to-transparent dark:from-black/28 dark:via-black/8" />
      </div>
      <div className="relative z-10 flex h-full w-full flex-col justify-end gap-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/60">
          <span>{eyebrow || "Editorial"}</span>
          {subtitle ? <span className="h-1 w-1 rounded-full bg-black/20 dark:bg-white/25" /> : null}
          {subtitle ? <span>{toTitleCase(subtitle)}</span> : null}
        </div>
        <div className="max-w-[28rem] space-y-1">
          <h3 className="line-clamp-3 text-lg font-semibold tracking-tight text-black/70 dark:text-white/88 sm:text-xl">
            {title}
          </h3>
        </div>
      </div>
    </div>
  );
}
