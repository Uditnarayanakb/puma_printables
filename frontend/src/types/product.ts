export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  specifications: Record<string, string | number | boolean | null>;
  stockQuantity: number;
  active: boolean;
  createdAt: string;
};
