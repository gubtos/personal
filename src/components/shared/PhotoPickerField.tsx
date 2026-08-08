import type { ChangeEvent } from "react";
import { ImageIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileToBase64, toDataUrl } from "@/lib/photo";

interface PhotoPickerFieldProps {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (base64: string) => void;
}

export function PhotoPickerField({
  id,
  label,
  value,
  onChange,
}: PhotoPickerFieldProps) {
  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    onChange(base64);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {value ? (
            <img
              src={toDataUrl(value)}
              alt={label}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="text-muted-foreground size-6" />
          )}
        </div>
        <Input id={id} type="file" accept="image/*" onChange={handleChange} />
      </div>
    </div>
  );
}
