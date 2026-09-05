import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// The list of Bank/Cash accounts a payment can be settled against. Every
// authenticated role needs this for the "Record Payment" dialog — including
// Contact (portal) users, who otherwise have no access to /accounts. It only
// exposes id/name/type for liquid accounts, never the full Chart of Accounts.
router.get("/", async (_req, res) => {
  const accounts = await prisma.account.findMany({
    where: { isArchived: false, type: { in: ["Bank", "Cash"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });
  res.json(accounts);
});

export default router;
