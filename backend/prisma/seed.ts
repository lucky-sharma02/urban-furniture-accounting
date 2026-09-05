import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  await Promise.all([
    prisma.account.upsert({
      where: { name: "Cash" },
      update: {},
      create: { name: "Cash", type: "Cash" },
    }),
    prisma.account.upsert({
      where: { name: "Bank" },
      update: {},
      create: { name: "Bank", type: "Bank" },
    }),
    prisma.account.upsert({
      where: { name: "Debtors" },
      update: {},
      create: { name: "Debtors", type: "Asset" },
    }),
    prisma.account.upsert({
      where: { name: "Creditors" },
      update: {},
      create: { name: "Creditors", type: "Liability" },
    }),
    prisma.account.upsert({
      where: { name: "Tax Payable" },
      update: {},
      create: { name: "Tax Payable", type: "Liability" },
    }),
    prisma.account.upsert({
      where: { name: "Capital" },
      update: {},
      create: { name: "Capital", type: "Capital" },
    }),
    prisma.account.upsert({
      where: { name: "Sales Income" },
      update: {},
      create: { name: "Sales Income", type: "Income" },
    }),
    prisma.account.upsert({
      where: { name: "Purchase Expense" },
      update: {},
      create: { name: "Purchase Expense", type: "Expenses" },
    }),
  ]);

  await Promise.all([
    prisma.journal.upsert({
      where: { name: "Sales Journal" },
      update: {},
      create: { name: "Sales Journal", type: "Sales" },
    }),
    prisma.journal.upsert({
      where: { name: "Purchase Journal" },
      update: {},
      create: { name: "Purchase Journal", type: "Purchase" },
    }),
    prisma.journal.upsert({
      where: { name: "Bank Journal" },
      update: {},
      create: { name: "Bank Journal", type: "Bank" },
    }),
    prisma.journal.upsert({
      where: { name: "Cash Journal" },
      update: {},
      create: { name: "Cash Journal", type: "Cash" },
    }),
  ]);

  const sterling = await prisma.contact.upsert({
    where: { email: "sterling.timber@example.com" },
    update: {},
    create: {
      name: "Sterling Timber Co.",
      type: "Vendor",
      email: "sterling.timber@example.com",
    },
  });

  const meera = await prisma.contact.upsert({
    where: { email: "meera.kulkarni@example.com" },
    update: {},
    create: {
      name: "Meera Kulkarni",
      type: "Customer",
      email: "meera.kulkarni@example.com",
    },
  });

  await prisma.product.upsert({
    where: { name: "Oak Bookshelf" },
    update: {},
    create: {
      name: "Oak Bookshelf",
      category: "Furniture",
      salesPrice: 4500,
      purchasePrice: 3000,
    },
  });

  // Demo logins — change these before any non-local deployment.
  const [adminPassword, accountantPassword, customerPortalPassword, vendorPortalPassword] = await Promise.all([
    hashPassword("admin123"),
    hashPassword("accountant123"),
    hashPassword("portal123"),
    hashPassword("portal123"),
  ]);

  await prisma.user.upsert({
    where: { email: "admin@urbanfurniture.com" },
    update: {},
    create: { email: "admin@urbanfurniture.com", passwordHash: adminPassword, role: "Admin" },
  });

  await prisma.user.upsert({
    where: { email: "accountant@urbanfurniture.com" },
    update: {},
    create: { email: "accountant@urbanfurniture.com", passwordHash: accountantPassword, role: "Accountant" },
  });

  await prisma.user.upsert({
    where: { email: "meera.kulkarni@example.com" },
    update: {},
    create: {
      email: "meera.kulkarni@example.com",
      passwordHash: customerPortalPassword,
      role: "Contact",
      contactId: meera.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "sterling.timber@example.com" },
    update: {},
    create: {
      email: "sterling.timber@example.com",
      passwordHash: vendorPortalPassword,
      role: "Contact",
      contactId: sterling.id,
    },
  });
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
