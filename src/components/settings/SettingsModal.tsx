import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
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
import { ProgressBar } from "@/components/ui/progress-bar";
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
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(""));
  }, []);

  useEffect(() => {
    if (open && settings) {
      setIntervalDays(String(settings.evaluationIntervalDays));
    }
  }, [open, settings]);

  const parsedInterval = Number(intervalDays);
  const isIntervalValid = Number.isInteger(parsedInterval) && parsedInterval > 0;

  async function handleSave() {
    if (!isIntervalValid) return;
    await updateSettings.mutateAsync({
      evaluationIntervalDays: parsedInterval,
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
    setPendingImportPath(path);
  }

  function handleCancelImport() {
    setPendingImportPath(null);
  }

  async function handleConfirmImport() {
    const path = pendingImportPath;
    if (!path) return;
    setPendingImportPath(null);
    setBackupBusy(true);
    try {
      await invoke("database_import", { sourcePath: path });
      // The whole database was replaced — reload so every cached query/state reflects it.
      window.location.reload();
    } catch (error) {
      setBackupStatus(`Ocorreu um erro ao importar: ${error}`);
    } finally {
      setBackupBusy(false);
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

        {pendingImportPath ? (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                Importar um backup substitui <strong>TODOS</strong> os dados atuais
                (alunos, avaliações, pagamentos e configurações) pelos dados do
                arquivo selecionado. Essa ação não pode ser desfeita.
              </p>
              {backupBusy && (
                <ProgressBar label="Processando backup... Isso pode levar alguns minutos." />
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={backupBusy}
                onClick={handleCancelImport}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={backupBusy}
                onClick={handleConfirmImport}
              >
                {backupBusy ? "Importando..." : "Importar"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
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

            <div className="flex flex-col gap-2 border-t pt-4">
              <Label>Backup</Label>
              {backupBusy ? (
                <ProgressBar label="Processando backup... Isso pode levar alguns minutos." />
              ) : (
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
              )}
              {backupStatus && <p className="text-sm">{backupStatus}</p>}
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <Label>Sobre</Label>
              <div className="text-muted-foreground flex flex-col gap-0.5 border-b pb-4 text-xs">
                <span>Versão {version || "—"}</span>
                <span>Desenvolvido por <a href="https://github.com/gubtos" target="_blank" rel="noopener noreferrer">Gustavo Okuyama</a></span>
                <span>Todos os direitos reservados</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!isIntervalValid || updateSettings.isPending}
              >
                {updateSettings.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
