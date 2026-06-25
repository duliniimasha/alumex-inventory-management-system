# Alumex IMS - Backend API

Inventory management backend for Alumex PLC.
Built with NestJS, Prisma ORM, and PostgreSQL.

---

## Table of contents

1. [Project structure](#project-structure)
2. [Environment setup](#environment-setup)
3. [Running the server](#running-the-server)
4. [Authentication and roles](#authentication-and-roles)
5. [API reference](#api-reference)
6. [Testing with Postman](#testing-with-postman)
7. [Role permission matrix](#role-permission-matrix)
8. [Business rules](#business-rules)
9. [Audit logging](#audit-logging)

---

## Project structure

```text
alumex-inventory-backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.sql
│   └── migrations/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.middleware.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.types.ts
│   │   ├── auth.validators.ts
│   │   ├── role.util.ts
│   │   └── validation.middleware.ts
│   ├── audit/
│   ├── common/
│   ├── customers/
│   ├── dies/
│   ├── events/
│   ├── inventory/
│   ├── prisma/
│   ├── production-jobs/
│   ├── products/
│   ├── purchase-orders/
│   ├── raw-materials/
│   ├── reports/
│   ├── returns/
│   ├── sales-orders/
│   ├── shipping-docs/
│   ├── stock-movements/
│   ├── stocktake/
│   └── suppliers/
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

---

## Environment setup

Create a `.env` file in the backend root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/alumex_ims"
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/alumex_ims"
JWT_SECRET="your-secret-key-min-32-chars"
PORT=3000
```

Install dependencies and initialize Prisma:

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

If you need seed data:

```bash
npm run db:seed
```

---

## Running the server

```bash
# development
npm run start:dev

# watch mode using the shorter alias
npm run dev

# production build
npm run build
npm run start:prod
```

---

## Authentication and roles

Authentication is handled by **Supabase Auth (GoTrue)**. The client signs in with
Supabase and sends the resulting Supabase access token as a Bearer token; the API
verifies it and loads the matching `users` row (the source of truth for role,
department, and active state). Role-based authorization is enforced by NestJS
middleware (see `app.module.ts`).

### Login flow

1. Sign in client-side via Supabase (`supabase.auth.signInWithPassword`). The
   Supabase client owns and auto-refreshes the session.
2. Send the Supabase access token as `Authorization: Bearer <token>` on protected
   requests.
3. Fetch the application profile (role/department) from `GET /auth/me`.

The Supabase auth user id equals `users.user_id`, so the token `sub` claim
resolves directly to the application user. Existing users are migrated with
`prisma/import-users-to-supabase-auth.sql` (run once), which preserves ids and
passwords.

### Auth routes

| Method | Endpoint                | Auth required | Roles                  |
| ------ | ----------------------- | ------------- | ---------------------- |
| POST   | `/auth/register`        | Yes           | `system_admin`         |
| POST   | `/auth/logout`          | Yes           | Any authenticated role |
| GET    | `/auth/me`              | Yes           | Any authenticated role |
| POST   | `/auth/change-password` | Yes           | Any authenticated role |

> Login is no longer a backend route — it happens directly against Supabase Auth.

### Register request body

Use this JSON body when calling `POST /auth/register`:

```json
{
  "name": "test user",
  "email": "test2user@gmail.com",
  "password": "test1234567",
  "role": "procurement_officer",
  "department": "IT",
  "is_active": true
}
```

### Role enum values

| Role                    | Notes                                                        |
| ----------------------- | ------------------------------------------------------------ |
| `system_admin`          | Full access override for routed permissions                  |
| `procurement_officer`   | Procurement and purchasing workflows                         |
| `production_supervisor` | Production and quantity editing workflows                    |
| `qc_inspector`          | Quality-control workflows                                    |
| `warehouse_officer`     | Warehouse, dispatch, stock movement, and stocktake workflows |
| `sales_executive`       | Own customer and order records                               |
| `export_coordinator`    | Export-specific inventory and order flows                    |
| `management_viewer`     | Read-only access on protected endpoints                      |

### Global auth behavior

- Missing or invalid tokens return `401`.
- Revoked tokens are rejected after logout.
- A token role must still match the current user role in the database.
- `management_viewer` is limited to `GET` requests on protected endpoints.

---

## API reference

This backend does not use a global `/api` prefix. The routes below are mounted directly from the Nest controllers and middleware configuration in `src/app.module.ts`.

### Suppliers

| Method | Endpoint         | Roles                                 |
| ------ | ---------------- | ------------------------------------- |
| GET    | `/suppliers`     | `procurement_officer`, `system_admin` |
| GET    | `/suppliers/:id` | `procurement_officer`, `system_admin` |
| POST   | `/suppliers`     | `procurement_officer`, `system_admin` |
| PUT    | `/suppliers/:id` | `procurement_officer`, `system_admin` |
| DELETE | `/suppliers/:id` | `procurement_officer`, `system_admin` |

### Raw materials

| Method | Endpoint             | Roles                                                          |
| ------ | -------------------- | -------------------------------------------------------------- |
| GET    | `/raw-materials`     | `procurement_officer`, `production_supervisor`, `system_admin` |
| GET    | `/raw-materials/:id` | `procurement_officer`, `production_supervisor`, `system_admin` |
| POST   | `/raw-materials`     | `procurement_officer`, `system_admin`                          |
| PUT    | `/raw-materials/:id` | `procurement_officer`, `production_supervisor`, `system_admin` |
| DELETE | `/raw-materials/:id` | `procurement_officer`, `system_admin`                          |

### Dies

| Method | Endpoint    | Roles                                                          |
| ------ | ----------- | -------------------------------------------------------------- |
| GET    | `/dies`     | `procurement_officer`, `production_supervisor`, `system_admin` |
| GET    | `/dies/:id` | `procurement_officer`, `production_supervisor`, `system_admin` |
| POST   | `/dies`     | `procurement_officer`, `system_admin`                          |
| PUT    | `/dies/:id` | `procurement_officer`, `production_supervisor`, `system_admin` |
| DELETE | `/dies/:id` | `procurement_officer`, `system_admin`                          |

### Production jobs

| Method | Endpoint                              | Roles                                                                          |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/production-jobs`                    | `procurement_officer`, `production_supervisor`, `qc_inspector`, `system_admin` |
| GET    | `/production-jobs/:id`                | `procurement_officer`, `production_supervisor`, `qc_inspector`, `system_admin` |
| GET    | `/production-jobs/:jobId/inspections` | `procurement_officer`, `production_supervisor`, `qc_inspector`, `system_admin` |
| POST   | `/production-jobs`                    | `production_supervisor`, `system_admin`                                        |
| PUT    | `/production-jobs/:id`                | `production_supervisor`, `system_admin`                                        |
| DELETE | `/production-jobs/:id`                | `production_supervisor`, `system_admin`                                        |
| POST   | `/production-jobs/:jobId/inspections` | `qc_inspector`, `system_admin`                                                 |
| PUT    | `/inspections/:id`                    | `qc_inspector`, `system_admin`                                                 |

### Inventory and stock movement

| Method | Endpoint                  | Roles                                                                                                                 |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GET    | `/inventory`              | `production_supervisor`, `qc_inspector`, `warehouse_officer`, `sales_executive`, `export_coordinator`, `system_admin` |
| GET    | `/inventory/:id`          | `production_supervisor`, `qc_inspector`, `warehouse_officer`, `sales_executive`, `export_coordinator`, `system_admin` |
| POST   | `/inventory/receive`      | `warehouse_officer`, `export_coordinator`, `system_admin`                                                             |
| PUT    | `/inventory/:id/transfer` | `warehouse_officer`, `export_coordinator`, `system_admin`                                                             |
| GET    | `/stock-movements`        | `warehouse_officer`, `system_admin`, `management_viewer`                                                              |
| POST   | `/stock-movements`        | `warehouse_officer`, `export_coordinator`, `system_admin`                                                             |
| POST   | `/stocktake/submit`       | `warehouse_officer`, `system_admin`                                                                                   |

### Sales orders, customers, returns

| Method | Endpoint                 | Roles                                                                        |
| ------ | ------------------------ | ---------------------------------------------------------------------------- |
| GET    | `/orders`                | `sales_executive`, `export_coordinator`, `warehouse_officer`, `system_admin` |
| GET    | `/orders/:id`            | `sales_executive`, `export_coordinator`, `warehouse_officer`, `system_admin` |
| POST   | `/orders`                | `sales_executive`, `export_coordinator`, `system_admin`                      |
| PUT    | `/orders/:id/dispatch`   | `warehouse_officer`, `system_admin`                                          |
| PUT    | `/orders/:id/cancel`     | `sales_executive`, `system_admin`                                            |
| POST   | `/orders/:id/return`     | `sales_executive`, `system_admin`                                            |
| POST   | `/orders/:orderId/lines` | `sales_executive`, `system_admin`                                            |
| PUT    | `/orders/lines/:id`      | `sales_executive`, `system_admin`                                            |
| DELETE | `/orders/lines/:id`      | `sales_executive`, `system_admin`                                            |
| GET    | `/customers`             | `sales_executive`, `export_coordinator`, `system_admin`                      |
| GET    | `/customers/:id`         | `sales_executive`, `export_coordinator`, `system_admin`                      |
| POST   | `/customers`             | `sales_executive`, `export_coordinator`, `system_admin`                      |
| PUT    | `/customers/:id`         | `sales_executive`, `export_coordinator`, `system_admin`                      |
| GET    | `/returns/:orderId`      | `sales_executive`, `system_admin`                                            |
| POST   | `/returns/:orderId`      | `sales_executive`, `system_admin`                                            |

### Products and reports

| Method | Endpoint                   | Roles                                                                                                                                                             |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/products`                | `procurement_officer`, `production_supervisor`, `qc_inspector`, `warehouse_officer`, `sales_executive`, `export_coordinator`, `system_admin`                      |
| GET    | `/products/:id`            | same as above                                                                                                                                                     |
| POST   | `/products`                | `system_admin`                                                                                                                                                    |
| PUT    | `/products/:id`            | `system_admin`                                                                                                                                                    |
| GET    | `/reports/:route`          | `procurement_officer`, `production_supervisor`, `qc_inspector`, `warehouse_officer`, `sales_executive`, `export_coordinator`, `system_admin`, `management_viewer` |
| GET    | `/reports/:route/:orderId` | same as above, route-dependent                                                                                                                                    |
| GET    | `/shipping-docs`           | `export_coordinator`, `system_admin`                                                                                                                              |
| GET    | `/shipping-docs/:id`       | `export_coordinator`, `system_admin`                                                                                                                              |
| POST   | `/shipping-docs`           | `export_coordinator`, `system_admin`                                                                                                                              |
| PUT    | `/shipping-docs/:id`       | `export_coordinator`, `system_admin`                                                                                                                              |
| DELETE | `/shipping-docs/:id`       | `export_coordinator`, `system_admin`                                                                                                                              |

---

## Testing with Postman

### Step 0: Start backend

```bash
npm run start
```

Make sure this works in browser first:

```text
http://localhost:3000/
```

Expected response: `Hello World!`

### Step 1: Create Postman environment

1. Open Postman and create a new Environment named `Alumex IMS - Local`.
2. Add these variables:

| Variable | Initial Value |
| --- | --- |
| `base_url` | `http://localhost:3000` |
| `token` | (leave empty) |

### Step 2: Create login request

1. Create request: `POST {{base_url}}/auth/login`
2. Go to `Headers` and add:
   - `Content-Type: application/json`
3. Go to `Body` -> `raw` -> `JSON` and paste:

```json
{
  "email": "sysadmin@alumex.local",
  "password": "Admin@12345"
}
```

4. Open the `Tests` tab and paste:

```javascript
const res = pm.response.json();
if (res?.data?.token) {
  pm.environment.set('token', res.data.token);
}
pm.test('Login should return 200', function () {
  pm.response.to.have.status(200);
});
```

5. Click `Send`.

Expected: response contains `Login successful` and environment variable `token` is populated.

### Step 3: Create authenticated request

1. Create request: `GET {{base_url}}/auth/me`
2. In `Authorization` tab:
   - Type: `Bearer Token`
   - Token: `{{token}}`
3. Click `Send`.

Expected: user profile is returned with `email: sysadmin@alumex.local`.

### Step 4: Test a business endpoint

1. Create request: `GET {{base_url}}/products`
2. Use same Bearer token: `{{token}}`
3. Click `Send`.

Expected: `success: true` and a product list in `data`.

### Step 5: Verify auth errors (important)

Run these two checks:

1. Remove bearer token and call `GET {{base_url}}/products` -> expect `401`.
2. Set token to `invalid.token.value` and call again -> expect `401 Invalid token`.

### Step 6: Logout test

1. Request: `POST {{base_url}}/auth/logout`
2. Authorization: `Bearer {{token}}`
3. Send request -> expect `200`.
4. Reuse same token on `GET {{base_url}}/auth/me` -> expect `401`.

### Optional seeded users for role testing

Use these credentials with `POST /auth/login`:

| Role | Email | Password |
| --- | --- | --- |
| system_admin | `sysadmin@alumex.local` | `Admin@12345` |
| export_coordinator | `export.coordinator@alumex.local` | `Export@12345` |
| warehouse_officer | `warehouse.officer@alumex.local` | `Warehouse@12345` |
| production_supervisor | `production.supervisor@alumex.local` | `Production@12345` |

### Recommended request order for quick smoke test

1. `POST /auth/login`
2. `GET /auth/me`
3. `GET /products`
4. `POST /auth/logout`
5. `GET /auth/me` (should fail with 401)

---

## Role permission matrix

| Module          | system_admin                   | procurement_officer | production_supervisor | qc_inspector        | warehouse_officer   | sales_executive     | export_coordinator            | management_viewer   |
| --------------- | ------------------------------ | ------------------- | --------------------- | ------------------- | ------------------- | ------------------- | ----------------------------- | ------------------- |
| Auth            | register + login + logout + me | login + logout + me | login + logout + me   | login + logout + me | login + logout + me | login + logout + me | login + logout + me           | login + logout + me |
| Suppliers       | CRUD                           | CRUD                | -                     | -                   | -                   | -                   | -                             | -                   |
| Raw materials   | CRUD                           | CRUD                | R + qty edit          | R                   | -                   | -                   | -                             | -                   |
| Dies            | CRUD                           | CRUD                | R + edit              | -                   | -                   | -                   | -                             | -                   |
| Production jobs | CRUD                           | R                   | CRUD                  | R + inspections     | -                   | -                   | -                             | -                   |
| Inventory       | CRUD                           | -                   | R                     | R                   | CRUD                | R                   | CRUD with export restrictions | R                   |
| Stock movements | CRUD                           | -                   | -                     | -                   | CRUD                | -                   | CRUD with export restrictions | R                   |
| Stocktake       | CRUD                           | -                   | -                     | -                   | Submit              | -                   | -                             | -                   |
| Customers       | CRUD                           | -                   | -                     | -                   | -                   | CRUD own            | CRUD own                      | -                   |
| Orders          | CRUD                           | -                   | -                     | -                   | Dispatch/read       | CRUD own            | CRUD export scope             | -                   |
| Products        | CRUD                           | -                   | -                     | -                   | -                   | R                   | R                             | R                   |
| Reports         | All                            | Procurement reports | Production reports    | QC reports          | Stock reports       | Sales reports       | Export reports                | Read-only reports   |
| Shipping docs   | CRUD                           | -                   | -                     | -                   | -                   | -                   | CRUD                          | -                   |

Legend: `R` = read only, `CRUD` = full access, `CRUD own` = access limited to owned records.

---

## Business rules

| Rule                                                                               | Where enforced                      |
| ---------------------------------------------------------------------------------- | ----------------------------------- |
| JWT must be valid and match the current user record                                | `src/auth/auth.middleware.ts`       |
| Revoked tokens are rejected after logout                                           | `src/auth/auth.middleware.ts`       |
| `management_viewer` is limited to `GET`                                            | `src/auth/auth.middleware.ts`       |
| Sales executives can only access their own customer, order, and order-line records | `src/auth/auth.middleware.ts`       |
| Export inventory writes are limited to `export_coordinator` and `system_admin`     | `src/auth/auth.middleware.ts`       |
| Export orders are scoped to export-channel records                                 | `src/auth/auth.middleware.ts`       |
| Production supervisors can only edit raw-material quantity fields                  | `src/auth/auth.middleware.ts`       |
| Mutating requests are audited                                                      | `src/audit/audit-log.middleware.ts` |
| Requests with server-side failures are not written to audit log                    | `src/audit/audit-log.middleware.ts` |

---

## Audit logging

`AuditLogMiddleware` records every successful `POST`, `PUT`, and `DELETE` request.

Captured fields:

- HTTP method as `action`
- first path segment as `entity`
- route/body identifier as `entityId`
- authenticated user id as `userId`
- client IP address as `ipAddress`
- timestamp as the request start time

Example query for recent logs:

```sql
SELECT *
FROM "audit_logs"
ORDER BY timestamp DESC
LIMIT 50;
```

The Prisma model is `AuditLog`, and it maps to the `audit_logs` table in `prisma/schema.prisma`.

---

## Notes

- Auth, RBAC, audit logging, and ownership checks are implemented in middleware.
- Purchase-order, shipping-document, and RMA route groups are scaffolded so the permission matrix is represented in the app structure.



