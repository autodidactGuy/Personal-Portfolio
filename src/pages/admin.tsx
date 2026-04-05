import { useEffect } from "react";

import { withBasePath } from "@/config/site";

export default function AdminRedirectPage() {
  useEffect(() => {
    window.location.replace(withBasePath("/cms-admin/"));
  }, []);

  return null;
}
