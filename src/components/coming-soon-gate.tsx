import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextImage from "next/image";
import { Image } from "@nextui-org/react";
import { siteConfig, withBasePath } from "@/config/site";

const CMS_USER_STORAGE_KEYS = ["netlify-cms-user", "decap-cms-user"];
const CMS_ROUTE_PREFIXES = ["/cms-admin", "/admin"];

function hasCmsSession() {
  if (typeof window === "undefined") {
    return false;
  }

  return CMS_USER_STORAGE_KEYS.some((storageKey) => {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return false;
    }

    try {
      const parsedValue = JSON.parse(rawValue);

      return Boolean(parsedValue?.token || parsedValue?.jwt || rawValue);
    } catch {
      return true;
    }
  });
}

export function useComingSoonGate() {
  const router = useRouter();
  const [isCmsAdmin, setIsCmsAdmin] = useState(false);

  useEffect(() => {
    setIsCmsAdmin(hasCmsSession());
  }, []);

  const isCmsRoute = CMS_ROUTE_PREFIXES.some(
    (routePrefix) =>
      router.pathname.startsWith(routePrefix) || router.asPath.startsWith(routePrefix)
  );
  const isComingSoonEnabled = siteConfig.comingSoonMode.enabled;
  const shouldShowComingSoon = isComingSoonEnabled && !isCmsAdmin && !isCmsRoute;

  return {
    isCmsAdmin,
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
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">
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
