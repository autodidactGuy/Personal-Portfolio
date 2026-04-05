import { useEffect } from "react";

import { withBasePath } from "@/config/site";

export default function CmsAdminRedirectPage() {
  useEffect(() => {
    window.location.replace(withBasePath("/cms-admin/index.html"));
  }, []);

  return null;
}
