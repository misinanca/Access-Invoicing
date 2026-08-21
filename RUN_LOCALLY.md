# Running Locally

This document explains what is needed to run the invoicing database application on a local computer.

## 1. Required software

### Node.js

The project is configured for:

- Node.js 24
- TypeScript 5.9
- pnpm workspaces

Use Node.js 24 or a compatible newer Node.js version.

### pnpm

The repository requires pnpm. Its `preinstall` script rejects npm and Yarn.

With a Node.js installation that includes Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Verify the installations:

```bash
node --version
pnpm --version
```

### PostgreSQL

The Replit configuration uses PostgreSQL 16. You need either:

- A local PostgreSQL 16 server, or
- A remotely hosted PostgreSQL database

The database must exist before running the schema setup command.

## 2. Install dependencies

From the repository root:

```bash
pnpm install --frozen-lockfile
```

The workspace contains:

- `artifacts/api-server` — Express API
- `artifacts/invoicing-db` — React/Vite frontend
- `artifacts/mockup-sandbox` — component preview server
- `lib/db` — Drizzle/PostgreSQL database package
- `lib/api-spec` — OpenAPI and Orval code generation
- `lib/api-client-react` — generated React Query client
- `lib/api-zod` — generated Zod schemas
- `scripts` — utility scripts

The complete dependency graph is pinned in `pnpm-lock.yaml`.

## 3. Configure the database

The application requires the `DATABASE_URL` environment variable.

Example:

```text
postgresql://postgres:password@localhost:5432/invoicing_db
```

### Linux/macOS

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/invoicing_db"
```

### PowerShell

```powershell
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/invoicing_db"
```

Push the database schema:

```bash
pnpm --filter @workspace/db run push
```

There is no checked-in migration directory. Database setup uses Drizzle's schema push command.

When the API server starts, it creates four starter companies if they do not already exist:

- Company 1
- Company 2
- Company 3
- Company 4

A newly created local database receives the schema and starter companies, but the repository does not contain a general seed command for the current sample invoices, customers, products, and other existing Replit data.

## 4. Environment variables

Copy the committed `.env` template into a local file and fill in values:

```bash
cp .env .env.local
```

Edit `.env.local` (this file is gitignored):

```text
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=8080
LOG_LEVEL=info
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8080/api/gmail/callback
TOKEN_ENCRYPTION_KEY=
FRONTEND_URL=http://localhost:19044
```

Load it before running commands:

```bash
set -a; source .env.local; set +a
```

### Required by the API server

```text
DATABASE_URL=
PORT=
LOG_LEVEL=
```

### Optional — Gmail invoice sending

Connect one personal Gmail account for the whole app (Settings → Gmail):

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8080/api/gmail/callback
TOKEN_ENCRYPTION_KEY=
FRONTEND_URL=http://localhost:19044
```

`TOKEN_ENCRYPTION_KEY` must be a 64-character hex string (32 bytes). Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

In Google Cloud Console create an OAuth web client, add the redirect URI above, put the consent screen in Testing, and add your Gmail as a test user. Scopes used: `gmail.send` and `userinfo.email`.

There is no login in the app yet — anyone who can reach the API can send as the connected Gmail account.

The committed `.env` file ships with empty values so secrets stay out of git. Put real values only in `.env.local`.

The API development command sets `NODE_ENV=development` automatically.

### Required by the frontend

```text
PORT=19044
BASE_PATH=/
```

### Optional

The API logger recognizes:

```text
LOG_LEVEL=info
```

### Not currently required

The following Replit secrets are available in the original workspace but are not referenced by the current application code:

- `SESSION_SECRET`
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
- `PRIVATE_OBJECT_DIR`
- `PUBLIC_OBJECT_SEARCH_PATHS`

There is currently no active authentication or object-storage setup required to start the invoicing application locally.

## 5. Start the API server

The API server listens on port `8080`.

