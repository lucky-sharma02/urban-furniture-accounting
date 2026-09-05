import type { Request } from "express";

// A Contact-role user's JWT carries contactId — every query a portal user makes must be
// filtered down to that one Contact's own records. Admin/Accountant see everything.

export function isContactUser(req: Request): boolean {
  return req.user?.role === "Contact";
}

// Returns a Prisma `where` fragment scoping list queries to the caller's own records
// when they're a Contact user, or {} (no restriction) for Admin/Accountant.
export function scopeWhere(req: Request, field: "vendorId" | "customerId"): Record<string, string> {
  if (isContactUser(req) && req.user?.contactId) {
    return { [field]: req.user.contactId };
  }
  return {};
}

// For a single-record route (GET/POST by :id), confirms a Contact user owns the record
// identified by ownerId (the record's vendorId/customerId). Admin/Accountant always pass.
export function ownsRecord(req: Request, ownerId: string): boolean {
  if (!isContactUser(req)) return true;
  return req.user?.contactId === ownerId;
}
