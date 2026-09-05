import { Router } from "express";
import { prisma } from "../lib/prisma";
import { signToken, verifyPassword } from "../lib/auth";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || email.length === 0) {
    return res.status(400).json({ error: "email is required" });
  }
  if (typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ error: "password is required" });
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { contact: true } });
  if (!user) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    contactId: user.contactId ?? undefined,
  });

  // The portal only needs to know which list(s) to show. For a Both contact whose
  // login was scoped down, collapse it to the effective single side here so the
  // frontend never has to reason about portalScope.
  let contactType = user.contact?.type ?? null;
  if (contactType === "Both") {
    if (user.portalScope === "Invoices") contactType = "Customer";
    else if (user.portalScope === "Bills") contactType = "Vendor";
    else contactType = "Both";
  }

  res.json({
    token,
    role: user.role,
    contactId: user.contactId,
    contactType,
  });
});

export default router;
