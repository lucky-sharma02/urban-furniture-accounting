// Opt-in demo data generator — NOT part of the idempotent `prisma db seed` flow.
// Run explicitly with `npm run seed:bulk --workspace=backend` when you want a large,
// realistic-looking dataset (100 products, 50 purchase orders, 50 sales orders in
// mixed lifecycle states) for demoing reports, search, and pagination-adjacent UI.
//
// Every transaction here goes through the same postVendorBill/postVendorPayment/
// postCustomerInvoice/postCustomerPayment functions the real routes use — never
// raw JournalEntryLine inserts — so the ledger this produces is exactly as valid
// as one built by hand through the UI.
import { PrismaClient } from "@prisma/client";
import {
  getJournalByName,
  postCustomerInvoice,
  postCustomerPayment,
  postVendorBill,
  postVendorPayment,
} from "../src/lib/journal-engine";

const prisma = new PrismaClient();

const GST_RATE = 0.18;

const CATEGORIES = ["Chairs", "Tables", "Storage", "Beds", "Lighting", "Decor"];
const ADJECTIVES = ["Oak", "Walnut", "Teak", "Maple", "Pine", "Mahogany", "Bamboo", "Metal", "Glass", "Rattan"];
const NOUNS = ["Chair", "Table", "Bookshelf", "Cabinet", "Bed Frame", "Lamp", "Sofa", "Desk", "Stool", "Wardrobe"];

// "Sterling Timber Co." is deliberately excluded here — it's already seeded by the
// base seed.ts under a hand-picked email. Including it here too would slug to a
// different email ("sterling.timber.co.@example.com" vs "sterling.timber@example.com")
// and upsert a *second*, unrelated Contact row with the same display name.
const VENDOR_NAMES = [
  "Northwood Supplies",
  "Golden Grain Traders",
  "Heritage Hardwoods",
  "Coastal Lumber Ltd.",
  "Silver Oak Traders",
];

const CUSTOMER_NAMES = [
  "Meera Kulkarni",
  "Aditya Rao",
  "Priya Sharma",
  "Ramesh Iyer",
  "Kavita Nair",
  "Vikram Desai",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function slugEmail(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
}

function randomPastDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, 180));
  return date;
}

async function seedContacts() {
  const vendors = [];
  for (const name of VENDOR_NAMES) {
    const email = slugEmail(name);
    vendors.push(
      await prisma.contact.upsert({
        where: { email },
        update: {},
        create: { name, type: "Vendor", email },
      }),
    );
  }

  const customers = [];
  for (const name of CUSTOMER_NAMES) {
    const email = slugEmail(name);
    customers.push(
      await prisma.contact.upsert({
        where: { email },
        update: {},
        create: { name, type: "Customer", email },
      }),
    );
  }

  return { vendors, customers };
}