### Linux/macOS

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/invoicing_db" \
PORT=8080 \
pnpm --filter @workspace/api-server run dev
```

### PowerShell

```powershell
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/invoicing_db"
$env:PORT="8080"
pnpm --filter @workspace/api-server run dev
```

The API `dev` command:

1. Sets `NODE_ENV=development`
2. Builds the API with esbuild
3. Starts the generated server

It is not a hot-reloading development server. Rerun the command after API code changes.

Health check:

```text
http://localhost:8080/api/healthz
```

## 6. Start the frontend

Open a second terminal.

### Linux/macOS

```bash
PORT=19044 \
BASE_PATH=/ \
pnpm --filter @workspace/invoicing-db run dev
```

### PowerShell

```powershell
$env:PORT="19044"
$env:BASE_PATH="/"
pnpm --filter @workspace/invoicing-db run dev
```

The frontend is served at:

```text
http://localhost:19044/
```

The Vite server listens on all interfaces and uses strict port handling, so port `19044` must be available.

## 7. Local API routing

Replit automatically routes requests as follows:

```text
/api/* → API server
/*     → frontend
```

The current Vite configuration does not define a local `/api` proxy. The frontend makes relative requests such as:

```text
/api/customers
/api/invoices
/api/companies
```

When the frontend is opened directly at `http://localhost:19044`, those requests target port `19044`, while the API is listening on port `8080`.

For a fully working two-port local setup, you need one of the following:

1. A local reverse proxy that routes `/api/*` from the frontend port to `http://localhost:8080`.
2. A local Vite proxy configuration that forwards `/api` to `http://localhost:8080`.
3. A single local web server that serves the frontend and forwards `/api` to the API server.

No local proxy configuration is currently included in the repository. The API has permissive CORS enabled, so direct cross-origin API requests are allowed if the frontend is configured to use `http://localhost:8080`; the current generated client, however, uses relative `/api/...` paths.

## 8. Useful commands

### Full typecheck

```bash
pnpm run typecheck
```

### Build all packages

```bash
pnpm run build
```

This runs typechecking first, then builds packages that expose build scripts.

### Build only the API

```bash
pnpm --filter @workspace/api-server run build
```

### Build only the frontend

```bash
pnpm --filter @workspace/invoicing-db run build
```

### Serve the built frontend

```bash
PORT=19044 \
BASE_PATH=/ \
pnpm --filter @workspace/invoicing-db run serve
```

The frontend build output is written to:

```text
artifacts/invoicing-db/dist/public
```

### Regenerate API clients

Run this only after changing `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates the React Query hooks, TypeScript API schemas, and Zod validators.

### Push database schema changes

```bash
pnpm --filter @workspace/db run push
```

There is also a force variant:

```bash
pnpm --filter @workspace/db run push-force
```

Use the force variant cautiously because it can apply more aggressive schema changes.

## 9. Minimal setup checklist

- [ ] Install Node.js 24 or compatible newer Node.js
- [ ] Install and verify pnpm
- [ ] Install or provision PostgreSQL 16
- [ ] Create a PostgreSQL database
- [ ] Clone the repository
- [ ] Run `pnpm install --frozen-lockfile`
- [ ] Set `DATABASE_URL`
- [ ] Run `pnpm --filter @workspace/db run push`
- [ ] Keep port `8080` available for the API
- [ ] Keep port `19044` available for the frontend
- [ ] Configure local `/api` routing from the frontend to the API
- [ ] Start the API
- [ ] Start the frontend

## 10. Quick start

### Windows (PowerShell)

After PostgreSQL is running, `.env.local` is filled in, and dependencies are installed:

```powershell
.\start-local.cmd
```

Or:

```powershell
.\start-local.ps1
```

This builds/starts the API on port `8080`, waits for health, then starts the frontend on port `19044`.

`start-local.cmd` does not need admin and bypasses PowerShell script policy for this run only.

If `.\start-local.ps1` is blocked:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

That CurrentUser policy change also does not need admin.
### macOS / Linux / Git Bash

After PostgreSQL is running and the database has been created:

```bash
pnpm install --frozen-lockfile

export DATABASE_URL="postgresql://postgres:password@localhost:5432/invoicing_db"
pnpm --filter @workspace/db run push
```

Or put the same values in `.env.local` and load them with `set -a; source .env.local; set +a`.

Start the API in one terminal:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Start the frontend in another terminal:

```bash
PORT=19044 BASE_PATH=/ pnpm --filter @workspace/invoicing-db run dev
```

Then open:

```text
http://localhost:19044/
```

Remember to configure the local `/api` routing described above before using the frontend.