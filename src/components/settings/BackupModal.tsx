import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

const EVDATA_FILTERS = [{ name: "Avaliação Backup", extensions: ["evdata"] }];

interface BackupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupModal({ open: modalOpen, onOpenChange }: BackupModalProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);

  async function handleExport() {
    setStatus(null);
    const path = await save({
      defaultPath: `avaliacao-backup-${new Date().toISOString().slice(0, 10)}.evdata`,
      filters: EVDATA_FILTERS,
    });
    if (!path) return;

    setBusy(true);
    try {
      await invoke("database_export", { destPath: path });
      setStatus("Backup exportado com sucesso.");
    } catch (error) {
      setStatus(`Ocorreu um erro ao exportar: ${error}`);
    } finally {
      setBusy(false);
    }
  }

  async function handlePickImport() {
    setStatus(null);
    const path = await open({ multiple: false, filters: EVDATA_FILTERS });
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
      setStatus(`Ocorreu um erro ao importar: ${error}`);
      onOpenChange(true);
    }
  }

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Backup</DialogTitle>
            <DialogDescription>
              Exporte todos os dados para um arquivo .evdata, ou importe um backup
              existente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={handleExport}>
              <Download /> Exportar backup
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handlePickImport}
            >
              <Upload /> Importar backup
            </Button>
          </div>

          {status && <p className="text-sm">{status}</p>}
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
