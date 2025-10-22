import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { api } from "../services/api";
import type { Order, OrderStatus } from "../types/order";

const statusLabels: Record<OrderStatus, string> = {
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_TRANSIT: "In transit",
  FULFILLED: "Fulfilled",
};

const statusClassNames: Record<OrderStatus, string> = {
  PENDING_APPROVAL: "status-pill pending",
  APPROVED: "status-pill approved",
  REJECTED: "status-pill rejected",
  IN_TRANSIT: "status-pill transit",
  FULFILLED: "status-pill fulfilled",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type OrdersPageProps = {
  token: string;
  user: {
    username: string;
    role: string;
  };
  onLogout: () => void;
};

type FilterValue = OrderStatus | "ALL";

const FILTER_OPTIONS: Array<{ label: string; value: FilterValue }> = [
  { label: "All statuses", value: "ALL" },
  { label: statusLabels.PENDING_APPROVAL, value: "PENDING_APPROVAL" },
  { label: statusLabels.APPROVED, value: "APPROVED" },
  { label: statusLabels.REJECTED, value: "REJECTED" },
  { label: statusLabels.IN_TRANSIT, value: "IN_TRANSIT" },
  { label: statusLabels.FULFILLED, value: "FULFILLED" },
];

export function OrdersPage({ token, user, onLogout }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const statusParam = filter === "ALL" ? undefined : filter;

    api
      .getOrders(token, statusParam, controller.signal)
      .then((data: Order[]) => {
        setOrders(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Unable to load orders right now"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [token, filter]);

  const pageTitle = useMemo(() => {
    return filter === "ALL" ? "All orders" : `${statusLabels[filter]} orders`;
  }, [filter]);

  return (
    <AppLayout
      title="Puma Printables Portal"
      username={user.username}
      role={user.role}
      onLogout={onLogout}
    >
      <div className="content-header">
        <h2>{pageTitle}</h2>
        <div className="filter-bar">
          <label
            className="meta-block"
            htmlFor="status-filter"
            style={{ margin: 0 }}
          >
            <span className="meta-label">Filter</span>
            <select
              id="status-filter"
              className="filter-select"
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterValue)}
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="centered">
          <div className="spinner" aria-label="Loading orders" />
        </div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders found</h3>
          <p className="small-muted">
            Try switching filters or create a new order from the backend.
          </p>
        </div>
      ) : (
        <div className="order-grid">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <div className="meta-label">Order ID</div>
                  <strong>{order.id}</strong>
                </div>
                <span className={statusClassNames[order.status]}>
                  {statusLabels[order.status]}
                </span>
              </div>

              <div className="order-meta">
                <div className="meta-block">
                  <span className="meta-label">Placed by</span>
                  <span>{order.customerGst ?? "Store user"}</span>
                </div>
                <div className="meta-block">
                  <span className="meta-label">Created</span>
                  <span>{dateFormatter.format(new Date(order.createdAt))}</span>
                </div>
                <div className="meta-block">
                  <span className="meta-label">Ship to</span>
                  <span>{order.shippingAddress}</span>
                </div>
              </div>

              <table className="items-table">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit price</th>
                    <th scope="col">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={`${order.id}-${item.productId}`}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{currencyFormatter.format(item.unitPrice)}</td>
                      <td>{currencyFormatter.format(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="order-footer">
                <div>
                  <div className="meta-label">Total amount</div>
                  <div className="order-total">
                    {currencyFormatter.format(order.totalAmount)}
                  </div>
                </div>

                {order.courierInfo ? (
                  <div className="courier-block">
                    <strong>Courier dispatched</strong>
                    <span>Provider: {order.courierInfo.courierName}</span>
                    <span>Tracking #: {order.courierInfo.trackingNumber}</span>
                    {order.courierInfo.dispatchDate ? (
                      <span>
                        Dispatched:{" "}
                        {dateFormatter.format(
                          new Date(order.courierInfo.dispatchDate)
                        )}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span className="small-muted">Courier details pending</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