async function seedProducts() {
  const products = [];
  const usedNames = new Set<string>();
  let counter = 0;

  while (products.length < 100) {
    counter += 1;
    const name = `${pick(ADJECTIVES)} ${pick(NOUNS)} #${counter}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const purchasePrice = randomInt(500, 5000);
    const salesPrice = Math.round(purchasePrice * 1.5);

    products.push(
      await prisma.product.upsert({
        where: { name },
        update: {},
        create: { name, category: pick(CATEGORIES), salesPrice, purchasePrice },
      }),
    );
  }

  return products;
}

async function main() {
  const [existingPoCount, existingProductCount] = await Promise.all([
    prisma.purchaseOrder.count(),
    prisma.product.count(),
  ]);
  if (existingPoCount >= 50 && existingProductCount >= 100) {
    console.log("Bulk demo data already present (>=50 POs, >=100 products) — skipping. Delete rows manually to re-seed.");
    return;
  }

  console.log("Seeding bulk demo data (100 products, 50 purchase orders, 50 sales orders)...");

  const { vendors, customers } = await seedContacts();
  const products = await seedProducts();

  const [bank, purchaseJournal, salesJournal] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { name: "Bank" } }),
    getJournalByName("Purchase Journal"),
    getJournalByName("Sales Journal"),
  ]);

  for (let n = 0; n < 50; n++) {
    const vendor = pick(vendors);
    const lineInputs = Array.from({ length: randomInt(1, 3) }, () => {
      const product = pick(products);
      return { productId: product.id, quantity: randomInt(1, 5), unitPrice: product.purchasePrice.toNumber() };
    });
    const date = randomPastDate();

    const po = await prisma.purchaseOrder.create({
      data: { vendorId: vendor.id, date, lines: { create: lineInputs } },
    });

    const outcome = n % 4; // 0 Draft, 1 Billed-unpaid, 2 partial, 3 paid
    if (outcome === 0) continue;

    const amount = lineInputs.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const bill = await prisma.vendorBill.create({
      data: { purchaseOrderId: po.id, vendorId: vendor.id, date, amount, amountDue: amount, status: "Draft" },
    });
    await postVendorBill({
      journalId: purchaseJournal.id,
      vendorId: vendor.id,
      amount,
      date,
      reference: `Demo seed PO #${n + 1}`,
      sourceId: bill.id,
    });
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: "Billed" } });

    if (outcome === 1) continue;

    const payAmount = outcome === 2 ? Math.round(amount * 0.5 * 100) / 100 : amount;
    const payment = await prisma.payment.create({
      data: { vendorBillId: bill.id, amount: payAmount, date, paymentAccountId: bank.id },
    });
    const newAmountDue = Math.max(0, toCents(amount) - toCents(payAmount)) / 100;
    await prisma.vendorBill.update({
      where: { id: bill.id },
      data: { amountDue: newAmountDue, status: newAmountDue === 0 ? "Paid" : "Partial" },
    });
    await postVendorPayment({
      journalId: purchaseJournal.id,
      vendorId: vendor.id,
      amount: payAmount,
      date,
      reference: `Demo seed payment for PO #${n + 1}`,
      sourceId: payment.id,
      paymentAccountId: bank.id,
    });
  }

  for (let n = 0; n < 50; n++) {
    const customer = pick(customers);
    const lineInputs = Array.from({ length: randomInt(1, 3) }, () => {
      const product = pick(products);
      return { productId: product.id, quantity: randomInt(1, 5), unitPrice: product.salesPrice.toNumber() };
    });
    const date = randomPastDate();

    const so = await prisma.salesOrder.create({
      data: { customerId: customer.id, date, lines: { create: lineInputs } },
    });

    const outcome = n % 4; // 0 Draft, 1 Invoiced-unpaid, 2 partial, 3 paid
    if (outcome === 0) continue;

    const baseAmount = lineInputs.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const taxAmount = Math.round(baseAmount * GST_RATE * 100) / 100;
    const amount = baseAmount + taxAmount;

    const invoice = await prisma.customerInvoice.create({
      data: {
        salesOrderId: so.id,
        customerId: customer.id,
        date,
        baseAmount,
        taxAmount,
        amount,
        amountDue: amount,
        status: "Draft",
      },
    });
    await postCustomerInvoice({
      journalId: salesJournal.id,
      customerId: customer.id,
      baseAmount,
      taxAmount,
      date,
      reference: `Demo seed SO #${n + 1}`,
      sourceId: invoice.id,
    });
    await prisma.salesOrder.update({ where: { id: so.id }, data: { status: "Invoiced" } });

    if (outcome === 1) continue;

    const payAmount = outcome === 2 ? Math.round(amount * 0.5 * 100) / 100 : amount;
    const payment = await prisma.payment.create({
      data: { customerInvoiceId: invoice.id, amount: payAmount, date, paymentAccountId: bank.id },
    });
    const newAmountDue = Math.max(0, toCents(amount) - toCents(payAmount)) / 100;
    await prisma.customerInvoice.update({
      where: { id: invoice.id },
      data: { amountDue: newAmountDue, status: newAmountDue === 0 ? "Paid" : "Partial" },
    });
    await postCustomerPayment({
      journalId: salesJournal.id,
      customerId: customer.id,
      amount: payAmount,
      date,
      reference: `Demo seed payment for SO #${n + 1}`,
      sourceId: payment.id,
      paymentAccountId: bank.id,
    });
  }

  console.log("Bulk demo seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
