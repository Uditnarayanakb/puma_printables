export type OrderStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_TRANSIT"
  | "FULFILLED";

export type OrderItem = {
  productId: string;
  productName: string;
  imageUrl?: string | null;
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
  deliveryAddress: string | null;
  customerGst: string | null;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  courierInfo: CourierInfo;
};

export type OrdersResponse = Order[];

export type UserRole =
  | "ADMIN"
  | "APPROVER"
  | "STORE_USER"
  | "FULFILLMENT_AGENT";

export type JwtPayload = {
  sub: string;
  role: UserRole;
  exp: number;
  name?: string;
  avatar?: string;
  provider?: "LOCAL" | "GOOGLE";
};
