import { useEffect, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import "../App.css";
import { useCart } from "../hooks/useCart";

export type AppLayoutProps = {
  title: string;
  username: string;
  role: string;
  onLogout: () => void;
  children: ReactNode;
};

type KnownRole = "ADMIN" | "APPROVER" | "STORE_USER" | "FULFILLMENT_AGENT";

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
    allowedRoles: ["ADMIN", "APPROVER", "STORE_USER", "FULFILLMENT_AGENT"],
  },
  {
    to: "/products",
    label: "Products",
    icon: "🛍️",
    allowedRoles: ["ADMIN", "STORE_USER", "FULFILLMENT_AGENT"],
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
  {
    to: "/admin/users",
    label: "Manage users",
    icon: "👥",
    allowedRoles: ["ADMIN"],
  },
];

function normalizeRole(role: string): KnownRole {
  if (role === "ADMIN" || role === "APPROVER" || role === "STORE_USER") {
    return role;
  }
  if (role === "FULFILLMENT_AGENT") {
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
  const { totalQuantity, openCart } = useCart();
  const normalizedRole = normalizeRole(role);
  const navItemsForRole = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(normalizedRole)
  );
  const canUseCart =
    normalizedRole === "STORE_USER" || normalizedRole === "ADMIN";
  const cartLabel = totalQuantity
    ? `Open cart (${totalQuantity} item${totalQuantity === 1 ? "" : "s"})`
    : "Open cart";

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      const blocked =
        event.key === "F12" ||
        (ctrlOrMeta &&
          event.shiftKey &&
          ["i", "j", "c", "k", "m", "p"].includes(key)) ||
        (ctrlOrMeta && event.altKey && ["i", "j"].includes(key)) ||
        (ctrlOrMeta && ["p", "s", "u"].includes(key));

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const disablePrint = () => {
      console.warn("Printing is disabled for this application.");
    };

    document.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("beforeprint", disablePrint, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("beforeprint", disablePrint, true);
    };
  }, []);

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
          {canUseCart ? (
            <button
              type="button"
              className="header-cart-button"
              onClick={openCart}
              aria-label={cartLabel}
            >
              <span className="header-cart-icon" aria-hidden="true">
                🛒
              </span>
              {totalQuantity > 0 ? (
                <span className="header-cart-badge">{totalQuantity}</span>
              ) : null}
            </button>
          ) : null}
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
