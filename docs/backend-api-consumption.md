# Backend API Consumption Guide

This note outlines how client applications (web frontend or infrastructure services) should call the current backend flows. All examples assume the backend runs locally at `http://localhost:8080`.

## Authentication and Authorization

- Call `POST /api/v1/auth/login` with JSON `{ "username": "...", "password": "..." }`.
- The response contains `{ "token": "<JWT>" }`; store this value client side.
- Send the token on every protected request using the header `Authorization: Bearer <JWT>`.
- Roles: `ADMIN` manages catalog and user provisioning, `STORE_USER` places orders, `APPROVER` approves orders and adds courier data.

## Catalog Management

### Create or Update Products (Admin)

```
POST /api/v1/products
Authorization: Bearer <ADMIN token>
Content-Type: application/json

{
  "sku": "SKU-1000",
  "name": "Puma Hoodie",
  "description": "Warm fleece hoodie",
  "price": 2499.00,
  "specifications": { "material": "cotton", "size": "L" },
  "stockQuantity": 50,
  "active": true
}
```

Response: `201 Created` with the created product JSON (includes generated `id`).

### List Products (Store users + approvers)

```
GET /api/v1/products
Authorization: Bearer <token>
```

Response: `200 OK` with an array of products. Use the `id` when creating order items.

## Order Lifecycle

### Create Order (Store user)

```
POST /api/v1/orders
Authorization: Bearer <STORE_USER token>
Content-Type: application/json

{
  "shippingAddress": "221B Baker Street, London",
  "customerGst": "GSTIN12345",
  "items": [
    { "productId": "<product-id>", "quantity": 2 }
  ]
}
```

Response: `201 Created` with an `OrderResponse` JSON. Initial `status` is `PENDING_APPROVAL` and `totalAmount` reflects the sum of item quantities * product prices.

### Approve Order (Approver)

```
POST /api/v1/orders/{orderId}/approve
Authorization: Bearer <APPROVER token>
Content-Type: application/json

{
  "comments": "Approved for dispatch"
}
```

Response: `200 OK` containing the updated order body with `status` set to `APPROVED`.

### Add Courier Info (Approver)

```
POST /api/v1/orders/{orderId}/courier
Authorization: Bearer <APPROVER token>
Content-Type: application/json

{
  "courierName": "Delhivery",
  "trackingNumber": "DL1234567890",
  "dispatchDate": "2025-10-20T05:30:00Z"
}
```

Response: `201 Created` with the order now in `IN_TRANSIT` and nested `courierInfo` details.

## Frontend Notes

- Store tokens securely (browser storage or memory store) and refresh via login when requests return `401`.
- Show role-specific UI based on JWT claims (roles are enforced server side to prevent misuse).
- Use optimistic UI updates only after receiving `2xx` responses; errors return JSON `{ "message": "..." }` with appropriate HTTP status codes.

## Infrastructure Notes

- CI/CD can replay the full lifecycle using the attached integration test `OrderLifecycleIntegrationTest` as a reference for request ordering and payload formats.
- Scheduled jobs (for example, courier status polling) must authenticate as an `APPROVER` or `ADMIN` service account before calling courier-related endpoints.
- When deploying to non-local environments, configure services with the correct base URL and ensure database migrations run (Liquibase executes on application start).
