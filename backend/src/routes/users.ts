import { Prisma } from "@prisma/client";
import { Router } from "express";
import { hashPassword } from "../lib/auth";
import { prisma } from "../lib/prisma";

const router = Router();

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// Staff roles map straight to the DB Role enum. "Vendor" / "Customer" are portal
// roles — each creates (or reuses) a Contact of that type plus a Contact-role
// login scoped to it. The admin never picks a specific contact separately.
const STAFF_ROLES = ["Admin", "Accountant"] as const;
const PORTAL_ROLES = ["Vendor", "Customer"] as const;
const ALL_ROLES = [...STAFF_ROLES, ...PORTAL_ROLES] as const;

type PortalRole = (typeof PORTAL_ROLES)[number];

function isPortalRole(role: string): role is PortalRole {
  return (PORTAL_ROLES as readonly string[]).includes(role);
}

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    users.map((user) => ({
      id: user.id,
      email: user.email,
      // Show the portal role (Vendor/Customer) rather than the internal "Contact".
      role: user.contact ? user.contact.type : user.role,
      contactId: user.contactId,
      contactName: user.contact?.name ?? null,
      createdAt: user.createdAt,
    })),
  );
});

router.post("/", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (typeof email !== "string" || email.trim().length === 0) {
    return res.status(400).json({ error: "email is required" });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }
  if (typeof role !== "string" || !ALL_ROLES.includes(role as (typeof ALL_ROLES)[number])) {
    return res.status(400).json({ error: `role must be one of ${ALL_ROLES.join(", ")}` });
  }

  const trimmedEmail = email.trim();

  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return res.status(409).json({ error: "a user with this email already exists" });
  }

  // Staff login — no contact, no portal scope.
  if (!isPortalRole(role)) {
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash: await hashPassword(password),
        role: role as (typeof STAFF_ROLES)[number],
      },
    });
    return res.status(201).json({ id: user.id, email: user.email, role: user.role });
  }

  // Portal login (Vendor / Customer).
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "name is required for a Vendor or Customer user" });
  }

  const contactType = role; // "Vendor" | "Customer"
  const portalScope = contactType === "Vendor" ? "Bills" : "Invoices";

  // Reuse an existing contact with this email, otherwise create one.
  let contact = await prisma.contact.findUnique({ where: { email: trimmedEmail } });
  if (!contact) {
    contact = await prisma.contact.create({
      data: { name: name.trim(), type: contactType, email: trimmedEmail },
    });
  } else if (contact.type !== contactType && contact.type !== "Both") {
    return res.status(409).json({
      error: `a ${contact.type} contact already exists with this email`,
    });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash: await hashPassword(password),
        role: "Contact",
        contactId: contact.id,
        portalScope,
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: contactType,
      contactId: user.contactId,
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "this contact already has a portal login" });
    }
    throw err;
  }
});

export default router;
