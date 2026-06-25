# Supabase Auth — Implementation & Testing Guide

This document explains how authentication works in the ALUMEX Inventory Management
System after migrating from the custom JWT implementation to **Supabase Auth
(GoTrue)**. It covers the architecture, how passwords are stored, how to test the
flow with Postman, how to inspect session tokens in the browser, and a comparison
with the previous approach.

---

## Table of contents

1. [High-level overview](#1-high-level-overview)
2. [Architecture & request flow](#2-architecture--request-flow)
3. [How passwords are stored now](#3-how-passwords-are-stored-now)
4. [How tokens are issued and verified](#4-how-tokens-are-issued-and-verified)
5. [Authorization (roles) — unchanged](#5-authorization-roles--unchanged)
6. [Configuration & environment variables](#6-configuration--environment-variables)
7. [User migration & seeding](#7-user-migration--seeding)
8. [Testing with Postman](#8-testing-with-postman)
9. [Inspecting session tokens in the browser](#9-inspecting-session-tokens-in-the-browser)
10. [Old custom JWT vs Supabase Auth](#10-old-custom-jwt-vs-supabase-auth)
11. [Advantages of the new approach](#11-advantages-of-the-new-approach)
12. [Troubleshooting](#12-troubleshooting)
13. [Glossary](#13-glossary)

---

## 1. High-level overview

There are two distinct concerns in security:

| Concern | Meaning | Owner now |
| --- | --- | --- |
| **Authentication** | *Who are you?* Login, sessions, password storage, token issuance | **Supabase Auth (GoTrue)** |
| **Authorization** | *What are you allowed to do?* Role-based access to routes | **NestJS middleware** (unchanged) |

The key design decision: **Supabase handles authentication only.** All the
role-based authorization logic (`authorize`, `authorizeOwn`, export/ownership
rules in `server/src/app.module.ts`) stays exactly as it was. The application
`users` table remains the single source of truth for each user's `role`,
`department`, and active state.

The link between the two systems is the **user id**: a Supabase auth user's id
(the `sub` claim in its token) is the **same UUID** as `public.users.user_id`.
So when a request arrives, the backend reads the `sub` from the verified token
and looks up that exact row in `users`.

```
Supabase auth.users.id  ===  public.users.user_id   (same UUID)
```

---

## 2. Architecture & request flow

### Login (happens client-side, against Supabase directly)

```
Browser (React)                Supabase Auth              NestJS API
     |                              |                          |
     | signInWithPassword(email,pw) |                          |
     |----------------------------->|                          |
     |                              | verify bcrypt hash        |
     |   access_token + refresh     |                          |
     |<-----------------------------|                          |
     |  (session stored in localStorage, auto-refreshed)       |
     |                              |                          |
     | GET /api/auth/me  (Bearer access_token)                 |
     |-------------------------------------------------------->|
     |                              |   verify token, load     |
     |                              |   users row by sub        |
     |        profile (role, dept)  |                          |
     |<--------------------------------------------------------|
```

1. The React app calls `supabase.auth.signInWithPassword({ email, password })`
   ([`client/src/api/auth.api.ts`](client/src/api/auth.api.ts)).
2. Supabase verifies the credentials and returns an **access token** (a JWT, ~1h
   lifetime) and a **refresh token**. The `@supabase/supabase-js` client persists
   these in `localStorage` and refreshes them automatically.
3. The app fetches the user's application profile from `GET /api/auth/me` to get
   the `role`/`department`.

### Authenticated API request

```
Browser                                  NestJS API
   | GET /api/inventory                       |
   | Authorization: Bearer <access_token>     |
   |----------------------------------------->|
   |          AuthenticateMiddleware:         |
   |          1. verify token (JWKS / getUser)|
   |          2. read sub  -> users.user_id   |
   |          3. load role/dept/isActive      |
   |          4. attach req.user              |
   |          authorize(...) role checks      |
   |              data                        |
   |<-----------------------------------------|
```

- The axios request interceptor ([`client/src/api/axios.ts`](client/src/api/axios.ts))
  attaches the current Supabase access token on every request.
- [`server/src/auth/auth.middleware.ts`](server/src/auth/auth.middleware.ts)
  verifies the token, resolves the user, and enforces the same role rules as
  before.

### Logout

- The UI calls `logoutUser()` → `supabase.auth.signOut()` (clears the local
  session) **and** a best-effort `POST /api/auth/logout` which revokes the user's
  sessions server-side via the Supabase admin API.

---

## 3. How passwords are stored now

### Before (custom JWT)
- Passwords were hashed with **bcrypt** in the backend (`bcrypt.hash(password, 12)`)
  and stored in the application table column `users.password_hash`.
- The backend compared the submitted password against that hash on login.

### Now (Supabase Auth)
- Passwords are stored by Supabase in the **`auth.users.encrypted_password`**
  column (a separate `auth` schema managed entirely by Supabase/GoTrue).
- GoTrue hashes them with **bcrypt** as well, so the format is compatible — that
  is why existing hashes could be imported and keep working.
- The application's own `users.password_hash` column is **no longer used and has
  been dropped**. The application never sees, stores, or compares raw passwords
  anymore.

```
auth.users
├── id                  (uuid)  ── equals public.users.user_id
├── email
├── encrypted_password  ── bcrypt hash, managed by Supabase
├── email_confirmed_at
└── ...                 (token columns, metadata, etc.)

public.users
├── user_id             (uuid)  ── equals auth.users.id
├── email
├── role                ── source of truth for authorization
├── department
└── is_active
```

**Who can change a password?**

| Action | How |
| --- | --- |
| User changes own password | `POST /api/auth/change-password` → backend verifies the current password via Supabase, then sets the new one with the admin API |
| Admin resets a user's password | `UsersService.resetPassword` → Supabase admin `updateUserById` |
| New user provisioning | `POST /api/auth/register` → Supabase admin `createUser`, then mirror into `users` |

The backend uses the **service-role key** for these admin operations. That key is
secret and lives only on the server.

---

## 4. How tokens are issued and verified

### Issuance
Tokens are issued by **Supabase**, not by our backend. The access token is a
standard JWT whose important claims are:

| Claim | Meaning |
| --- | --- |
| `sub` | The auth user's UUID (= `users.user_id`) |
| `email` | The user's email |
| `role` | Always `authenticated` (this is the Postgres/Supabase role, **not** the app role) |
| `exp` | Expiry (≈ 1 hour after issue) |
| `aud` | `authenticated` |

> ⚠️ The token's `role` claim is **not** the application role. The application
> role (e.g. `sales_executive`) is read from the `users` table, never trusted
> from the token.

### Verification (backend)
[`server/src/auth/supabase.service.ts`](server/src/auth/supabase.service.ts)
verifies tokens with a two-tier strategy:

1. **Fast path — local JWKS verification.** Using the `jose` library, the token's
   signature is checked against the project's public keys from
   `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`. Keys are cached, so
   there is no network call per request. This works when the project uses
   **asymmetric JWT signing keys** (the modern Supabase default).
2. **Fallback — remote validation.** If local verification fails (e.g. the
   project still signs tokens with the legacy shared HS256 secret), the backend
   calls `supabase.auth.getUser(token)`, letting Supabase validate it.

Either way, the result is the `sub` (user id), which the middleware uses to load
the application user.

---

## 5. Authorization (roles) — unchanged

Nothing about role enforcement changed. After the token is verified and the user
is loaded, the existing middleware still applies:

- `authorize(...roles)` — allows only the listed roles (with `system_admin`
  always allowed and `management_viewer` restricted to `GET`).
- `authorizeOwn(...)` — restricts `sales_executive` to their own records.
- `enforceExportOrderScope`, `enforceExportInventoryWrite`,
  `enforceProductionRawMaterialQtyEdit` — domain-specific rules.

These are all defined in
[`server/src/auth/auth.middleware.ts`](server/src/auth/auth.middleware.ts) and
wired in [`server/src/app.module.ts`](server/src/app.module.ts).

---

## 6. Configuration & environment variables

### Server (`server/.env`)

```dotenv
SUPABASE_URL="https://rvqtlziagmmnyigqrciv.supabase.co"
SUPABASE_ANON_KEY="<anon/public key>"
SUPABASE_SERVICE_ROLE_KEY="<service_role key — SECRET, server only>"
SUPABASE_JWKS_URL="https://rvqtlziagmmnyigqrciv.supabase.co/auth/v1/.well-known/jwks.json"
```

### Client (`client/.env.local`)

```dotenv
VITE_SUPABASE_URL=https://rvqtlziagmmnyigqrciv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon/public key>
```

Where to find these: **Supabase Dashboard → Project Settings → API**.

| Key | Safe in browser? | Used for |
| --- | --- | --- |
| `anon` / public key | ✅ Yes | Client sign-in, identifying the project |
| `service_role` key | ❌ **Never** | Server-side admin operations (create/reset users, revoke sessions) |

---

## 7. User migration & seeding

### Existing users (one-time migration)
`server/prisma/import-users-to-supabase-auth.sql` copies every `public.users` row
into `auth.users` (reusing the same id and the existing bcrypt hash) and creates
the matching `auth.identities` row. Run it **once** in the Supabase SQL editor.
After it succeeds and logins are verified, the `password_hash` column is dropped
by the `drop_password_hash` migration.

### Fresh/dev databases
1. `server/prisma/seed.sql` — creates the `public.users` profiles (no passwords).
2. `server/prisma/seed-auth-users.sql` — creates the matching Supabase auth users
   with their demo passwords (same fixed UUIDs).

**Demo credentials** (dev only):

| Email | Password | Role |
| --- | --- | --- |
| `sysadmin@alumex.local` | `Admin@12345` | system_admin |
| `export.coordinator@alumex.local` | `Export@12345` | export_coordinator |
| `warehouse.officer@alumex.local` | `Warehouse@12345` | warehouse_officer |
| `production.supervisor@alumex.local` | `Production@12345` | production_supervisor |

---

## 8. Testing with Postman

Because authentication is now done directly against Supabase, you obtain a token
from **Supabase's token endpoint**, then use it against **our API**.

### Set up a Postman environment

| Variable | Value |
| --- | --- |
| `supabase_url` | `https://rvqtlziagmmnyigqrciv.supabase.co` |
| `anon_key` | your anon/public key |
| `api_url` | `http://localhost:3000/api` |
| `access_token` | *(filled automatically by the test script below)* |

### Step 1 — Get an access token from Supabase

**Request**

```
POST {{supabase_url}}/auth/v1/token?grant_type=password
```

**Headers**

```
apikey: {{anon_key}}
Content-Type: application/json
```

**Body (raw JSON)**

```json
{
  "email": "sysadmin@alumex.local",
  "password": "Admin@12345"
}
```

**Response (200)**

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "v1.M2Rk...",
  "user": { "id": "2f5e5ca2-...", "email": "sysadmin@alumex.local", ... }
}
```

**Tip — auto-save the token.** Add this to the request's **Scripts → Post-response**
(formerly "Tests") tab so subsequent requests can reuse it:

```javascript
const body = pm.response.json();
pm.environment.set("access_token", body.access_token);
pm.environment.set("refresh_token", body.refresh_token);
```

### Step 2 — Call a protected API route

**Request**

```
GET {{api_url}}/auth/me
```

**Headers**

```
Authorization: Bearer {{access_token}}
```

**Response (200)** — note `role` comes from the `users` table:

```json
{
  "success": true,
  "message": "Current user fetched successfully",
  "data": {
    "user_id": "2f5e5ca2-...",
    "name": "System Administrator",
    "email": "sysadmin@alumex.local",
    "role": "system_admin",
    "department": "IT",
    "is_active": true,
    "created_at": "..."
  }
}
```

Try other routes to see authorization in action, e.g.
`GET {{api_url}}/inventory`, `GET {{api_url}}/orders`. Logging in as different
demo users will produce different 200/403 results per role.

### Step 3 — Refresh an expired token (optional)

```
POST {{supabase_url}}/auth/v1/token?grant_type=refresh_token
apikey: {{anon_key}}
Content-Type: application/json

{ "refresh_token": "{{refresh_token}}" }
```

### Step 4 — Negative tests (should fail)

| Test | Expected |
| --- | --- |
| Call `{{api_url}}/auth/me` with **no** `Authorization` header | `401` |
| Call with a **garbage** token (`Bearer abc.def.ghi`) | `401` |
| Wrong password at Step 1 | `400` from Supabase (`invalid_grant`) |
| As `management_viewer`, send a `POST`/`PUT` to a protected route | `403` |

### Step 5 — Server-side logout (optional)

Our backend route revokes the user's Supabase sessions:

```
POST {{api_url}}/auth/logout
Authorization: Bearer {{access_token}}
```

> There is **no** `POST /auth/login` on our API anymore — login is performed
> against Supabase (Step 1).

---

## 9. Inspecting session tokens in the browser

When you log in through the React app, `@supabase/supabase-js` stores the session
in `localStorage`.

### Find the session

1. Open **DevTools → Application** (Chrome/Edge) or **Storage** (Firefox).
2. Expand **Local Storage → your app origin** (e.g. `http://localhost:5173`).
3. Look for the key:

   ```
   sb-rvqtlziagmmnyigqrciv-auth-token
   ```

   Its value is JSON containing `access_token`, `refresh_token`, `expires_at`,
   `token_type`, and the `user` object.

### Decode the access token

A JWT has three dot-separated parts: `header.payload.signature`. To read the
payload, paste the token into [jwt.io](https://jwt.io), **or** run this in the
DevTools **Console**:

```javascript
const raw = JSON.parse(localStorage.getItem('sb-rvqtlziagmmnyigqrciv-auth-token'));
const token = raw.access_token;
console.log(JSON.parse(atob(token.split('.')[1])));
// -> { sub, email, role: "authenticated", exp, aud, ... }
```

- `sub` should equal the user's `user_id` in the `users` table.
- `exp` is a Unix timestamp; `new Date(exp * 1000)` shows the expiry.

### Confirm logout clears it

After clicking **Log out**, the `sb-...-auth-token` key should disappear from
Local Storage. If it is still there, the session was not cleared (see
Troubleshooting). On refresh, `initializeAuth()` calls
`supabase.auth.getSession()`; with no token, you stay on `/login`.

### Watch the request header

In **DevTools → Network**, click any `/api/...` request and check **Request
Headers**. You should see `Authorization: Bearer eyJ...` — the same access token.

---

## 10. Old custom JWT vs Supabase Auth

| Aspect | Old (custom JWT) | New (Supabase Auth) |
| --- | --- | --- |
| **Who issues tokens** | Our NestJS backend (`jsonwebtoken`) | Supabase (GoTrue) |
| **Signing** | Symmetric HS256 with a single `JWT_SECRET` in `.env` | Asymmetric signing keys (JWKS) by default |
| **Password hashing** | bcrypt, in our backend | bcrypt, in Supabase |
| **Password storage** | `users.password_hash` (our DB) | `auth.users.encrypted_password` (Supabase) |
| **Login endpoint** | `POST /auth/login` on our API | Supabase token endpoint (client-side) |
| **Token lifetime / refresh** | 1h, no refresh tokens — re-login on expiry | Short-lived access token **+ refresh token**, auto-refreshed |
| **Logout / revocation** | Custom `revoked_tokens` table + per-request DB lookup | Supabase session revocation; short token TTL |
| **Session storage (client)** | Manual `localStorage` token + hand-rolled expiry decode | Managed by `supabase-js` |
| **Token verification** | `jwt.verify(token, JWT_SECRET)` | JWKS local verify, with `getUser` fallback |
| **Authorization (roles)** | NestJS middleware reading `users.role` | **Same** NestJS middleware reading `users.role` |
| **Secret management** | One shared secret; leak = forge any token | Service-role key server-only; public anon key for clients |
| **Extra features** | None built-in | Email verification, password reset, MFA, OAuth providers available |

### What stayed the same
- The entire authorization layer and role model.
- The `users` table as the source of truth for roles.
- The `/api/auth/me`, `/api/auth/register`, `/api/auth/change-password` contracts.

### What was removed
- `POST /auth/login` (now client-side via Supabase).
- The per-request `revoked_tokens` lookup in the auth middleware.
- The `users.password_hash` column.
- The dependency on `JWT_SECRET` for auth.

---

## 11. Advantages of the new approach

1. **Stronger token security by default.** Asymmetric signing (JWKS) means the
   API verifies tokens with a *public* key and never holds a secret capable of
   *forging* tokens. With the old HS256 scheme, anyone with `JWT_SECRET` could
   mint a valid token for any user.

2. **Refresh tokens & seamless sessions.** Users get short-lived access tokens
   that silently refresh, instead of being logged out abruptly after one hour.

3. **Less custom security code to maintain.** Login, hashing, token issuance,
   session persistence, and refresh are handled by a hardened, widely-audited
   service (GoTrue) rather than bespoke code we own and must patch.

4. **Separation of secrets.** The browser only ever holds the public anon key.
   The powerful service-role key stays on the server. There is no single shared
   secret whose leak compromises everyone.

5. **Centralized credential store.** Passwords live in Supabase's `auth` schema,
   isolated from application data, with consistent bcrypt hashing.

6. **Room to grow without new code.** Email confirmation, password-reset emails,
   magic links, MFA/2FA, and social/OAuth login are all available from the same
   provider when needed — no new auth infrastructure to build.

7. **Built-in session management.** Sessions can be listed and revoked from the
   Supabase dashboard/admin API, which is more capable than the old hand-rolled
   `revoked_tokens` table.

8. **Unchanged, battle-tested authorization.** All of this was gained **without**
   touching the detailed role-based access rules, so the business logic that
   governs who can do what is exactly as reviewed and tested before.

---

## 12. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| **`500` from `/auth/v1/token?grant_type=password`** | Imported `auth.users` rows have `NULL` token columns (`confirmation_token`, `recovery_token`, `email_change`, …); GoTrue can't scan `NULL` into a string | Re-run `import-users-to-supabase-auth.sql` (its **Section 0** repairs these to `''`) |
| **`400 invalid_grant`** at login | Wrong email/password, or the user has no `auth.users` row yet | Verify credentials; ensure the import/seed ran |
| **Logged in automatically after logout** | Logout cleared local state but not the Supabase session | Ensure logout calls `logoutUser()` (→ `supabase.auth.signOut()`); manually delete the `sb-…-auth-token` key to flush a stale session |
| **`401` on every API call despite a fresh token** | `SUPABASE_URL`/`SUPABASE_JWKS_URL` misconfigured, or service-role key missing for the `getUser` fallback | Check `server/.env`; confirm the JWKS URL loads in a browser |
| **`Missing Supabase configuration` error in the app** | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` not set | Add them to `client/.env.local` and restart Vite |
| **`Rendered fewer hooks than expected` on login** | A conditional `return` before a hook | Already fixed — keep redirects after all hook calls |

To inspect server-side auth errors, open **Supabase Dashboard → Logs → Auth**.

---

## 13. Glossary

- **GoTrue** — the open-source service behind Supabase Auth that manages users,
  passwords, and tokens.
- **Access token** — short-lived JWT sent on each API request as a Bearer token.
- **Refresh token** — long-lived token used to obtain new access tokens without
  re-entering a password.
- **JWKS** — JSON Web Key Set; the public keys (served at a well-known URL) used
  to verify asymmetrically-signed JWTs.
- **anon key** — public API key identifying the Supabase project to clients.
- **service-role key** — secret key granting admin privileges; server-side only.
- **`sub` claim** — the subject of a JWT; here, the authenticated user's UUID.

---

*Related files:*
`client/src/lib/supabase.ts`,
`client/src/api/axios.ts`,
`client/src/api/auth.api.ts`,
`client/src/store/auth.store.ts`,
`server/src/auth/supabase.service.ts`,
`server/src/auth/auth.middleware.ts`,
`server/src/auth/auth.service.ts`,
`server/prisma/import-users-to-supabase-auth.sql`,
`server/prisma/seed-auth-users.sql`.
