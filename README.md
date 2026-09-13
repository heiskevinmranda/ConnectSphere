# ConnectSphere

Internet Service Provider (ISP) hotspot portal for Tanzania. Customers buy mobile-money data plans from the public landing page, and operators manage customers, vouchers, plans, payments, and network devices from an admin portal.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19
- **Language**: TypeScript (strict)
- **Database**: SQLite via Prisma ORM 7 (`@prisma/adapter-libsql`)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Auth**: HS256 JWTs (jose), bcrypt password hashing
- **Payments**: AzamPay mobile-money gateway (dev-mode simulation fallback)

## Getting started

```bash
npm install
cp .env.example .env     # then fill in the values below
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open http://localhost:3000. Seed credentials are printed by `db:seed` when admins are created; an existing database keeps its current admin accounts.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` (project root) |
| `JWT_SECRET` | yes | ≥32 chars, must combine ≥3 of lower/upper/digit/symbol classes; placeholders are rejected at startup |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | Credentials for the initial `admin` account |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | seed only | Credentials for the initial `super_admin` account |
| `WEBHOOK_SECRET` | production | Required by the payment webhook; compared in constant time |
| `TRUST_PROXY` | no | Set `true` only if the app is deployed behind a reverse proxy that strips untrusted `X-Forwarded-*` headers |
| `ROUTER_MAC_ADDRESS` / `ROUTER_SERIAL_NUMBER` / `ROUTER_IMEI` | production | Hardware identity gate; `/api/connect` fails closed when unset |
| `AZAMPAY_*` | production | Payment gateway credentials. When absent, payments run in simulation mode (dev only) |

## Scripts

- `npm run dev` – development server
- `npm run build` / `npm run start` – production build / serve (bind `HOSTNAME`/`PORT` as needed)
- `npm run lint` – ESLint
- `npm test` – unit tests (Node test runner via `tsx`, globs `src/**/*.test.ts`)
- `npm run db:generate|db:migrate|db:push|db:seed|db:studio|db:reset` – Prisma tooling
- `npx tsc --noEmit` – typecheck

## Architecture notes

- **Public landing page** (`src/app/(public)`) – hero, plan cards, subscription status check, payment flow. Payment uses a client-side poll of `/api/payments/status/:reference` plus a signed webhook for confirmation.
- **Admin portal** (`src/app/admin`) – authenticated with a bearer token; all admin API routes are under `/api/admin/*` and gated server-side (private key + role checks). Destructive actions (subscription/payment/voucher deletion, cancel) require the `super_admin` role.
- **Modules**
  - `src/modules/payments` – AzamPay HTTP + payment/status reconciliation (single persisted `paymentReference`, MNO→prefix mapping, stock-out refund audit trail)
  - `src/modules/network` – DB-backed device inventory, TLS/1x topology, real alerts derived from voucher stock and expiring subscriptions (no fabricated traffic); router access is fail-closed
  - `src/modules/vouchers` – generation (DB-collision-safe), upload (deduped), stock tiers
- **Security posture**: Content-Security-Policy + hardened response headers via `next.config.ts`, constant-time webhook/Cron verification, per-account + per-IP login throttling, `no-store` API responses, health endpoint that never leaks internal details, and a network over-provisioning guard that requires router identity before granting access.

## Theme

The public site and admin portal share a unified "cosmos" dark theme defined by CSS custom properties in `src/app/globals.css` (deep-space palette, glass surfaces, starfield hero).