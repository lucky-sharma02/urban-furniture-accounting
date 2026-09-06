import { AlertTriangle } from "lucide-react";

interface BudgetWarningNoticeProps {
  warnings: string[];
  /** Heading above the list, e.g. "Order saved — budget notice". */
  title?: string;
  className?: string;
}

/**
 * Non-blocking "Exceeds Approved Budget" notice shown after confirming a
 * Purchase Order / Sales Order / Vendor Bill or generating an invoice.
 */
export function BudgetWarningNotice({
  warnings,
  title = "Saved — budget notice",
  className = "",
}: BudgetWarningNoticeProps) {
  if (warnings.length === 0) return null;
  return (
    <div
      className={`rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 ${className}`}
    >
      <p className="mb-1 flex items-center gap-1.5 font-semibold">
        <AlertTriangle className="h-3.5 w-3.5" />
        {title}
      </p>
      <ul className="list-disc space-y-0.5 pl-5">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
