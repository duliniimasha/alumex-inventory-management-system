# Alumex Inventory

This repository contains the Alumex Inventory system in a single monorepo structure.

## Project Structure

- `server/` - NestJS backend API, Prisma schema/migrations, and backend services.
- `client/` - React (Vite) frontend application.

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+

## Getting Started

### 1) Install dependencies

Server:

```bash
cd server
npm install
```

Client:

```bash
cd client
npm install
```

## Run in Development

Server:

```bash
cd server
npm run dev
```

Client:

```bash
cd client
npm run dev
```

## Build for Production

Server:

```bash
cd server
npm run build
```

Client:

```bash
cd client
npm run build
```

## Notes

- Backend environment variables are configured in `server/.env`.
- Prisma schema and migrations are located in `server/prisma/`.
- Root-level README describes monorepo usage, while service-specific details can remain inside each directory.
