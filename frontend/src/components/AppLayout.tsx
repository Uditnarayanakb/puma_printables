import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import "../App.css";

export type AppLayoutProps = {
  title: string;
  username: string;
  role: string;
  onLogout: () => void;
  children: ReactNode;
};

type KnownRole = "ADMIN" | "APPROVER" | "STORE_USER";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  allowedRoles: KnownRole[];
};

const NAV_ITEMS: NavItem[] = [
  {
    to: "/orders",
    label: "Orders",
    icon: "📦",
    allowedRoles: ["ADMIN", "APPROVER", "STORE_USER"],
  },
  {
    to: "/products",
    label: "Products",
    icon: "🛍️",
    allowedRoles: ["ADMIN", "STORE_USER"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: "📈",
    allowedRoles: ["ADMIN"],
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: "✉️",
    allowedRoles: ["ADMIN", "APPROVER"],
  },
];

function normalizeRole(role: string): KnownRole {
  if (role === "ADMIN" || role === "APPROVER" || role === "STORE_USER") {
    return role;
  }
  return "STORE_USER";
}

export function AppLayout({
  title,
  username,
  role,
  onLogout,
  children,
}: AppLayoutProps) {
  const normalizedRole = normalizeRole(role);
  const navItemsForRole = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(normalizedRole)
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <h1>{title}</h1>
          <p className="small-muted">
            Manage apparel orders and logistics in one place.
          </p>
        </div>
        <div className="header-actions">
          <span className="badge">{role}</span>
          <span>{username}</span>
          <button
            className="secondary-button ghost"
            type="button"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div>
            <h2>Navigation</h2>
            <nav className="nav-links">
              {navItemsForRole.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link${isActive ? " active" : ""}`
                  }
                >
                  <span className="nav-link-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="main-content">{children}</main>
      </div>

      <footer className="app-footer">
        <span>Puma Printables Platform</span>
        <span className="small-muted">
          © {new Date().getFullYear()} Internal Operations
        </span>
      </footer>
    </div>
  );
}
