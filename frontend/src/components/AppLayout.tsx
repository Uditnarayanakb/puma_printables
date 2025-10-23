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

export function AppLayout({
  title,
  username,
  role,
  onLogout,
  children,
}: AppLayoutProps) {
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
          <button className="secondary-button" type="button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div>
            <h2>Navigation</h2>
            <nav className="nav-links">
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
              >
                <span className="nav-link-icon" aria-hidden="true">
                  📦
                </span>
                Orders
              </NavLink>
              <NavLink
                to="/products"
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
              >
                <span className="nav-link-icon" aria-hidden="true">
                  🛍️
                </span>
                Products
              </NavLink>
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
              >
                <span className="nav-link-icon" aria-hidden="true">
                  📈
                </span>
                Reports
              </NavLink>
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
