import { Outlet, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../shared/auth/AuthProvider";
import { Loading } from "../shared/components/ui";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  ArrowLeftRight,
  Wrench,
  BarChart3,
  UsersRound,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, role: "all" },
  { href: "/facilities", label: "Facilities", icon: Building2, role: "all" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, role: "all" },
  { href: "/bookings", label: "My Bookings", icon: ClipboardList, role: "all" },
  { href: "/operations/approvals", label: "Approvals", icon: ShieldCheck, role: "manager" },
  { href: "/operations/usage", label: "Handover & Return", icon: ArrowLeftRight, role: "manager" },
  { href: "/operations/maintenance", label: "Maintenance", icon: Wrench, role: "manager" },
  { href: "/reports", label: "Reports", icon: BarChart3, role: "manager" },
  { href: "/admin/users", label: "Users", icon: UsersRound, role: "admin" },
  { href: "/admin/facilities", label: "Facility Admin", icon: Building2, role: "admin" },
  { href: "/admin/settings", label: "Settings", icon: Settings, role: "admin" },
  { href: "/profile", label: "My Profile", icon: UsersRound, role: "all" },
];
export function WorkspaceLayout() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("orbs-theme") === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  if (loading) return <Loading label="Memeriksa sesi…" />;
  if (!user) return <Navigate to="/" />;
  if (user.mustChangePassword && window.location.pathname !== "/profile") {
    return <Navigate to="/profile" />;
  }
  const nav = links.filter(
    (link) =>
      link.role === "all" ||
      (link.role === "manager" && user.role !== "EMPLOYEE") ||
      (link.role === "admin" && user.role === "ADMIN"),
  );
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("orbs-theme", next ? "dark" : "light");
    document.documentElement.dataset.theme = next ? "dark" : "light";
  };
  return (
    <div className="workspace-shell">
      <div
        className={`sidebar-overlay ${open ? "visible" : ""}`}
        onClick={() => setOpen(false)}
      />
      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <a
          className="brand-lockup"
          href="/dashboard"
        >
          <span className="brand-emblem">O</span>
          <span>
            ORBS<small>Resource management</small>
          </span>
        </a>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav
          aria-label="Main navigation"
          className="side-nav"
        >
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              window.location.pathname === item.href ||
              window.location.pathname.startsWith(`${item.href}/`);
            return (
              <a
                key={item.href}
                className={`nav-link ${active ? "active" : ""}`}
                href={item.href}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">{user.name.slice(0, 1)}</span>
          <div className="sidebar-account">
            <strong>{user.name}</strong>
            <small>{user.role.replaceAll("_", " ")}</small>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
            <span className="topbar-context">Office Resource Booking System</span>
          </div>
          <div className="topbar-actions">
            <button
              title="Toggle theme"
              aria-label="Toggle theme"
              className="icon-btn"
              onClick={toggleTheme}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <a
              className="icon-btn"
              aria-label="Notifications"
              title="Notifications"
              href="/notifications"
            >
              <Bell size={18} />
            </a>
            <button
              className="icon-btn"
              title="Sign out"
              aria-label="Sign out"
              onClick={() => void logout()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="content-area">
          <Outlet />
        </main>
      </div>
      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
      >
        {(user.role === "EMPLOYEE" ? nav.slice(0, 4) : [links[0]!, links[3]!, links[5]!]).map(
          (item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className={window.location.pathname === item.href ? "active" : ""}
              >
                <Icon size={19} />
                <span>
                  {item.label === "Handover & Return"
                    ? "Operations"
                    : item.label.replace("My ", "")}
                </span>
              </a>
            );
          },
        )}
        {user.role !== "EMPLOYEE" && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="More navigation"
          >
            <Menu size={19} />
            <span>More</span>
          </button>
        )}
      </nav>
    </div>
  );
}
