import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { open as openFileDialog, save } from "@tauri-apps/plugin-dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const EVDATA_FILTERS = [{ name: "Personal Backup", extensions: ["evdata"] }];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [intervalDays, setIntervalDays] = useState("90");
  const [footerLine1, setFooterLine1] = useState("");
  const [footerLine2, setFooterLine2] = useState("");
  const [historyEvaluations, setHistoryEvaluations] = useState("15");
  const [hidePhone, setHidePhone] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(""));
  }, []);

  useEffect(() => {
    if (open && settings) {
      setIntervalDays(String(settings.evaluationIntervalDays));
      setFooterLine1(settings.footerLine1);
      setFooterLine2(settings.footerLine2);
      setHistoryEvaluations(String(settings.historyEvaluations));
      setHidePhone(settings.hidePhone);
    }
  }, [open, settings]);

  const parsedInterval = Number(intervalDays);
  const isIntervalValid = Number.isInteger(parsedInterval) && parsedInterval > 0;
  const parsedHistory = Number(historyEvaluations);
  const isHistoryValid = Number.isInteger(parsedHistory) && parsedHistory >= 3;

  async function handleSave() {
    if (!isIntervalValid || !isHistoryValid) return;
    await updateSettings.mutateAsync({
      evaluationIntervalDays: parsedInterval,
      footerLine1: footerLine1.trim(),
      footerLine2: footerLine2.trim(),
      historyEvaluations: parsedHistory,
      hidePhone,
    });
    onOpenChange(false);
  }

  async function handleExportClick() {
    setBackupStatus(null);
    setConfirmExportOpen(true);
  }

  async function handleConfirmExport() {
    setConfirmExportOpen(false);
    const path = await save({
      defaultPath: `personal-backup-${new Date().toISOString().slice(0, 10)}.evdata`,
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

            <div className="flex flex-col gap-1.5 border-t pt-4">
              <Label htmlFor="historyEvaluations">
                Avaliações no histórico do PDF
              </Label>
              <p className="text-muted-foreground text-xs">
                Quantidade de avaliações exibidas nos gráficos e no índice do
                PDF. Mínimo 3.
              </p>
              <Input
                id="historyEvaluations"
                type="number"
                min={3}
                inputMode="numeric"
                aria-invalid={!isHistoryValid}
                value={historyEvaluations}
                onChange={(e) => setHistoryEvaluations(e.target.value)}
              />
              {!isHistoryValid && (
                <p className="text-destructive text-xs">
                  Informe um número válido (mínimo 3)
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <Label>Relatório PDF</Label>
              <p className="text-muted-foreground text-xs">
                Rodapé: texto exibido no rodapé do PDF de avaliação. Deixe em
                branco para não exibir.
              </p>
              <Input
                id="footerLine1"
                type="text"
                placeholder="Rodapé linha 1"
                value={footerLine1}
                onChange={(e) => setFooterLine1(e.target.value)}
              />
              <Input
                id="footerLine2"
                type="text"
                placeholder="Rodapé linha 2"
                value={footerLine2}
                onChange={(e) => setFooterLine2(e.target.value)}
              />
              <label className="flex items-center gap-2 pt-1 text-sm">
                <input
                  type="checkbox"
                  checked={hidePhone}
                  onChange={(e) => setHidePhone(e.target.checked)}
                  className="accent-primary size-4"
                />
                Ocultar telefone na avaliação
              </label>
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
                    onClick={handleExportClick}
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
                disabled={!isIntervalValid || !isHistoryValid || updateSettings.isPending}
              >
                {updateSettings.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exportar backup</AlertDialogTitle>
          <AlertDialogDescription>
            A exportação pode levar até 30 minutos. Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmExport}>
            Prosseguir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
