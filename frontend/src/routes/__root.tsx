import { createRootRoute, Outlet } from "@tanstack/react-router";
export const Route = createRootRoute({
  component: () => <Outlet />,
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
