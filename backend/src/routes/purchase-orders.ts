import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

interface LineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

function isValidLine(line: unknown): line is LineInput {
  if (typeof line !== "object" || line === null) return false;
  const l = line as Record<string, unknown>;
  return (
    typeof l.productId === "string" &&
    l.productId.length > 0 &&
    typeof l.quantity === "number" &&
    l.quantity > 0 &&
    typeof l.unitPrice === "number" &&
    l.unitPrice >= 0
  );
}

router.post("/", async (req, res) => {
  const { vendorId, date, lines } = req.body;

  if (typeof vendorId !== "string" || vendorId.length === 0) {
    return res.status(400).json({ error: "vendorId is required" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every(isValidLine)) {
    return res.status(400).json({
      error: "at least one line is required, each with productId, quantity, and unitPrice",
    });
  }

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      vendorId,
      date: new Date(date),
      lines: {
        create: lines.map((line: LineInput) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      },
    },
    include: { lines: true },
  });

  res.status(201).json({
    ...purchaseOrder,
    lines: purchaseOrder.lines.map((line) => ({
      ...line,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
    })),
  });
});

export default router;
