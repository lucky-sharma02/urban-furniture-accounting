import { Prisma, type Product } from "@prisma/client";
import { Router } from "express";
import { formatRef } from "../lib/format-ref";
import { prisma } from "../lib/prisma";

const router = Router();

// Prisma Decimal doesn't serialize to JSON as a plain number — convert explicitly
// and consistently (.toNumber()) on every response, per project convention.
function serializeProduct(product: Product) {
  return {
    ...product,
    refNumber: formatRef("PRD", product.refNumber),
    salesPrice: product.salesPrice.toNumber(),
    purchasePrice: product.purchasePrice.toNumber(),
  };
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

const PRODUCT_TYPES = ["Goods", "Service", "Combo"] as const;
function isValidType(value: unknown): value is (typeof PRODUCT_TYPES)[number] {
  return typeof value === "string" && (PRODUCT_TYPES as readonly string[]).includes(value);
}

// A downscaled data: URL from the client (resized to ~320px before sending).
const MAX_IMAGE_CHARS = 300_000;
function parseImageDataUrl(value: unknown): { imageDataUrl?: string | null } | { error: string } {
  if (value === undefined) return {};
  if (value === null || value === "") return { imageDataUrl: null };
  if (typeof value !== "string" || !value.startsWith("data:image/")) {
    return { error: "imageDataUrl must be an image data URL" };
  }
  if (value.length > MAX_IMAGE_CHARS) {
    return { error: "the image is too large — please use a smaller file" };
  }
  return { imageDataUrl: value };
}

router.get("/", async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const products = await prisma.product.findMany({
    where: includeArchived ? undefined : { isArchived: false },
    orderBy: { name: "asc" },
  });
  res.json(products.map(serializeProduct));
});

router.post("/", async (req, res) => {
  const { name, category, salesPrice, purchasePrice, type } = req.body;

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  if (typeof category !== "string" || category.trim() === "") {
    return res.status(400).json({ error: "category is required" });
  }
  if (type !== undefined && !isValidType(type)) {
    return res.status(400).json({ error: "type must be Goods, Service or Combo" });
  }
  if (!isValidPrice(salesPrice)) {
    return res.status(400).json({ error: "salesPrice must be a non-negative number" });
  }
  if (!isValidPrice(purchasePrice)) {
    return res.status(400).json({ error: "purchasePrice must be a non-negative number" });
  }

  const image = parseImageDataUrl(req.body?.imageDataUrl);
  if ("error" in image) return res.status(400).json({ error: image.error });

  try {
    const product = await prisma.product.create({
      data: {
        name,
        category,
        salesPrice,
        purchasePrice,
        ...(isValidType(type) ? { type } : {}),
        ...image,
      },
    });
    res.status(201).json(serializeProduct(product));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "a product with this name already exists" });
    }
    throw err;
  }
});

router.put("/:id", async (req, res) => {
  const { name, category, salesPrice, purchasePrice, type } = req.body;

  if (salesPrice !== undefined && !isValidPrice(salesPrice)) {
    return res.status(400).json({ error: "salesPrice must be a non-negative number" });
  }
  if (purchasePrice !== undefined && !isValidPrice(purchasePrice)) {
    return res.status(400).json({ error: "purchasePrice must be a non-negative number" });
  }
  if (type !== undefined && !isValidType(type)) {
    return res.status(400).json({ error: "type must be Goods, Service or Combo" });
  }

  const image = parseImageDataUrl(req.body?.imageDataUrl);
  if ("error" in image) return res.status(400).json({ error: image.error });

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(isValidType(type) ? { type } : {}),
        ...(salesPrice !== undefined ? { salesPrice } : {}),
        ...(purchasePrice !== undefined ? { purchasePrice } : {}),
        ...image,
      },
    });
    res.json(serializeProduct(product));
  } catch (err) {
    if (isNotFoundError(err)) {
      return res.status(404).json({ error: "product not found" });
    }
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "a product with this name already exists" });
    }
    throw err;
  }
});

router.patch("/:id/archive", async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isArchived: true },
    });
    res.json(serializeProduct(product));
  } catch (err) {
    if (isNotFoundError(err)) {
      return res.status(404).json({ error: "product not found" });
    }
    throw err;
  }
});

export default router;
