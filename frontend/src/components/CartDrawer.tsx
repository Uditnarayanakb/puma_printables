import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useCart } from "../hooks/useCart";

export function CartDrawer() {
  const {
    items,
    totalQuantity,
    isOpen,
    authToken,
    closeCart,
    incrementItem,
    decrementItem,
    setItemQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [isOpen]);

  useEffect(() => {
    if (items.length === 0) {
      setShippingAddress("");
      setCustomerGst("");
    }
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      if (isOpen) {
        closeCart();
      }
    }
  }, [location.pathname, isOpen, closeCart]);

  const hasUnavailableItems = useMemo(
    () =>
      items.some(
        (item) => !item.product.active || item.product.stockQuantity <= 0
      ),
    [items]
  );

  const availabilityMessages = useMemo(() => {
    return items
      .filter((item) => !item.product.active || item.product.stockQuantity <= 0)
      .map((item) => {
        if (!item.product.active) {
          return `${item.product.name} is currently inactive.`;
        }
        if (item.product.stockQuantity <= 0) {
          return `${item.product.name} is out of stock.`;
        }
        return null;
      })
      .filter(Boolean) as string[];
  }, [items]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      drawerRef.current &&
      !drawerRef.current.contains(event.target as Node)
    ) {
      closeCart();
    }
  };

  const handleQuantityInput = (productId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    setItemQuantity(productId, parsed);
  };

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    if (items.length === 0) {
      setError("Add items to your cart before placing an order.");
      return;
    }
    const address = shippingAddress.trim();
    if (!address) {
      setError("Shipping address is required.");
      return;
    }
    if (hasUnavailableItems) {
      setError("Remove unavailable items before placing the order.");
      return;
    }

    setPlacingOrder(true);
    setError(null);

    try {
      await api.createOrder(authToken, {
        shippingAddress: address,
        customerGst: customerGst.trim() || null,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      });
      setSuccess("Order placed successfully.");
      clearCart();
      closeCart();
      navigate("/orders", { replace: false });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to place the order right now."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="cart-overlay"
      role="presentation"
      onMouseDown={handleOverlayClick}
    >
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        ref={drawerRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="cart-drawer-header">
          <div>
            <h2>Cart</h2>
            <p className="small-muted">Review your picks and place an order.</p>
          </div>
          <button
            type="button"
            className="ghost-icon-button"
            onClick={closeCart}
            aria-label="Close cart"
          >
            ✕
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is currently empty.</p>
            <span className="small-muted">Browse products to add items.</span>
          </div>
        ) : (
          <div className="cart-content">
            <ul className="cart-item-list">
              {items.map(({ product, quantity }) => {
                const isLowStock =
                  product.stockQuantity <= 3 && product.stockQuantity > 0;
                return (
                  <li key={product.id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-thumbnail" aria-hidden="true">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" />
                        ) : (
                          <span>{product.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h3>{product.name}</h3>
                        <p className="small-muted">{product.sku}</p>
                        {!product.active ? (
                          <span className="cart-item-warning">
                            Inactive SKU
                          </span>
                        ) : null}
                        {product.stockQuantity <= 0 ? (
                          <span className="cart-item-warning">
                            Out of stock
                          </span>
                        ) : null}
                        {isLowStock && product.active ? (
                          <span className="cart-item-subtle">
                            Only {product.stockQuantity} left
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-stepper">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => decrementItem(product.id)}
                          disabled={quantity <= 1 || placingOrder}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={product.stockQuantity}
                          value={quantity}
                          onChange={(event) =>
                            handleQuantityInput(product.id, event.target.value)
                          }
                          disabled={placingOrder}
                        />
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => incrementItem(product.id)}
                          disabled={
                            quantity >= product.stockQuantity || placingOrder
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="ghost-icon-button"
                        onClick={() => removeItem(product.id)}
                        disabled={placingOrder}
                        aria-label={`Remove ${product.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <form className="cart-footer" onSubmit={handleCheckout}>
          <div className="cart-summary">
            <div>
              <div className="meta-label">Items in cart</div>
              <strong>{totalQuantity}</strong>
            </div>
            <span className="small-muted">
              Pricing is managed outside this workflow.
            </span>
          </div>

          <label className="meta-block" htmlFor="cart-shipping-address">
            <span className="meta-label">Shipping address</span>
            <textarea
              id="cart-shipping-address"
              rows={3}
              required
              value={shippingAddress}
              onChange={(event) => setShippingAddress(event.target.value)}
              disabled={placingOrder || items.length === 0}
            />
          </label>

          <label className="meta-block" htmlFor="cart-customer-gst">
            <span className="meta-label">Customer GST (optional)</span>
            <input
              id="cart-customer-gst"
              type="text"
              value={customerGst}
              onChange={(event) => setCustomerGst(event.target.value)}
              disabled={placingOrder || items.length === 0}
            />
          </label>

          {availabilityMessages.length > 0 ? (
            <div className="cart-warning" role="alert">
              {availabilityMessages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}

          {error ? <div className="error-banner">{error}</div> : null}
          {success ? <div className="success-banner">{success}</div> : null}

          <div className="cart-footer-actions">
            <button
              type="button"
              className="secondary-button ghost"
              onClick={closeCart}
              disabled={placingOrder}
            >
              Continue browsing
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={
                placingOrder ||
                items.length === 0 ||
                !shippingAddress.trim() ||
                hasUnavailableItems
              }
            >
              {placingOrder ? "Placing order…" : "Place order"}
            </button>
          </div>
        </form>
      </aside>
    </div>,
    document.body
  );
}
