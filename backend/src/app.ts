import cors from "cors";
import express from "express";
import accountsRouter from "./routes/accounts";
import contactsRouter from "./routes/contacts";
import journalsRouter from "./routes/journals";

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
app.use("/journals", journalsRouter);

export default app;
