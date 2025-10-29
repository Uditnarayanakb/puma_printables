import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { api, type CreateProductPayload } from "../services/api";
import type { Product } from "../types/product";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";

type ProductsPageProps = {
  token: string;
  user: {
    username: string;
    role: string;
  };
  onLogout: () => void;
};

type FilterValue = "ALL" | "ACTIVE" | "INACTIVE";

type SortOption = "NEWEST" | "PRICE_ASC" | "PRICE_DESC";

type SpecificationField = {
  id: string;
  key: string;
  value: string;
};

type CreateProductForm = {
  sku: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  stockQuantity: string;
  active: boolean;
  specifications: SpecificationField[];
};

const FILTER_OPTIONS: Array<{ label: string; value: FilterValue }> = [
  { label: "All products", value: "ALL" },
  { label: "Active only", value: "ACTIVE" },
  { label: "Inactive only", value: "INACTIVE" },
];

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: "Newest first", value: "NEWEST" },
  { label: "Price: Low to high", value: "PRICE_ASC" },
  { label: "Price: High to low", value: "PRICE_DESC" },
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});

let specFieldCounter = 0;

const createSpecField = (): SpecificationField => ({
  id: `spec-${specFieldCounter++}`,
  key: "",
  value: "",
});

const buildInitialFormState = (): CreateProductForm => ({
  sku: "",
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  stockQuantity: "",
  active: true,
  specifications: [createSpecField(), createSpecField()],
});

