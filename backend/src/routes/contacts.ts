import { ContactType, Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();
const CONTACT_TYPES = Object.values(ContactType);
const ADDRESS_FIELDS = ["street", "city", "state", "country", "pincode"] as const;

// Pick the structured-address fields present in the body, coercing "" to null.
function addressData(body: Record<string, unknown>) {
  const data: Record<string, string | null> = {};
  for (const field of ADDRESS_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = typeof body[field] === "string" && (body[field] as string).trim() !== ""
        ? (body[field] as string).trim()
        : null;
    }
  }
  return data;
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

router.get("/", async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const contacts = await prisma.contact.findMany({
    where: includeArchived ? undefined : { isArchived: false },
    orderBy: { name: "asc" },
  });
  res.json(contacts);
});

router.post("/", async (req, res) => {
  const { name, type, email, phone, address } = req.body;

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  if (!CONTACT_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${CONTACT_TYPES.join(", ")}` });
  }
  if (typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({ error: "email is required" });
  }

  try {
    const contact = await prisma.contact.create({
      data: { name, type, email, phone, address, ...addressData(req.body ?? {}) },
    });
    res.status(201).json(contact);
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "a contact with this email already exists" });
    }
    throw err;
  }
});

router.put("/:id", async (req, res) => {
  const { name, type, email, phone, address } = req.body;

  if (type !== undefined && !CONTACT_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${CONTACT_TYPES.join(", ")}` });
  }

  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(address !== undefined ? { address } : {}),
        ...addressData(req.body ?? {}),
      },
    });
    res.json(contact);
  } catch (err) {
    if (isNotFoundError(err)) {
      return res.status(404).json({ error: "contact not found" });
    }
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "a contact with this email already exists" });
    }
    throw err;
  }
});

router.patch("/:id/archive", async (req, res) => {
  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { isArchived: true },
    });
    res.json(contact);
  } catch (err) {
    if (isNotFoundError(err)) {
      return res.status(404).json({ error: "contact not found" });
    }
    throw err;
  }
});

export default router;
