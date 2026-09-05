import cors from "cors";
import express from "express";
import accountsRouter from "./routes/accounts";
import contactsRouter from "./routes/contacts";
import journalEntriesRouter from "./routes/journal-entries";
import journalsRouter from "./routes/journals";
import productsRouter from "./routes/products";
import purchaseOrdersRouter from "./routes/purchase-orders";
import salesOrdersRouter from "./routes/sales-orders";
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

app.use("/accounts", accountsRouter);
app.use("/contacts", contactsRouter);
app.use("/journal-entries", journalEntriesRouter);
app.use("/journals", journalsRouter);
app.use("/products", productsRouter);
app.use("/purchase-orders", purchaseOrdersRouter);
app.use("/sales-orders", salesOrdersRouter);
app.use("/vendor-bills", vendorBillsRouter);

export default app;
