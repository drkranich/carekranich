import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export function ScrollManager() {
  const location = useRouterState({ select: (state) => state.location });
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathChanged = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;

    if (location.hash) {
      requestAnimationFrame(() => {
        document.getElementById(location.hash.replace(/^#/, ""))?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (pathChanged && !location.pathname.startsWith("/app")) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.hash, location.pathname]);

  return null;
}
