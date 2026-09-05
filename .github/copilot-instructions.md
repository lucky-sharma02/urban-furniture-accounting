# Copilot instructions for Urban Furniture Accounting

## Project shape

- This repo is a monorepo with npm workspaces: `frontend`, `backend`, and `shared`.
- The shared contract lives in `shared/types.ts`; keep it in sync with `backend/prisma/schema.prisma` and use `@urban-furniture/shared` instead of cross-project relative imports.
- `backend` is a Node/Express + Prisma API. `frontend` is a Vite + React app. They run independently on localhost; the API is not deployed.

## Core accounting rules

- The non-negotiable rule is: every posted journal entry must balance exactly (`sum(debit) === sum(credit)`). The enforcement point is `backend/src/lib/journal-engine.ts` via `postJournalEntry()`.
- Do not bypass this helper. `backend/src/routes/journal-entries.ts` validates inputs, then delegates to `postJournalEntry()`; the journal engine wraps writes in `prisma.$transaction()`.
- Fixed business mappings are hardcoded by account name/journal name, not by generic config. Examples: `getAccountByName("Purchase Expense")`, `getAccountByName("Creditors")`, `getJournalByName("Cash Journal")`.
- Tax is in scope; customer invoice posting can create a 3-line entry: Debtors, Sales Income, Tax Payable.

## Domain and data flow

- Prisma models define the backbone: `Contact`, `Product`, `Account`, `Journal`, `JournalEntry`, `JournalEntryLine`, `PurchaseOrder`, `VendorBill`, `Payment`.
- The app is organized around the accounting flow: master data → transactions → generated journal entries → reports.
- `backend/src/app.ts` mounts top-level routers (`/accounts`, `/contacts`, `/journal-entries`, `/purchase-orders`, `/vendor-bills`, etc.).
- Frontend pages under `frontend/src/pages/internal` correspond to admin/accountant workflows; routes are defined in `frontend/src/App.tsx`.

## Important implementation patterns

- When adding a new accounting transaction, route it through the journal engine and keep the debit/credit side logic explicit in a `post*()` helper in `backend/src/lib/journal-engine.ts`.
- Monetary values from Prisma `Decimal` must be converted before returning JSON (`.toNumber()` / `.toString()`), otherwise the frontend will see `[object Object]` or incorrect money values.
- `shared/types.ts` and `backend/prisma/schema.prisma` are source-of-truth files for enums such as `AccountType`, `JournalEntrySourceType`, and `JournalEntryStatus`.
- Prefer the codebase’s naming conventions: `*Page.tsx` for page components, `*FormDialog.tsx` for dialogs, and API wrappers under `frontend/src/lib/api/*.ts`.

## Local workflows

- Root scripts: `npm run dev:backend`, `npm run dev:frontend`, and `npm run build --workspace=shared`.
- Backend: `npm run dev --workspace=backend`, `npm run build --workspace=backend`, `npm test --workspace=backend`.
- Frontend: `npm run dev --workspace=frontend`, `npm run build --workspace=frontend`.
- `backend` tests are Vitest-based and cover the invariant-heavy accounting logic (`backend/src/lib/*.test.ts`).

## Avoid changing without checking

- Do not add a new generic accounting abstraction before checking whether the repo intentionally hardcodes fixed mappings.
- Do not change the Prisma schema without updating `shared/types.ts` in the same patch.
- Do not introduce cross-project imports outside `@urban-furniture/shared`.

## Example to follow

- `backend/src/lib/journal-engine.core.test.ts` shows the expected behavior for validation and balanced postings. Use it as the model for any accounting logic change.
- `backend/src/routes/journal-entries.ts` is the API-level guardrail; `journal-engine.ts` is the business-logic source of truth.
