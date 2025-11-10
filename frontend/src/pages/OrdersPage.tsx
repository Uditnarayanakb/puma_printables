import type { ChangeEvent, CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { api } from "../services/api";
import type { Order, OrderStatus } from "../types/order";
import type { Product } from "../types/product";

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

const MAX_ORDER_ITEMS = 5;
const COURIER_OPTIONS = [
  "Delhivery",
  "Blue Dart",
  "Ecom Express",
  "Shadowfax",
  "DTDC",
];
const AUTO_REFRESH_INTERVAL_MS = 60_000;
const SKELETON_PLACEHOLDERS = 3;

const generateTrackingNumber = () => {
  const base = Math.random().toString(36).slice(2, 10).toUpperCase();
  const suffix = Date.now().toString().slice(-4);
  return `${base}${suffix}`;
};

type OrdersPageProps = {
  token: string;
  user: {
    username: string;
    role: string;
  };
  onLogout: () => void;
};

type FilterValue = OrderStatus | "ALL";

type ActionModalState =
  | {
      type: "approve" | "reject";
      order: Order;
      comments: string;
    }
  | {
      type: "courier";
      order: Order;
      courierName: string;
      trackingNumber: string;
      dispatchDate: string;
    };

type CourierField = "courierName" | "trackingNumber" | "dispatchDate";

const FILTER_OPTIONS: Array<{ label: string; value: FilterValue }> = [
  { label: "All statuses", value: "ALL" },
  { label: statusLabels.PENDING_APPROVAL, value: "PENDING_APPROVAL" },
  { label: statusLabels.APPROVED, value: "APPROVED" },
  { label: statusLabels.REJECTED, value: "REJECTED" },
  { label: statusLabels.IN_TRANSIT, value: "IN_TRANSIT" },
  { label: statusLabels.FULFILLED, value: "FULFILLED" },
];

const emptyCreateForm = () => ({
  shippingAddress: "",
  customerGst: "",
  items: [{ productId: "", quantity: 1 }],
});

const toDateTimeLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function OrdersPage({ token, user, onLogout }: OrdersPageProps) {
  const canCreateOrders = user.role === "STORE_USER" || user.role === "ADMIN";
  const canManageApprovals = user.role === "APPROVER" || user.role === "ADMIN";

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productImageLookup, setProductImageLookup] = useState<
    Record<string, string | null>
  >({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const skeletonPlaceholders = useMemo(
    () => Array.from({ length: SKELETON_PLACEHOLDERS }),
    []
  );

  const fetchOrders = useCallback(
    async (signal?: AbortSignal) => {
      const statusParam = filter === "ALL" ? undefined : filter;
      return api.getOrders(token, statusParam, signal);
    },
    [token, filter]
  );

  const refreshOrders = useCallback(async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh orders right now"
      );
    }
  }, [fetchOrders]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrders();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchOrders(controller.signal)
      .then((data) => {
        setOrders(data);
        setLastSyncedAt(new Date());
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
  }, [fetchOrders]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshOrders().catch(() => undefined);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshOrders]);

  useEffect(() => {
    const controller = new AbortController();

    api
      .getProducts(token, controller.signal)
      .then((data) => {
        setProductImageLookup(
          data.reduce<Record<string, string | null>>((acc, product) => {
            acc[product.id] = product.imageUrl ?? null;
            return acc;
          }, {})
        );
      })
      .catch(() => {
        // Non-blocking optional fetch; fallback visuals will cover missing images.
      });

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    if (!showCreateModal || !canCreateOrders) {
      return undefined;
    }

    const controller = new AbortController();
    setProductsError(null);
    setIsProductsLoading(true);

    api
      .getProducts(token, controller.signal)
      .then((data) => {
        const activeProducts = data.filter((product) => product.active);
        setProducts(activeProducts);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setProductsError(
          err instanceof Error
            ? err.message
            : "Unable to load catalog data right now"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsProductsLoading(false);
        }
      });

    return () => controller.abort();
  }, [showCreateModal, canCreateOrders, token]);

  const pageTitle = useMemo(() => {
    return filter === "ALL" ? "All orders" : `${statusLabels[filter]} orders`;
  }, [filter]);

  const heroCopy = canCreateOrders
    ? "Create requests, track fulfilment, and dispatch faster."
    : "Stay ahead of approvals and watch fulfilment at a glance.";

  const handleCreateFieldChange =
    (field: "shippingAddress" | "customerGst") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setCreateForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleCreateItemChange = (
    index: number,
    field: "productId" | "quantity",
    value: string
  ) => {
    setCreateForm((prev) => {
      const nextItems = prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }
        if (field === "quantity") {
          const parsed = Number.parseInt(value, 10);
          return {
            ...item,
            quantity: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
          };
        }
        return { ...item, productId: value };
      });
      return { ...prev, items: nextItems };
    });
  };

  const handleAddOrderItem = () => {
    setCreateForm((prev) => {
      if (prev.items.length >= MAX_ORDER_ITEMS) {
        return prev;
      }
      return {
        ...prev,
        items: [...prev.items, { productId: "", quantity: 1 }],
      };
    });
  };

  const handleRemoveOrderItem = (index: number) => {
    setCreateForm((prev) => {
      if (prev.items.length === 1) {
        return prev;
      }
      const nextItems = prev.items.filter(
        (_, itemIndex) => itemIndex !== index
      );
      return { ...prev, items: nextItems };
    });
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError(null);
    setCreateSubmitting(false);
    setCreateForm(emptyCreateForm);
  };

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const shippingAddress = createForm.shippingAddress.trim();
    if (!shippingAddress) {
      setCreateError("Shipping address is required");
      return;
    }

    const preparedItems = createForm.items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, item.quantity),
      }));

    if (preparedItems.length === 0) {
      setCreateError("Choose at least one product");
      return;
    }

    setCreateSubmitting(true);

    try {
      await api.createOrder(token, {
        shippingAddress,
        customerGst: createForm.customerGst.trim() || null,
        items: preparedItems,
      });
      closeCreateModal();
      setSuccessMessage("Order created successfully");
      await refreshOrders();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Unable to create order"
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openApproveModal = (order: Order) => {
    setActionError(null);
    setActionModal({ type: "approve", order, comments: "" });
  };

  const openRejectModal = (order: Order) => {
    setActionError(null);
    setActionModal({ type: "reject", order, comments: "" });
  };

  const openCourierModal = (order: Order) => {
    const defaultDate = order.courierInfo?.dispatchDate
      ? toDateTimeLocal(new Date(order.courierInfo.dispatchDate))
      : toDateTimeLocal(new Date());
    const fallbackCourier =
      order.courierInfo?.courierName ?? COURIER_OPTIONS[0];
    const fallbackTracking =
      order.courierInfo?.trackingNumber ?? generateTrackingNumber();

    setActionError(null);
    setActionModal({
      type: "courier",
      order,
      courierName: fallbackCourier,
      trackingNumber: fallbackTracking,
      dispatchDate: defaultDate,
    });
  };

  const closeActionModal = () => {
    setActionModal(null);
    setActionError(null);
    setActionSubmitting(false);
  };

  const handleActionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actionModal) {
      return;
    }

    setActionSubmitting(true);
    setActionError(null);

    try {
      if (actionModal.type === "approve" || actionModal.type === "reject") {
        if (!actionModal.comments.trim()) {
          setActionError("Comments are required");
          setActionSubmitting(false);
          return;
        }
        if (actionModal.type === "approve") {
          await api.approveOrder(token, actionModal.order.id, {
            comments: actionModal.comments.trim(),
          });
          setSuccessMessage("Order approved");
        } else {
          await api.rejectOrder(token, actionModal.order.id, {
            comments: actionModal.comments.trim(),
          });
          setSuccessMessage("Order rejected");
        }
      } else if (actionModal.type === "courier") {
        const courierName = actionModal.courierName.trim();
        const trackingNumber = actionModal.trackingNumber.trim();
        const dispatchDate = actionModal.dispatchDate;

        if (!courierName || !trackingNumber || !dispatchDate) {
          setActionError("All courier fields are required");
          setActionSubmitting(false);
          return;
        }

        const isoDate = new Date(dispatchDate).toISOString();

        await api.addCourierInfo(token, actionModal.order.id, {
          courierName,
          trackingNumber,
          dispatchDate: isoDate,
        });
        setSuccessMessage("Courier details captured");
      }

      closeActionModal();
      await refreshOrders();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to process request"
      );
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleActionFieldChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!actionModal || actionModal.type === "courier") {
      return;
    }
    setActionModal({ ...actionModal, comments: event.target.value });
  };

  const handleCourierFieldChange =
    (field: CourierField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!actionModal || actionModal.type !== "courier") {
        return;
      }

      setActionModal({
        ...actionModal,
        [field]: event.target.value,
      });
    };

  const handleGenerateTrackingNumber = () => {
    if (!actionModal || actionModal.type !== "courier") {
      return;
    }

    setActionModal({
      ...actionModal,
      trackingNumber: generateTrackingNumber(),
    });
  };

  return (
    <AppLayout
      title="Puma Printables Portal"
      username={user.username}
      role={user.role}
      onLogout={onLogout}
    >
      <div className="content-header">
        <div className="content-title">
          <h2>{pageTitle}</h2>
          <p className="small-muted">{heroCopy}</p>
        </div>
        <div className="content-actions">
          <button
            type="button"
            className="secondary-button ghost"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          {canCreateOrders ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowCreateModal(true)}
            >
              New order
            </button>
          ) : null}
        </div>
      </div>

      <div className="page-toolbar">
        <div
          className="filter-chips"
          role="group"
          aria-label="Filter by order status"
        >
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-chip${
                filter === option.value ? " is-active" : ""
              }`}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!isLoading && !error && orders.length > 0 ? (
        <p className="view-meta small-muted">
          Showing {orders.length} {orders.length === 1 ? "order" : "orders"} in
          this view
          {lastSyncedAt
            ? ` • Updated ${dateFormatter.format(lastSyncedAt)}`
            : ""}
          .
        </p>
      ) : null}

      {successMessage ? (
        <div className="success-banner" role="status">
          {successMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="order-grid skeleton-grid" aria-hidden="true">
          {skeletonPlaceholders.map((_, index) => (
            <article key={index} className="order-card skeleton-card">
              <div className="skeleton-line skeleton-line-lg" />
              <div className="skeleton-line skeleton-line-sm" />
              <div className="skeleton-avatar-row">
                <div className="skeleton-avatar" />
                <div className="skeleton-body">
                  <div className="skeleton-line skeleton-line-md" />
                  <div className="skeleton-line skeleton-line-xs" />
                </div>
              </div>
              <div className="skeleton-line skeleton-line-md" />
              <div className="skeleton-line skeleton-line-xs" />
            </article>
          ))}
        </div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders found</h3>
          <p className="small-muted">
            {canCreateOrders
              ? "Use the New order button to raise a request."
              : "Try switching filters or ask the store team to raise an order."}
          </p>
        </div>
      ) : (
        <div className="order-grid">
          {orders.map((order, index) => (
            <article
              key={order.id}
              className="order-card"
              style={{ "--card-index": String(index) } as CSSProperties}
            >
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

              <div className="order-items-deck" aria-label="Line items">
                {order.items.map((item) => {
                  const resolvedImage =
                    item.imageUrl ?? productImageLookup[item.productId] ?? null;
                  const fallbackInitial =
                    item.productName.trim().charAt(0) || "P";
                  return (
                    <div
                      key={`${order.id}-${item.productId}`}
                      className="order-item-chip"
                    >
                      <div className="order-item-thumb">
                        {resolvedImage ? (
                          <img
                            src={resolvedImage}
                            alt={item.productName}
                            loading="lazy"
                          />
                        ) : (
                          <span aria-hidden="true">{fallbackInitial}</span>
                        )}
                      </div>

                      <div className="order-item-body">
                        <div className="order-item-top">
                          <span className="order-item-name">
                            {item.productName}
                          </span>
                          <span className="order-item-quantity">
                            ×{item.quantity}
                          </span>
                        </div>
                        <div className="order-item-bottom">
                          <span>
                            {currencyFormatter.format(item.unitPrice)} each
                          </span>
                          <span className="order-item-total">
                            {currencyFormatter.format(item.lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canManageApprovals ? (
                <div className="order-actions">
                  {order.status === "PENDING_APPROVAL" ? (
                    <>
                      <button
                        type="button"
                        className="primary-button action-button"
                        onClick={() => openApproveModal(order)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="secondary-button action-button danger"
                        onClick={() => openRejectModal(order)}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}

                  {order.status === "APPROVED" && !order.courierInfo ? (
                    <button
                      type="button"
                      className="secondary-button action-button"
                      onClick={() => openCourierModal(order)}
                    >
                      Add courier
                    </button>
                  ) : null}
                </div>
              ) : null}

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

      {showCreateModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <h3>Raise a new order</h3>
                <p className="small-muted">
                  Pick products from the live catalog and capture fulfilment
                  details.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={closeCreateModal}
              >
                Close
              </button>
            </header>

            {productsError ? (
              <div className="error-banner" role="alert">
                {productsError}
              </div>
            ) : null}

            {createError ? (
              <div className="error-banner" role="alert">
                {createError}
              </div>
            ) : null}

            <form className="modal-form" onSubmit={handleCreateOrder}>
              <label className="form-field" htmlFor="order-shipping">
                <span className="meta-label">Shipping address</span>
                <textarea
                  id="order-shipping"
                  required
                  rows={3}
                  value={createForm.shippingAddress}
                  onChange={handleCreateFieldChange("shippingAddress")}
                />
              </label>

              <label className="form-field" htmlFor="order-gst">
                <span className="meta-label">Customer GST (optional)</span>
                <input
                  id="order-gst"
                  type="text"
                  value={createForm.customerGst}
                  onChange={handleCreateFieldChange("customerGst")}
                  placeholder="GSTIN12345"
                />
              </label>

              <fieldset className="order-items-fieldset">
                <legend>Line items</legend>
                <p className="small-muted">
                  Select up to {MAX_ORDER_ITEMS} SKUs. Quantities default to 1.
                </p>

                {isProductsLoading ? (
                  <div className="centered">
                    <div className="spinner" aria-label="Loading products" />
                  </div>
                ) : products.length === 0 ? (
                  <p className="small-muted">
                    No active products available. Add catalog entries first.
                  </p>
                ) : (
                  <div className="item-grid">
                    {createForm.items.map((item, index) => (
                      <div key={index} className="item-row">
                        <label
                          className="form-field"
                          htmlFor={`order-item-${index}`}
                        >
                          <span className="meta-label">Product</span>
                          <select
                            id={`order-item-${index}`}
                            required
                            value={item.productId}
                            onChange={(event) =>
                              handleCreateItemChange(
                                index,
                                "productId",
                                event.target.value
                              )
                            }
                          >
                            <option value="">Select a SKU</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ·{" "}
                                {currencyFormatter.format(product.price)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label
                          className="form-field"
                          htmlFor={`order-qty-${index}`}
                        >
                          <span className="meta-label">Quantity</span>
                          <input
                            id={`order-qty-${index}`}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              handleCreateItemChange(
                                index,
                                "quantity",
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <button
                          type="button"
                          className="ghost-icon-button"
                          onClick={() => handleRemoveOrderItem(index)}
                          disabled={createForm.items.length === 1}
                          aria-label="Remove line item"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleAddOrderItem}
                    disabled={
                      createForm.items.length >= MAX_ORDER_ITEMS ||
                      products.length === 0
                    }
                  >
                    Add another item
                  </button>
                </div>
              </fieldset>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={createSubmitting || products.length === 0}
                >
                  {createSubmitting ? "Creating…" : "Create order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {actionModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <h3>
                  {actionModal.type === "approve"
                    ? "Approve order"
                    : actionModal.type === "reject"
                    ? "Reject order"
                    : actionModal.order.courierInfo
                    ? "Update courier details"
                    : "Add courier details"}
                </h3>
                <p className="small-muted">Order ID: {actionModal.order.id}</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={closeActionModal}
              >
                Close
              </button>
            </header>

            {actionError ? (
              <div className="error-banner" role="alert">
                {actionError}
              </div>
            ) : null}

            <form className="modal-form" onSubmit={handleActionSubmit}>
              {actionModal.type === "approve" ||
              actionModal.type === "reject" ? (
                <label className="form-field" htmlFor="action-comments">
                  <span className="meta-label">Comments</span>
                  <textarea
                    id="action-comments"
                    required
                    rows={3}
                    value={actionModal.comments}
                    onChange={handleActionFieldChange}
                  />
                </label>
              ) : null}

              {actionModal.type === "courier" ? (
                <>
                  <label className="form-field" htmlFor="courier-name">
                    <span className="meta-label">Courier</span>
                    <select
                      id="courier-name"
                      required
                      value={actionModal.courierName}
                      onChange={handleCourierFieldChange("courierName")}
                    >
                      {COURIER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      {!COURIER_OPTIONS.includes(actionModal.courierName) ? (
                        <option value={actionModal.courierName}>
                          {actionModal.courierName}
                        </option>
                      ) : null}
                    </select>
                  </label>

                  <label className="form-field" htmlFor="courier-tracking">
                    <span className="meta-label">Tracking number</span>
                    <div className="input-with-button">
                      <input
                        id="courier-tracking"
                        type="text"
                        required
                        value={actionModal.trackingNumber}
                        onChange={handleCourierFieldChange("trackingNumber")}
                      />
                      <button
                        type="button"
                        className="secondary-button slim"
                        onClick={handleGenerateTrackingNumber}
                      >
                        Generate
                      </button>
                    </div>
                  </label>

                  <label className="form-field" htmlFor="courier-dispatch">
                    <span className="meta-label">Dispatch date</span>
                    <input
                      id="courier-dispatch"
                      type="datetime-local"
                      required
                      value={actionModal.dispatchDate}
                      onChange={handleCourierFieldChange("dispatchDate")}
                    />
                  </label>
                </>
              ) : null}

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={actionSubmitting}
                >
                  {actionSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
