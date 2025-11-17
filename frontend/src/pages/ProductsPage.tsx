import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { api, API_BASE_URL } from "../services/api";
import type { Product } from "../types/product";
import type { CSSProperties } from "react";
import { useCart } from "../hooks/useCart";

type ProductsPageProps = {
  token: string;
  user: {
    username: string;
    role: string;
  };
  onLogout: () => void;
};

type ImagePreviewState = {
  url: string;
  title: string;
};

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const resolveProductImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) {
    return undefined;
  }
  if (ABSOLUTE_URL_PATTERN.test(imageUrl)) {
    return encodeURI(imageUrl);
  }
  const normalized = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return encodeURI(`${API_BASE_URL}${normalized}`);
};

export function ProductsPage({ token, user, onLogout }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImagePreviewState | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const canOrder = user.role === "STORE_USER" || user.role === "ADMIN";
  const {
    items: cartItems,
    addItem,
    setItemQuantity,
    openCart,
    syncProductDetails,
  } = useCart();

  const cartLookup = useMemo(() => {
    return new Map(cartItems.map((entry) => [entry.product.id, entry]));
  }, [cartItems]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    api
      .getProducts(token, controller.signal)
      .then((data) => {
        setProducts(data);
        syncProductDetails(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the product catalog right now"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [token, syncProductDetails]);

  useEffect(() => {
    if (!preview) {
      setIsPreviewLoading(false);
      setPreviewError(null);
      return;
    }
    setIsPreviewLoading(true);
    setPreviewError(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [preview]);

  const visibleProducts = useMemo(() => {
    return [...products].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [products]);

  return (
    <AppLayout
      title="Puma Printables Portal"
      username={user.username}
      role={user.role}
      onLogout={onLogout}
    >
      {isLoading ? (
        <div className="centered">
          <div className="spinner" aria-label="Loading products" />
        </div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : visibleProducts.length === 0 ? (
        <div className="empty-state">
          <h3>No products available</h3>
          <p className="small-muted">Please check back later.</p>
        </div>
      ) : (
        <div className="products-grid">
          {visibleProducts.map((product, index) => {
            const resolvedImageUrl = resolveProductImageUrl(product.imageUrl);
            const fallbackInitial =
              product.name.trim().charAt(0) ||
              product.sku.trim().charAt(0) ||
              "P";
            const cartEntry = cartLookup.get(product.id);
            const quantity = cartEntry?.quantity ?? 0;
            const availableToOrder =
              product.active && product.stockQuantity > 0;
            return (
              <article
                key={product.id}
                className="product-card"
                style={{ "--card-index": String(index) } as CSSProperties}
              >
                <div className="product-media">
                  {resolvedImageUrl ? (
                    <button
                      type="button"
                      className="product-media-button"
                      onClick={() =>
                        setPreview({
                          url: resolvedImageUrl,
                          title: product.name,
                        })
                      }
                      aria-label={`Preview ${product.name}`}
                    >
                      <img
                        src={resolvedImageUrl}
                        alt={product.name}
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div className="product-media-fallback" aria-hidden="true">
                      <span>{fallbackInitial}</span>
                    </div>
                  )}
                </div>

                <div className="product-body">
                  <h3 className="product-title">{product.name}</h3>

                  {canOrder ? (
                    <div className="product-cart-actions simple">
                      <button
                        type="button"
                        className="add-to-cart-button"
                        onClick={() => addItem(product, 1)}
                        disabled={!availableToOrder}
                      >
                        {availableToOrder
                          ? quantity > 0
                            ? "Add another"
                            : "Add to cart"
                          : "Unavailable"}
                      </button>
                      {quantity > 0 ? (
                        <div className="product-cart-status">
                          <span>{quantity} in cart</span>
                          <button
                            type="button"
                            className="view-cart-link"
                            onClick={openCart}
                          >
                            View cart
                          </button>
                          <button
                            type="button"
                            className="ghost-icon-button"
                            onClick={() => setItemQuantity(product.id, 0)}
                            aria-label="Remove from cart"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {preview ? (
        <div
          className="image-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Previewing ${preview.title}`}
          onClick={() => setPreview(null)}
        >
          <div
            className="image-preview-layer"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="image-preview-header">
              <span className="image-preview-title">{preview.title}</span>
              <button
                type="button"
                className="image-preview-close"
                onClick={() => setPreview(null)}
                aria-label="Close image preview"
              >
                ✕
              </button>
            </header>
            <div className="image-preview-media">
              {isPreviewLoading ? (
                <div className="spinner" aria-label="Loading image" />
              ) : previewError ? (
                <div className="error-banner" role="alert">
                  {previewError}
                </div>
              ) : null}
              <img
                src={preview.url}
                alt={preview.title}
                onLoad={() => setIsPreviewLoading(false)}
                onError={() => {
                  setIsPreviewLoading(false);
                  setPreviewError("Unable to display this image.");
                }}
                style={{
                  display: previewError || isPreviewLoading ? "none" : "block",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
