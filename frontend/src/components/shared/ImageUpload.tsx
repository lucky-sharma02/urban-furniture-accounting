import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileToResizedDataUrl } from "@/lib/image";

interface ImageUploadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  shape?: "square" | "circle";
  className?: string;
}

export function ImageUpload({ value, onChange, shape = "square", className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToResizedDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const rounded = shape === "circle" ? "rounded-full" : "rounded-lg";

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className={cn("relative h-28 w-28", rounded, "overflow-hidden border border-slate-200 bg-slate-50")}>
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">{busy ? "Processing…" : "Upload image"}</span>
          </button>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
        >
          {busy ? "Processing…" : "Replace"}
        </button>
      )}
      {error && <p className="text-center text-[11px] text-rose-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
