import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { api } from "../services/api";
import type { Order } from "../types/order";
import type { Product } from "../types/product";

type ReportsPageProps = {
  token: string;
  user: {
    username: string;
    role: string;
  };
  onLogout: () => void;
};

type StatusCounts = Record<Order["status"], number>;

type TopItem = {
  name: string;
  quantity: number;
  revenue: number;
};

const STATUS_LABELS: Record<Order["status"], string> = {
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  IN_TRANSIT: "In transit",
  FULFILLED: "Fulfilled",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

export function ReportsPage({ token, user, onLogout }: ReportsPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isAdmin = user.role === "ADMIN";

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.getOrders(token, undefined, controller.signal),
      api.getProducts(token, controller.signal),
    ])
      .then(([orderData, productData]) => {
        setOrders(orderData);
        setProducts(productData);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to build the report dashboard right now"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [token]);

  const handleExport = useCallback(async () => {
    if (isExporting) {
      return;
    }
    setExportError(null);
    setIsExporting(true);
    try {
      const blob = await api.downloadOnboardingReport(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `new-users-${dateStamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : "Unable to export onboarding snapshot"
      );
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, token]);

  const statusCounts: StatusCounts = useMemo(() => {
    return orders.reduce<StatusCounts>((accumulator, order) => {
      accumulator[order.status] = (accumulator[order.status] ?? 0) + 1;
      return accumulator;
    }, {} as StatusCounts);
  }, [orders]);

  const revenue = useMemo(() => {
    return orders
      .filter(
        (order) =>
          order.status === "APPROVED" ||
          order.status === "IN_TRANSIT" ||
          order.status === "FULFILLED"
      )
      .reduce((sum, order) => sum + order.totalAmount, 0);
  }, [orders]);

  const averageItemsPerOrder = useMemo(() => {
    if (orders.length === 0) {
      return 0;
    }
    const totalItems = orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((count, item) => count + item.quantity, 0),
      0
    );
    return totalItems / orders.length;
  }, [orders]);

  const inventoryValue = useMemo(() => {
    return products.reduce(
      (sum, product) => sum + product.price * product.stockQuantity,
      0
    );
  }, [products]);

  const topItems = useMemo(() => {
    const map = new Map<string, TopItem>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const existing = map.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.lineTotal;
        } else {
          map.set(item.productId, {
            name: item.productName,
            quantity: item.quantity,
            revenue: item.lineTotal,
          });
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }, [orders]);

  return (
    <AppLayout
      title="Puma Printables Portal"
      username={user.username}
      role={user.role}
      onLogout={onLogout}
    >
      <div className="content-header">
        <div className="content-title">
          <h2>Operations snapshot</h2>
          <p className="small-muted">
            Live summary of orders, fulfillment progress, and catalog health.
          </p>
        </div>
        {isAdmin ? (
          <div className="content-actions">
            <button
              type="button"
              className="secondary-button ghost"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting
                ? "Preparing onboarding export…"
                : "Download new user report"}
            </button>
          </div>
        ) : null}
      </div>

      {exportError ? <div className="error-banner">{exportError}</div> : null}

      {isLoading ? (
        <div className="centered">
          <div className="spinner" aria-label="Loading reports" />
        </div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : (
        <>
          <section className="metric-grid" aria-label="Key metrics">
            <article className="metric-card">
              <h3>Total orders</h3>
              <p className="metric-value">{orders.length}</p>
              <span className="small-muted">Includes every status</span>
            </article>
            <article className="metric-card">
              <h3>Pending approvals</h3>
              <p className="metric-value">
                {statusCounts.PENDING_APPROVAL ?? 0}
              </p>
              <span className="small-muted">Awaiting approver action</span>
            </article>
            <article className="metric-card">
              <h3>Revenue pipeline</h3>
              <p className="metric-value">
                {currencyFormatter.format(revenue)}
              </p>
              <span className="small-muted">
                Approved + in transit + fulfilled
              </span>
            </article>
            <article className="metric-card">
              <h3>Inventory value</h3>
              <p className="metric-value">
                {currencyFormatter.format(inventoryValue)}
              </p>
              <span className="small-muted">Price × stock across SKUs</span>
            </article>
          </section>

          <section className="status-grid" aria-label="Order status breakdown">
            {(
              [
                "PENDING_APPROVAL",
                "APPROVED",
                "ACCEPTED",
                "REJECTED",
                "IN_TRANSIT",
                "FULFILLED",
              ] as Order["status"][]
            ).map((status) => (
              <article
                key={status}
                className={`status-card status-${status.toLowerCase()}`}
              >
                <h4>{STATUS_LABELS[status]}</h4>
                <p className="status-value">{statusCounts[status] ?? 0}</p>
              </article>
            ))}
          </section>

          <section className="report-grid">
            <article className="report-card">
              <header>
                <h3>Top ordered items</h3>
                <span className="small-muted">
                  Quantity ordered across all time
                </span>
              </header>
              {topItems.length === 0 ? (
                <p className="small-muted">
                  Place a few orders to populate this ranking.
                </p>
              ) : (
                <ol className="top-items">
                  {topItems.map((item) => (
                    <li key={item.name}>
                      <div>
                        <strong>{item.name}</strong>
                        <span className="small-muted">
                          {item.quantity} units
                        </span>
                      </div>
                      <span>{currencyFormatter.format(item.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </article>

            <article className="report-card">
              <header>
                <h3>Order insights</h3>
                <span className="small-muted">Quick pulse on throughput</span>
              </header>
              <ul className="insight-list">
                <li>
                  <span>Average line items per order</span>
                  <strong>{averageItemsPerOrder.toFixed(1)}</strong>
                </li>
                <li>
                  <span>Active SKUs</span>
                  <strong>
                    {products.filter((product) => product.active).length}
                  </strong>
                </li>
                <li>
                  <span>Total catalog size</span>
                  <strong>{products.length}</strong>
                </li>
              </ul>
            </article>
          </section>
        </>
      )}
    </AppLayout>
  );
}
