import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, useUpdateSettings } from "@/lib/queries";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [intervalDays, setIntervalDays] = useState("90");

  useEffect(() => {
    if (open && settings) {
      setIntervalDays(String(settings.evaluationIntervalDays));
    }
  }, [open, settings]);

  const parsedInterval = Number(intervalDays);
  const isValid = Number.isInteger(parsedInterval) && parsedInterval > 0;

  async function handleSave() {
    if (!isValid) return;
    await updateSettings.mutateAsync({ evaluationIntervalDays: parsedInterval });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Ajuste as configurações gerais do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evaluationIntervalDays">
            Intervalo entre avaliações (dias)
          </Label>
          <Input
            id="evaluationIntervalDays"
            type="number"
            min={1}
            inputMode="numeric"
            aria-invalid={!isValid}
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
          />
          {!isValid && (
            <p className="text-destructive text-xs">Informe um número de dias válido</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isValid || updateSettings.isPending}
          >
            {updateSettings.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
