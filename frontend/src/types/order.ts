export type OrderStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "IN_TRANSIT"
  | "FULFILLED";

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CourierInfo = {
  courierName: string;
  trackingNumber: string;
  dispatchDate: string | null;
} | null;

export type Order = {
  id: string;
  status: OrderStatus;
  shippingAddress: string;
  customerGst: string | null;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  courierInfo: CourierInfo;
};

export type OrdersResponse = Order[];

type Role = "ADMIN" | "APPROVER" | "STORE_USER";

export type JwtPayload = {
  sub: string;
  role: Role;
  exp: number;
};
