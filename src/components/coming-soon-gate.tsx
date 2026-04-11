import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextImage from "next/image";
import { Image } from "@heroui/react";
import { siteConfig, withBasePath } from "@/config/site";

export const CMS_USER_STORAGE_KEYS = ["netlify-cms-user", "decap-cms-user"];
export const CMS_ROUTE_PREFIXES = ["/cms-admin", "/admin"];

type CmsSession = {
  displayName: string;
  isLoggedIn: boolean;
};

type CmsStoredSession = {
  token?: string;
  jwt?: string;
  name?: string;
  login?: string;
  user?: {
    name?: string;
    login?: string;
  };
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

function getDisplayName(parsedValue: CmsStoredSession) {
  return (
    parsedValue?.name ||
    parsedValue?.login ||
    parsedValue?.user?.name ||
    parsedValue?.user?.login ||
    parsedValue?.user_metadata?.full_name ||
    parsedValue?.user_metadata?.name ||
    "Admin"
  );
}

function hasUsableCmsToken(parsedValue: CmsStoredSession) {
  const token = parsedValue?.token || parsedValue?.jwt;

  if (typeof token !== "string") {
    return false;
  }

  return token.trim().length >= 20;
}

const IS_LOCAL_DEVELOPMENT = process.env.NODE_ENV === "development";

function readCmsSession(): CmsSession {
  if (typeof window === "undefined") {
    return {
      displayName: "Admin",
      isLoggedIn: false,
    };
  }

  for (const storageKey of CMS_USER_STORAGE_KEYS) {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      continue;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as CmsStoredSession;
      const isLoggedIn = hasUsableCmsToken(parsedValue);
      const displayName = getDisplayName(parsedValue);

      if (isLoggedIn) {
        return {
          displayName,
          isLoggedIn: true,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    displayName: "Admin",
    isLoggedIn: false,
  };
}

export function useComingSoonGate() {
  const router = useRouter();
  const [cmsSession, setCmsSession] = useState<CmsSession>({
    displayName: "Admin",
    isLoggedIn: false,
  });

  useEffect(() => {
    setCmsSession(readCmsSession());
  }, []);

  const isCmsRoute = CMS_ROUTE_PREFIXES.some(
    (routePrefix) =>
      router.pathname.startsWith(routePrefix) || router.asPath.startsWith(routePrefix)
  );
  const isComingSoonEnabled = siteConfig.comingSoonMode.enabled && !IS_LOCAL_DEVELOPMENT;
  const shouldShowComingSoon = isComingSoonEnabled && !cmsSession.isLoggedIn && !isCmsRoute;

  return {
    cmsSession,
    isCmsAdmin: cmsSession.isLoggedIn,
    isCmsRoute,
    shouldShowComingSoon,
  };
}

export function ComingSoonScreen() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-6 py-20">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Image
            as={NextImage}
            isBlurred
            alt={siteConfig.name}
            width={220}
            height={220}
            className="animate__animated animate__fadeInUp"
            src={withBasePath(siteConfig.avatar)}
          />
        </div>
        <p className="text-sm font-semibold tracking-[0.15em] text-primary">
          {siteConfig.name}
        </p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight">
          {siteConfig.comingSoonMode.headline}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-default-600">
          {siteConfig.comingSoonMode.description}
        </p>
      </div>
    </section>
  );
}
