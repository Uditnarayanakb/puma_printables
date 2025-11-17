/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "../types/product";
import { CartDrawer } from "../components/CartDrawer";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  isOpen: boolean;
  authToken: string | null;
  addItem: (product: Product, quantity?: number) => void;
  setItemQuantity: (productId: string, quantity: number) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  syncProductDetails: (products: Product[]) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

type CartProviderProps = {
  token: string | null;
  children: ReactNode;
};

export function CartProvider({ token, children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setIsOpen(false);
    }
  }, [token]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    if (!product.active || product.stockQuantity <= 0) {
      return;
    }
    const sanitizedQuantity = Math.max(1, quantity);
    setItems((prev) => {
      const next = [...prev];
      const existingIndex = next.findIndex(
        (item) => item.product.id === product.id
      );
      if (existingIndex === -1) {
        next.push({
          product,
          quantity: Math.min(sanitizedQuantity, product.stockQuantity),
        });
        return next;
      }
      const existing = next[existingIndex];
      const updatedQuantity = Math.min(
        existing.quantity + sanitizedQuantity,
        product.stockQuantity
      );
      next[existingIndex] = {
        product,
        quantity: updatedQuantity,
      };
      return next;
    });
  }, []);

  const setItemQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      const nextQuantity = Number.isFinite(quantity)
        ? Math.max(0, Math.floor(quantity))
        : 0;
      if (nextQuantity === 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }
        const capped = Math.min(nextQuantity, item.product.stockQuantity);
        return {
          product: item.product,
          quantity: capped,
        };
      });
    });
  }, []);

  const incrementItem = useCallback((productId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }
        const capped = Math.min(item.quantity + 1, item.product.stockQuantity);
        return {
          product: item.product,
          quantity: capped,
        };
      })
    );
  }, []);

  const decrementItem = useCallback((productId: string) => {
    setItems(
      (prev) =>
        prev
          .map((item) => {
            if (item.product.id !== productId) {
              return item;
            }
            const nextQuantity = item.quantity - 1;
            if (nextQuantity <= 0) {
              return null;
            }
            return {
              product: item.product,
              quantity: nextQuantity,
            };
          })
          .filter(Boolean) as CartItem[]
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openCart = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCart = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const syncProductDetails = useCallback((products: Product[]) => {
    if (!products.length) {
      return;
    }
    setItems(
      (prev) =>
        prev
          .map((item) => {
            const updated = products.find(
              (product) => product.id === item.product.id
            );
            if (!updated) {
              return item;
            }
            const cappedQuantity = Math.min(
              item.quantity,
              updated.stockQuantity
            );
            if (
              !updated.active ||
              updated.stockQuantity <= 0 ||
              cappedQuantity === 0
            ) {
              return null;
            }
            return {
              product: updated,
              quantity: cappedQuantity,
            };
          })
          .filter(Boolean) as CartItem[]
    );
  }, []);

  const totalQuantity = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalQuantity,
      isOpen,
      authToken: token,
      addItem,
      setItemQuantity,
      incrementItem,
      decrementItem,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
      syncProductDetails,
    }),
    [
      items,
      totalQuantity,
      isOpen,
      token,
      addItem,
      setItemQuantity,
      incrementItem,
      decrementItem,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
      syncProductDetails,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
