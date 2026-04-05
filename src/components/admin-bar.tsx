import Link from "next/link";
import { useRouter } from "next/router";
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/react";

import { CMS_USER_STORAGE_KEYS, useComingSoonGate } from "@/components/coming-soon-gate";
import { siteConfig, withBasePath } from "@/config/site";

export function AdminBar() {
  const router = useRouter();
  const { cmsSession, isCmsRoute, shouldShowComingSoon } = useComingSoonGate();

  if (!cmsSession.isLoggedIn || isCmsRoute) {
    return null;
  }

  const isPreviewMode = siteConfig.comingSoonMode.enabled && !shouldShowComingSoon;

  const handleLogout = () => {
    for (const storageKey of CMS_USER_STORAGE_KEYS) {
      window.localStorage.removeItem(storageKey);
    }

    router.reload();
  };

  return (
    <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">
          {isPreviewMode ? "Preview mode enabled" : "Admin mode enabled"}
        </p>
        <div className="flex items-center gap-3">
          <Button
            as={Link}
            color="primary"
            href={withBasePath("/cms-admin/")}
            radius="full"
            size="sm"
            variant="flat"
          >
            Open CMS Admin
          </Button>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                className="bg-background"
                endContent={
                  <Avatar
                    className="h-7 w-7 text-tiny"
                    name={siteConfig.initials}
                    size="sm"
                    src={withBasePath(siteConfig.avatar)}
                  />
                }
                radius="full"
                variant="bordered"
              >
                {cmsSession.displayName}
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Admin actions">
              <DropdownItem key="name" className="text-default-500" isReadOnly>
                Signed in as {cmsSession.displayName}
              </DropdownItem>
              <DropdownItem key="cms" href={withBasePath("/cms-admin/")}>
                Go to CMS Admin
              </DropdownItem>
              <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                Log out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
