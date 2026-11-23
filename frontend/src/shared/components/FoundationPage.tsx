import { ApiHealthPanel } from "./ApiHealthPanel";

const foundations = [
  {
    label: "Frontend",
    detail: "React · Vite · TanStack",
  },
  {
    label: "Backend",
    detail: "Bun · Elysia · Prisma",
  },
  {
    label: "Database",
    detail: "PostgreSQL · Docker",
  },
] as const;

export function FoundationPage() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="/"
          aria-label="ORBS foundation home"
        >
          <span
            className="brand-symbol"
            aria-hidden="true"
          >
            O
          </span>
          <span>ORBS</span>
        </a>
        <span className="header-context">
          Engineering workspace <span aria-hidden="true">/</span> M0
        </span>
      </header>

      <main className="page-body">
        <div
          className="intro-rule"
          aria-hidden="true"
        />
        <p className="eyebrow">Foundation · M0 / 08</p>
        <h1>Built on a clear foundation.</h1>
        <p className="intro-copy">
          Office Resource Booking System. This is the technical foundation—not a working booking
          product yet. The next milestone adds authentication and identity.
        </p>

        <div className="workspace-grid">
          <section
            className="architecture"
            aria-labelledby="stack-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="stack-heading">Workspace architecture</h2>
                <p>One repository. Separate applications. Explicit responsibilities.</p>
              </div>
              <span className="minor-label">Monorepo</span>
            </div>

            <div className="architecture-list">
              {foundations.map((item, index) => (
                <div
                  className="architecture-row"
                  key={item.label}
                >
                  <span className="architecture-number">0{index + 1}</span>
                  <span className="architecture-name">{item.label}</span>
                  <span className="architecture-detail">{item.detail}</span>
                </div>
              ))}
            </div>
          </section>

          <ApiHealthPanel />
        </div>

        <footer className="page-footer">
          <span>ORBS / Foundation milestone</span>
          <span>No business data or simulated bookings</span>
        </footer>
      </main>
    </div>
  );
}
