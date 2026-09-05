import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  /** Called with the trimmed query only when the user presses Enter (or clears the field). */
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Seed the field (e.g. restoring a previous query). Not treated as a live value. */
  initialValue?: string;
  "aria-label"?: string;
}

/**
 * A search input that commits on Enter rather than on every keystroke. Clearing the
 * field to empty commits immediately so the list is never left stale-filtered.
 */
export function SearchBar({
  onSearch,
  placeholder = "Search...",
  className,
  initialValue = "",
  "aria-label": ariaLabel,
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div className={cn("relative flex-1 sm:max-w-md", className)}>
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <Input
        type="search"
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value === "") onSearch("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSearch(value.trim());
          }
        }}
        className="h-9 border-slate-200 bg-white pl-9 text-xs shadow-2xs focus:border-slate-400"
      />
    </div>
  );
}
