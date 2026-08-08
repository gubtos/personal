import { useState, type ChangeEvent } from "react";
import { ImageIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoEditorModal } from "@/components/shared/PhotoEditorModal";
import { toDataUrl } from "@/lib/photo";

interface PhotoPickerFieldProps {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (base64: string | null) => void;
}

export function PhotoPickerField({
  id,
  label,
  value,
  onChange,
}: PhotoPickerFieldProps) {
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingSrc(URL.createObjectURL(file));
    setEditorOpen(true);
  }

  function closeEditor() {
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(null);
    setEditorOpen(false);
  }

  function handleConfirm(base64: string) {
    onChange(base64);
    closeEditor();
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
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Remover ${label}`}
            onClick={() => onChange(null)}
          >
            <XIcon />
          </Button>
        )}
      </div>
      <PhotoEditorModal
        open={editorOpen}
        imageSrc={pendingSrc}
        onCancel={closeEditor}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
