import { Input } from "@/components/ui/input";
import { previewIndoPhone } from "@/lib/phone";

export function PhoneInput({
  id,
  value,
  onChange,
  error,
  placeholder = "812 3456 7890",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  placeholder?: string;
}) {
  const preview = previewIndoPhone(value);
  return (
    <div>
      <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
        <span className="flex items-center bg-secondary px-2.5 font-data text-xs">+62</span>
        <Input
          id={id}
          inputMode="tel"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 rounded-none border-0 font-data focus-visible:ring-0"
        />
      </div>
      <p className="mt-1 min-h-4 text-[11px]">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : preview ? (
          <span className="text-muted-foreground">
            Disimpan: <span className="font-data text-foreground">{preview}</span>
          </span>
        ) : null}
      </p>
    </div>
  );
}
