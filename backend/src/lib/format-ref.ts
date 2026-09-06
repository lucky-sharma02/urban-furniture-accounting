// Human-facing document numbers. Purchase / Sales Orders use a plain running
// number (P00001 / S00001); Bills and Invoices use a year-scoped form
// (Bill/2026/0001 / INV/2026/0001) built from the document date. `refNumber` is a
// global autoincrement, so the year segment is cosmetic grouping, not a per-year reset.
export function formatRef(prefix: string, refNumber: number, date?: Date | string): string {
  const n4 = String(refNumber).padStart(4, "0");
  const n5 = String(refNumber).padStart(5, "0");
  const year = (date ? new Date(date) : new Date()).getFullYear();

  switch (prefix) {
    case "PO":
      return `P${n5}`;
    case "SO":
      return `S${n5}`;
    case "BILL":
      return `Bill/${year}/${n4}`;
    case "INV":
      return `INV/${year}/${n4}`;
    case "JE":
      return `JE/${year}/${n4}`;
    default:
      return `${prefix}-${n4}`;
  }
}
