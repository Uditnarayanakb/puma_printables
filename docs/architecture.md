# System Architecture and Setup

## 1. Technology Stack

- **Backend**: Spring Boot RESTful APIs for business logic, security, persistence, and email delivery
- **Database**: PostgreSQL for relational storage, JSONB support, and cloud readiness
- **Frontend**: React 18 running on Vite for lightning-fast builds and HMR
- **Notification**: Spring Mail with SMTP (SendGrid, SES, or postfix/smtp4dev for dev)
- **Build Tooling**:
  - Maven for backend dependency management and builds
  - Vite + npm/yarn scripts for the React client

## 2. Development Environment Setup

- Java Development Kit 17 (11+ acceptable; project tested on 17)
- IntelliJ IDEA (Community or Ultimate) for backend/full-stack work
- PostgreSQL running locally (Docker container or native install) plus managed instance for prod
- Node.js 18 LTS (14+ minimum) with npm or yarn for frontend
- Git for version control
- Optional: Docker Desktop for local container orchestration

### Environment Variables

| Variable                                                                            | Purpose                               |
| ----------------------------------------------------------------------------------- | ------------------------------------- |
| `SPRING_DATASOURCE_URL`                                                             | JDBC connection string for PostgreSQL |
| `SPRING_DATASOURCE_USERNAME`                                                        | DB username                           |
| `SPRING_DATASOURCE_PASSWORD`                                                        | DB password                           |
| `SPRING_MAIL_HOST` `SPRING_MAIL_PORT` `SPRING_MAIL_USERNAME` `SPRING_MAIL_PASSWORD` | SMTP details                          |
| `JWT_SECRET`                                                                        | Symmetric signing key for JWT tokens  |
| `JWT_EXPIRY_MINUTES`                                                                | Token lifetime (default 60)           |

## 3. Database Design

| Entity       | Field            | Type                  | Notes                                                                 |
| ------------ | ---------------- | --------------------- | --------------------------------------------------------------------- |
| User         | id               | UUID (PK)             | Generated via UUIDv4                                                  |
|              | username         | VARCHAR(50) UNIQUE    | Login identifier                                                      |
|              | password         | VARCHAR(255)          | BCrypt hashed                                                         |
|              | role             | VARCHAR(20)           | Enum: `STORE_USER`, `APPROVER`                                        |
|              | email            | VARCHAR(100)          | Notification recipient                                                |
| Product      | id               | UUID (PK)             | Primary key                                                           |
|              | sku              | VARCHAR(50) UNIQUE    | Stock keeping unit                                                    |
|              | name             | VARCHAR(100)          | Display label                                                         |
|              | description      | TEXT                  | Detailed overview                                                     |
|              | price            | NUMERIC(10,2)         | Currency                                                              |
|              | specifications   | JSONB                 | Extensible product metadata                                           |
|              | stock_quantity   | INTEGER               | Inventory count                                                       |
|              | is_active        | BOOLEAN               | Availability flag                                                     |
| Order        | id               | UUID (PK)             | Order identifier                                                      |
|              | user_id          | UUID FK -> User.id    | Placing user                                                          |
|              | status           | VARCHAR(20)           | `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `IN_TRANSIT`, `FULFILLED` |
|              | customer_gst     | VARCHAR(20)           | GST number                                                            |
|              | shipping_address | TEXT                  | Delivery address                                                      |
|              | created_at       | TIMESTAMPTZ           | Created timestamp                                                     |
| Order_Item   | order_id         | UUID FK -> Order.id   | Parent order                                                          |
|              | product_id       | UUID FK -> Product.id | Ordered product                                                       |
|              | quantity         | INTEGER               | Quantity                                                              |
|              | unit_price       | NUMERIC(10,2)         | Price at time of purchase                                             |
| Approval     | order_id         | UUID FK -> Order.id   | Associated order                                                      |
|              | approver_id      | UUID FK -> User.id    | Approver                                                              |
|              | status           | VARCHAR(20)           | `PENDING`, `APPROVED`, `REJECTED`                                     |
|              | comments         | TEXT                  | Remarks                                                               |
|              | approval_date    | TIMESTAMPTZ           | Action timestamp                                                      |
| Courier_Info | order_id         | UUID FK -> Order.id   | Linked order                                                          |
|              | courier_name     | VARCHAR(100)          | Provider                                                              |
|              | tracking_number  | VARCHAR(100)          | Tracking identifier                                                   |
|              | dispatch_date    | TIMESTAMPTZ           | Dispatch timestamp                                                    |
| Audit_Log    | entity_name      | VARCHAR(100)          | Table name                                                            |
|              | entity_id        | UUID                  | Record identifier                                                     |
|              | action           | VARCHAR(20)           | `CREATE`, `UPDATE`, `DELETE`                                          |
|              | old_value        | JSONB                 | Snapshot before change                                                |
|              | new_value        | JSONB                 | Snapshot after change                                                 |
|              | user_id          | UUID FK -> User.id    | Actor                                                                 |
|              | timestamp        | TIMESTAMPTZ           | Event timestamp                                                       |

### Layman Explanation

- **UUIDs prevent collisions**: Distributed systems cannot rely on sequential IDs, so UUIDv4 ensures global uniqueness.
- **JSONB supports flexibility**: Product specs and audit payloads can evolve without schema rewrites.
- **Referential integrity**: Foreign keys stop orphan records and keep relationships consistent.
- **Indexes for speed**: Frequently queried columns like order status or user role get indexes to keep lookups fast even as data grows.

## 4. React Frontend (Vite)

- Bootstrap with `npm create vite@latest` using the React + TypeScript template
- Feature-based structure:
  - `src/components/`
  - `src/pages/`
  - `src/hooks/`
  - `src/api/` (Axios client, interceptors)
  - `src/store/` (Redux Toolkit slices)
- `react-router-dom` for routing with guarded routes by role
- Form workflow via Formik + Yup with inline validation
- Global notifications powered by `react-toastify`
- Material UI (MUI) for consistent, accessible components

## 5. Backend API Surface

| Endpoint               | Method | Description                              | Access        |
| ---------------------- | ------ | ---------------------------------------- | ------------- |
| `/auth/login`          | POST   | Authenticate and issue JWT               | Public        |
| `/auth/logout`         | POST   | Invalidate refresh token / clear session | Authenticated |
| `/products`            | GET    | List active products (filters supported) | All roles     |
| `/products/{id}`       | GET    | Fetch single product details             | All roles     |
| `/orders`              | POST   | Create an order                          | `STORE_USER`  |
| `/orders`              | GET    | List orders filtered by role/user        | Authenticated |
| `/orders/{id}`         | GET    | Retrieve a specific order                | Authenticated |
| `/orders/pending`      | GET    | List orders awaiting approval            | `APPROVER`    |
| `/orders/{id}/approve` | POST   | Approve an order                         | `APPROVER`    |
| `/orders/{id}/reject`  | POST   | Reject an order                          | `APPROVER`    |
| `/orders/{id}/courier` | POST   | Update courier tracking info             | Authenticated |

JWT-protected endpoints require `Authorization: Bearer <token>` headers. Role checks enforce the approval flow.
