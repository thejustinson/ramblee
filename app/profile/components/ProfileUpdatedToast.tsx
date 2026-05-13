"use client";

import { useEffect, useState } from "react";

export default function ProfileUpdatedToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = sessionStorage.getItem("profile_updated_toast");
    if (flag === "1") {
      sessionStorage.removeItem("profile_updated_toast");
      setVisible(true);
      const t = window.setTimeout(() => setVisible(false), 2500);
      return () => window.clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg border border-brand-border bg-brand-surface px-5 py-3 font-sans text-sm text-brand-white shadow-lg"
    >
      Profile updated
    </div>
  );
}
