import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { toDataUrl } from "@/lib/photo";

interface PhotoViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  value: string | null | undefined;
}

/** Shows a photo (base64, no `data:` prefix) at full size without cropping. */
export function PhotoViewerDialog({
  open,
  onOpenChange,
  label,
  value,
}: PhotoViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{label}</DialogTitle>
        <DialogDescription className="sr-only">
          Visualização ampliada da foto.
        </DialogDescription>
        {value && (
          <img
            src={toDataUrl(value)}
            alt={label}
            className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