export function ProductsPage({ token, user, onLogout }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [sort, setSort] = useState<SortOption>("NEWEST");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductForm>(() =>
    buildInitialFormState()
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const dataset = products.filter((product) => {
      if (filter === "ACTIVE" && !product.active) {
        return false;
      }
      if (filter === "INACTIVE" && product.active) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch)
      );
    });

    const sorted = [...dataset];
    switch (sort) {
      case "PRICE_ASC":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "PRICE_DESC":
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return sorted;
  }, [products, filter, searchTerm, sort]);

  const handleFieldChange =
    (field: keyof CreateProductForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        event.target.type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : event.target.value;

      setCreateForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleSpecChange = (
    id: string,
    field: "key" | "value",
    value: string
  ) => {
    setCreateForm((prev) => ({
      ...prev,
      specifications: prev.specifications.map((spec) =>
        spec.id === id ? { ...spec, [field]: value } : spec
      ),
    }));
  };

  const handleRemoveSpec = (id: string) => {
    setCreateForm((prev) => {
      if (prev.specifications.length === 1) {
        return prev;
      }
      return {
        ...prev,
        specifications: prev.specifications.filter((spec) => spec.id !== id),
      };
    });
  };

  const handleAddSpec = () => {
    setCreateForm((prev) => ({
      ...prev,
      specifications: [...prev.specifications, createSpecField()],
    }));
  };

  const resetForm = () => {
    setCreateForm(buildInitialFormState());
    setCreateError(null);
    setCreateSuccess(null);
  };

  const handleCancelCreate = () => {
    resetForm();
    setIsCreateOpen(false);
  };

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sku = createForm.sku.trim();
    const name = createForm.name.trim();
    const description = createForm.description.trim();
    const priceValue = Number(createForm.price);
    const stockValue = Number.parseInt(createForm.stockQuantity, 10);
    const imageUrl = createForm.imageUrl.trim();

    if (!sku || !name || !description) {
      setCreateError("Please complete SKU, name, and description.");
      setCreateSuccess(null);
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setCreateError("Enter a valid price greater than zero.");
      setCreateSuccess(null);
      return;
    }

    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setCreateError("Stock must be zero or a positive whole number.");
      setCreateSuccess(null);
      return;
    }

    const specificationsEntries = createForm.specifications
      .map((spec) => ({
        key: spec.key.trim(),
        value: spec.value.trim(),
      }))
      .filter((spec) => spec.key);

    if (specificationsEntries.length === 0) {
      setCreateError("Add at least one specification to describe the SKU.");
      setCreateSuccess(null);
      return;
    }

    const specifications = specificationsEntries.reduce<Record<string, string>>(
      (acc, entry) => {
        acc[entry.key] = entry.value;
        return acc;
      },
      {}
    );

    const payload: CreateProductPayload = {
      sku,
      name,
      description,
      price: priceValue,
      imageUrl: imageUrl ? imageUrl : undefined,
      stockQuantity: stockValue,
      specifications,
      active: createForm.active,
    };

    setIsSubmitting(true);
    setCreateError(null);
    setCreateSuccess(null);

    const controller = new AbortController();

    try {
      const created = await api.createProduct(
        token,
        payload,
        controller.signal
      );
      setProducts((prev) => [created, ...prev]);
      setCreateSuccess(`${created.name} is now in the catalog.`);
      setCreateError(null);
      setCreateForm(buildInitialFormState());
    } catch (err) {
      if (!controller.signal.aborted) {
        setCreateError(
          err instanceof Error
            ? err.message
            : "Unable to create the product right now."
        );
        setCreateSuccess(null);
      }
    } finally {
      setIsSubmitting(false);
    }
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
          <h2>Product catalog</h2>
          <p className="small-muted">
            Monitor inventory health, launch new SKUs, and keep specifications
            aligned for fabrication.
          </p>
        </div>
        <div className="content-actions">
          <div className="toolbar">
            <label className="meta-block" htmlFor="product-filter">
              <span className="meta-label">State</span>
              <select
                id="product-filter"
                className="filter-select"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as FilterValue)
                }
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="meta-block" htmlFor="product-sort">
              <span className="meta-label">Sort</span>
              <select
                id="product-sort"
                className="filter-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="meta-block" htmlFor="product-search">
              <span className="meta-label">Search</span>
              <input
                id="product-search"
                type="search"
                className="filter-input"
                placeholder="Search SKU or name"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => setIsCreateOpen((prev) => !prev)}
          >
            {isCreateOpen ? "Close builder" : "New product"}
          </button>
        </div>
      </div>

      <section className="metric-grid" aria-label="Catalog overview">
        <article
          className="metric-card"
          style={{ "--card-index": "0" } as CSSProperties}
        >
          <h3>Total SKUs</h3>
          <p className="metric-value">{products.length}</p>
          <span className="small-muted">Across all categories</span>
        </article>
        <article
          className="metric-card"
          style={{ "--card-index": "1" } as CSSProperties}
        >
          <h3>Active inventory</h3>
          <p className="metric-value">{activeCount}</p>
          <span className="small-muted">Ready to be ordered</span>
        </article>
        <article
          className="metric-card"
          style={{ "--card-index": "2" } as CSSProperties}
        >
          <h3>Inactive slots</h3>
          <p className="metric-value">{products.length - activeCount}</p>
          <span className="small-muted">Parked for revisions</span>
        </article>
      </section>

      {isCreateOpen ? (
        <section
          className="create-product-card"
          aria-label="Create product"
          style={{ "--card-index": "0" } as CSSProperties}
        >
          <header className="create-product-header">
            <div>
              <h3>Launch a new SKU</h3>
              <p className="small-muted">
                Provide merchandising details and specs so approvers can quote
                jobs confidently.
              </p>
            </div>
          </header>

          {createError ? (
            <div className="error-banner" role="alert">
              {createError}
            </div>
          ) : null}

          {createSuccess ? (
            <div className="success-banner" role="status">
              {createSuccess}
            </div>
          ) : null}

          <form className="create-product-form" onSubmit={handleCreateProduct}>
            <div className="form-grid">
              <label className="form-field" htmlFor="create-sku">
                <span className="meta-label">SKU</span>
                <input
                  id="create-sku"
                  type="text"
                  required
                  placeholder="CAT-XXX-123"
                  value={createForm.sku}
                  onChange={handleFieldChange("sku")}
                />
              </label>

              <label className="form-field" htmlFor="create-name">
                <span className="meta-label">Name</span>
                <input
                  id="create-name"
                  type="text"
                  required
                  placeholder="Product display name"
                  value={createForm.name}
                  onChange={handleFieldChange("name")}
                />
              </label>

              <label className="form-field" htmlFor="create-price">
                <span className="meta-label">Price (₹)</span>
                <input
                  id="create-price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={createForm.price}
                  onChange={handleFieldChange("price")}
                />
              </label>

              <label className="form-field" htmlFor="create-image">
                <span className="meta-label">Image URL</span>
                <input
                  id="create-image"
                  type="url"
                  placeholder="https://..."
                  value={createForm.imageUrl}
                  onChange={handleFieldChange("imageUrl")}
                />
              </label>

              <label className="form-field" htmlFor="create-stock">
                <span className="meta-label">Stock on hand</span>
                <input
                  id="create-stock"
                  type="number"
                  min="0"
                  required
                  value={createForm.stockQuantity}
                  onChange={handleFieldChange("stockQuantity")}
                />
              </label>
            </div>

            <label className="form-field" htmlFor="create-description">
              <span className="meta-label">Merchandising description</span>
              <textarea
                id="create-description"
                rows={3}
                required
                placeholder="Tell the story around this SKU so designers and approvers have context."
                value={createForm.description}
                onChange={handleFieldChange("description")}
              />
            </label>

            <fieldset className="spec-grid">
              <legend>Specifications</legend>
              <p className="small-muted">
                Capture fabrication details like material, fit, and finish.
              </p>
              {createForm.specifications.map((spec) => (
                <div key={spec.id} className="spec-row">
                  <input
                    type="text"
                    placeholder="Key (e.g. material)"
                    value={spec.key}
                    onChange={(event) =>
                      handleSpecChange(spec.id, "key", event.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Cotton)"
                    value={spec.value}
                    onChange={(event) =>
                      handleSpecChange(spec.id, "value", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="ghost-icon-button"
                    onClick={() => handleRemoveSpec(spec.id)}
                    aria-label="Remove specification"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="secondary-button"
                onClick={handleAddSpec}
              >
                Add specification
              </button>
            </fieldset>

            <label className="form-checkbox" htmlFor="create-active">
              <input
                id="create-active"
                type="checkbox"
                checked={createForm.active}
                onChange={handleFieldChange("active")}
              />
              <span>Mark as active and available for ordering</span>
            </label>

            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={handleCancelCreate}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save product"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

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
          {filteredProducts.map((product, index) => {
            const specEntries = Object.entries(product.specifications ?? {});
            const visibleSpecs = specEntries.slice(0, 4);
            const remainingSpecCount = specEntries.length - visibleSpecs.length;
            const fallbackInitial =
              product.name.trim().charAt(0) ||
              product.sku.trim().charAt(0) ||
              "P";
            return (
              <article
                key={product.id}
                className="product-card"
                style={{ "--card-index": String(index) } as CSSProperties}
              >
                <div className="product-media">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="product-media-fallback" aria-hidden="true">
                      <span>{fallbackInitial}</span>
                    </div>
                  )}
                  <span
                    className={`product-status-badge ${
                      product.active ? "is-active" : "is-inactive"
                    }`}
                  >
                    {product.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="product-body">
                  <div className="product-heading">
                    <div>
                      <h3 className="product-title">{product.name}</h3>
                      <p className="product-sku">{product.sku}</p>
                    </div>
                    <div className="product-price">
                      {currencyFormatter.format(product.price)}
                    </div>
                  </div>

                  <p className="product-description">{product.description}</p>

                  {specEntries.length > 0 ? (
                    <div className="product-spec-chip-row">
                      {visibleSpecs.map(([key, value]) => (
                        <span key={key} className="product-spec-chip">
                          <span className="spec-chip-key">{key}</span>
                          <span className="spec-chip-value">
                            {String(value)}
                          </span>
                        </span>
                      ))}
                      {remainingSpecCount > 0 ? (
                        <span className="product-spec-more">
                          +{remainingSpecCount} more
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="product-spec-empty small-muted">
                      Specs pending curation
                    </span>
                  )}

                  <footer className="product-footer">
                    <div>
                      <div className="meta-label">Stock</div>
                      <strong>{product.stockQuantity}</strong>
                    </div>
                    <div>
                      <div className="meta-label">Created</div>
                      <span>
                        {dateFormatter.format(new Date(product.createdAt))}
                      </span>
                    </div>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
