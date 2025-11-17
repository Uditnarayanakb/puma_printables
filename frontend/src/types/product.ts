export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  specifications: Record<string, string | number | boolean | null>;
  stockQuantity: number;
  active: boolean;
  createdAt: string;
};
