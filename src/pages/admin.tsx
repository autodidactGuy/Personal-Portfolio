import { useEffect } from "react";

import { withBasePath } from "@/config/site";

export default function AdminRedirectPage() {
  useEffect(() => {
    window.location.replace(withBasePath("/admin/index.html"));
  }, []);

  return null;
}
