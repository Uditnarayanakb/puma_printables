import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { api } from "../services/api";
import type { Product } from "../types/product";

type ProductsPageProps = {
  token: string;
  user: {
    username: string;
    role: string;
  };
  onLogout: () => void;
};

type FilterValue = "ALL" | "ACTIVE" | "INACTIVE";

const FILTER_OPTIONS: Array<{ label: string; value: FilterValue }> = [
  { label: "All products", value: "ALL" },
  { label: "Active only", value: "ACTIVE" },
  { label: "Inactive only", value: "INACTIVE" },
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});

export function ProductsPage({ token, user, onLogout }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    api
      .getProducts(token, controller.signal)
      .then((data) => setProducts(data))
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
  }, [token]);

  const activeCount = useMemo(
    () => products.filter((product) => product.active).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    switch (filter) {
      case "ACTIVE":
        return products.filter((product) => product.active);
      case "INACTIVE":
        return products.filter((product) => !product.active);
      default:
        return products;
    }
  }, [products, filter]);

  return (
    <AppLayout
      title="Puma Printables Portal"
      username={user.username}
      role={user.role}
      onLogout={onLogout}
    >
      <div className="content-header">
        <h2>Product catalog</h2>
        <div className="filter-bar">
          <label
            className="meta-block"
            htmlFor="product-filter"
            style={{ margin: 0 }}
          >
            <span className="meta-label">Show</span>
            <select
              id="product-filter"
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

      <section className="metric-grid" aria-label="Catalog overview">
        <article className="metric-card">
          <h3>Total SKUs</h3>
          <p className="metric-value">{products.length}</p>
          <span className="small-muted">Across all categories</span>
        </article>
        <article className="metric-card">
          <h3>Active inventory</h3>
          <p className="metric-value">{activeCount}</p>
          <span className="small-muted">Ready to be ordered</span>
        </article>
        <article className="metric-card">
          <h3>Inactive slots</h3>
          <p className="metric-value">{products.length - activeCount}</p>
          <span className="small-muted">Parked for revisions</span>
        </article>
      </section>

      {isLoading ? (
        <div className="centered">
          <div className="spinner" aria-label="Loading products" />
        </div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <h3>No products available</h3>
          <p className="small-muted">
            Try changing the filter or add a new SKU from the backend.
          </p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => {
            const specEntries = Object.entries(product.specifications ?? {});
            return (
              <article key={product.id} className="product-card">
                <header className="product-header">
                  <div>
                    <div className="meta-label">SKU</div>
                    <strong>{product.sku}</strong>
                    <div className="product-name">{product.name}</div>
                  </div>
                  <span
                    className={`product-status ${
                      product.active ? "active" : "inactive"
                    }`}
                  >
                    {product.active ? "Active" : "Inactive"}
                  </span>
                </header>

                <p className="product-description">{product.description}</p>

                <dl className="product-facts">
                  <div>
                    <dt>Price</dt>
                    <dd>{currencyFormatter.format(product.price)}</dd>
                  </div>
                  <div>
                    <dt>In stock</dt>
                    <dd>{product.stockQuantity}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{dateFormatter.format(new Date(product.createdAt))}</dd>
                  </div>
                </dl>

                {specEntries.length > 0 ? (
                  <div className="product-specs">
                    <h4>Specifications</h4>
                    <ul>
                      {specEntries.map(([key, value]) => (
                        <li key={key}>
                          <span className="meta-label">{key}</span>
                          <span>{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <span className="small-muted">
                    No specifications captured.
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
