import { prisma } from "./prisma";

export async function getOrCreateTestVendor() {
  return prisma.contact.upsert({
    where: { email: "test-vendor@example.com" },
    update: {},
    create: { name: "Test Vendor", type: "Vendor", email: "test-vendor@example.com" },
  });
}

export async function getOrCreateTestCustomer() {
  return prisma.contact.upsert({
    where: { email: "test-customer@example.com" },
    update: {},
    create: { name: "Test Customer", type: "Customer", email: "test-customer@example.com" },
  });
}

export async function getJournalByName(name: string) {
  return prisma.journal.findUniqueOrThrow({ where: { name } });
}

export async function cleanupJournalEntries(sourceIds: string[]) {
  if (sourceIds.length === 0) return;
  await prisma.journalEntryLine.deleteMany({
    where: { journalEntry: { sourceId: { in: sourceIds } } },
  });
  await prisma.journalEntry.deleteMany({ where: { sourceId: { in: sourceIds } } });
}
