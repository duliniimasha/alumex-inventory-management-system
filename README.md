# Alumex IMS Backend

NestJS + Prisma backend for the Alumex inventory management system.

## Features

- JWT authentication with register, login, logout, and me endpoints.
- Role-based access control for the current inventory and sales modules.
- Audit logging for POST, PUT, and DELETE requests.
- Prisma 7 + PostgreSQL with `DATABASE_URL` / `DIRECT_URL` support.

## Requirements

- Node.js 20+
- PostgreSQL
- Environment variables:
  - `DATABASE_URL`
  - `DIRECT_URL` if used for Prisma migrations
  - `JWT_SECRET`
  - `PORT` optional, defaults to `3000`

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

## Run

```bash
# development
npm run start:dev

# production build
npm run build
npm run start:prod
```

## Testing

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Authentication

Auth routes live under `/auth`.

- `POST /auth/register` creates a user and is restricted to `system_admin`.
- `POST /auth/login` validates credentials and returns a signed JWT.
- `POST /auth/logout` revokes the current token through the token blocklist.
- `GET /auth/me` returns the authenticated user profile.

JWT payload fields:

- `user_id`
- `role`
- `department`

## Roles

Supported roles:

- `system_admin`
- `procurement_officer`
- `production_supervisor`
- `qc_inspector`
- `warehouse_officer`
- `sales_executive`
- `export_coordinator`
- `management_viewer`

Rules enforced in the backend:

- `system_admin` can access all routes.
- `management_viewer` is limited to `GET` requests.
- Export stock zone writes are limited to `export_coordinator` and `system_admin`.

## Notes

- Auth, RBAC, audit logging, and ownership checks are implemented in middleware.
- Purchase-order, shipping-document, and RMA route groups are scaffolded so the permission matrix is represented in the app structure.



