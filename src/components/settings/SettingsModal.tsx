import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open as openFileDialog, save } from "@tauri-apps/plugin-dialog";

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
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { useSettings, useUpdateSettings } from "@/lib/queries";

const EVDATA_FILTERS = [{ name: "Avaliação Backup", extensions: ["evdata"] }];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [intervalDays, setIntervalDays] = useState("90");
  const [dueDay, setDueDay] = useState("5");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);

  useEffect(() => {
    if (open && settings) {
      setIntervalDays(String(settings.evaluationIntervalDays));
      setDueDay(String(settings.paymentDueDay));
    }
  }, [open, settings]);

  const parsedInterval = Number(intervalDays);
  const isIntervalValid = Number.isInteger(parsedInterval) && parsedInterval > 0;

  const parsedDueDay = Number(dueDay);
  const isDueDayValid =
    Number.isInteger(parsedDueDay) && parsedDueDay >= 1 && parsedDueDay <= 31;

  const isValid = isIntervalValid && isDueDayValid;

  async function handleSave() {
    if (!isValid) return;
    await updateSettings.mutateAsync({
      evaluationIntervalDays: parsedInterval,
      paymentDueDay: parsedDueDay,
    });
    onOpenChange(false);
  }

  async function handleExport() {
    setBackupStatus(null);
    const path = await save({
      defaultPath: `avaliacao-backup-${new Date().toISOString().slice(0, 10)}.evdata`,
      filters: EVDATA_FILTERS,
    });
    if (!path) return;

    setBackupBusy(true);
    try {
      await invoke("database_export", { destPath: path });
      setBackupStatus("Backup exportado com sucesso.");
    } catch (error) {
      setBackupStatus(`Ocorreu um erro ao exportar: ${error}`);
    } finally {
      setBackupBusy(false);
    }
  }

  async function handlePickImport() {
    setBackupStatus(null);
    const path = await openFileDialog({ multiple: false, filters: EVDATA_FILTERS });
    if (!path || Array.isArray(path)) return;
    // Ask for confirmation outside this dialog to avoid stacking two dialogs at once.
    onOpenChange(false);
    setPendingImportPath(path);
  }

  async function handleConfirmImport() {
    const path = pendingImportPath;
    if (!path) return;
    setPendingImportPath(null);
    try {
      await invoke("database_import", { sourcePath: path });
      // The whole database was replaced — reload so every cached query/state reflects it.
      window.location.reload();
    } catch (error) {
      setBackupStatus(`Ocorreu um erro ao importar: ${error}`);
      onOpenChange(true);
    }
  }

  return (
    <>
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
            aria-invalid={!isIntervalValid}
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
          />
          {!isIntervalValid && (
            <p className="text-destructive text-xs">Informe um número de dias válido</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paymentDueDay">Dia de vencimento mensal</Label>
          <Input
            id="paymentDueDay"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            aria-invalid={!isDueDayValid}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
          {!isDueDayValid && (
            <p className="text-destructive text-xs">Informe um dia entre 1 e 31</p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <Label>Backup</Label>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={backupBusy}
              onClick={handleExport}
            >
              <Download /> Exportar backup
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={backupBusy}
              onClick={handlePickImport}
            >
              <Upload /> Importar backup
            </Button>
          </div>
          {backupStatus && <p className="text-sm">{backupStatus}</p>}
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

      <DeleteConfirmDialog
        open={pendingImportPath !== null}
        onOpenChange={(open) => !open && setPendingImportPath(null)}
        title="Importar backup"
        description="Importar um backup substitui TODOS os dados atuais (alunos, avaliações, pagamentos e configurações) pelos dados do arquivo selecionado. Essa ação não pode ser desfeita."
        confirmLabel="Importar"
        onConfirm={handleConfirmImport}
      />
    </>
  );
}
