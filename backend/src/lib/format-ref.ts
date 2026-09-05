export function formatRef(prefix: string, refNumber: number): string {
  return `${prefix}-${String(refNumber).padStart(4, "0")}`;
}
