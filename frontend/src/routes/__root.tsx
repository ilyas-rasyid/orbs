import { useEffect } from "react";
import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";

function RootComponent() {
  const router = useRouter();
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:")) return;
      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        event.preventDefault();
        void router.navigate({ to: `${url.pathname}${url.search}${url.hash}` });
      } catch {
        // Let browser handle malformed URLs
      }
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [router]);
  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <main className="state-center">
      Page not found.{" "}
      <a
        className="button secondary"
        href="/dashboard"
      >
        Return to dashboard
      </a>
    </main>
  ),
});
