import cors from "cors";
import express from "express";
import { authGuard, requireRole } from "./middleware/auth-guard";
import accountsRouter from "./routes/accounts";
import analyticAccountsRouter from "./routes/analytic-accounts";
import authRouter from "./routes/auth";
import budgetsRouter from "./routes/budgets";
import contactsRouter from "./routes/contacts";
import customerInvoicesRouter from "./routes/customer-invoices";
import journalEntriesRouter from "./routes/journal-entries";
import journalsRouter from "./routes/journals";
import paymentAccountsRouter from "./routes/payment-accounts";
import productsRouter from "./routes/products";
import purchaseOrdersRouter from "./routes/purchase-orders";
import reportsRouter from "./routes/reports";
import salesOrdersRouter from "./routes/sales-orders";
import usersRouter from "./routes/users";
import vendorBillsRouter from "./routes/vendor-bills";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);

// authGuard runs on everything below this line — every route must carry a valid JWT.
app.use(authGuard);

// Master data, Purchase Orders and Sales Orders have zero Contact-role access per the
// role table (Contact's portal only ever shows Bills/Invoices) — Admin/Accountant only.
const staffOnly = requireRole("Admin", "Accountant");
app.use("/accounts", staffOnly, accountsRouter);
app.use("/contacts", staffOnly, contactsRouter);
app.use("/journal-entries", staffOnly, journalEntriesRouter);
app.use("/journals", staffOnly, journalsRouter);
app.use("/products", staffOnly, productsRouter);
app.use("/purchase-orders", staffOnly, purchaseOrdersRouter);
app.use("/sales-orders", staffOnly, salesOrdersRouter);
app.use("/reports", staffOnly, reportsRouter);
app.use("/analytic-accounts", staffOnly, analyticAccountsRouter);
app.use("/budgets", staffOnly, budgetsRouter);

// User management is Admin-only per the role table — Accountant does not manage logins.
app.use("/users", requireRole("Admin"), usersRouter);

// VendorBill/CustomerInvoice apply their own per-route role/ownership checks internally,
// since Contact users get read-only + payment-only access scoped to their own records.
app.use("/customer-invoices", customerInvoicesRouter);
app.use("/vendor-bills", vendorBillsRouter);

// Bank/Cash accounts for the Record Payment dialog — every authenticated role,
// including Contact (portal) users who cannot reach /accounts.
app.use("/payment-accounts", paymentAccountsRouter);

export default app;
