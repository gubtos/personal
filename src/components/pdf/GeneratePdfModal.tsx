import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { ExternalLink, FileDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EvaluationReportDocument } from "@/components/pdf/EvaluationReportDocument";
import { filesApi } from "@/lib/tauri-commands";
import type { Evaluation, Member } from "@/types";

interface GeneratePdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  evaluations: Evaluation[];
}

/** Default rule: compare the first evaluation with the last two (or fewer if there aren't 3+ yet). */
function defaultSelection(evaluations: Evaluation[]): Evaluation[] {
  if (evaluations.length <= 2) return evaluations;
  const first = evaluations[0];
  const secondLast = evaluations[evaluations.length - 2];
  const last = evaluations[evaluations.length - 1];
  return [first, secondLast, last];
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function GeneratePdfModal({
  open,
  onOpenChange,
  member,
  evaluations,
}: GeneratePdfModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [generatedPath, setGeneratedPath] = useState<string | null>(null);
  const [includeGraphs, setIncludeGraphs] = useState(true);

  useEffect(() => {
    if (open) {
      setSelectedIds(defaultSelection(evaluations).map((e) => e.id));
      setStatus(null);
      setGeneratedPath(null);
      setIncludeGraphs(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedEvaluations = useMemo(
    () =>
      evaluations
        .filter((e) => selectedIds.includes(e.id))
        .sort((a, b) => a.number - b.number),
    [evaluations, selectedIds],
  );

  const availableEvaluations = evaluations.filter(
    (e) => !selectedIds.includes(e.id),
  );

  function removeEvaluation(id: string) {
    setSelectedIds((ids) => ids.filter((i) => i !== id));
  }

  function addEvaluation(id: string) {
    setSelectedIds((ids) => [...ids, id]);
  }

  async function handleGenerate() {
    if (selectedEvaluations.length === 0) return;
    setIsGenerating(true);
    setStatus(null);
    setGeneratedPath(null);
    try {
      const blob = await pdf(
        <EvaluationReportDocument
          member={member}
          allEvaluations={evaluations}
          selectedEvaluations={selectedEvaluations}
          includeGraphs={includeGraphs}
        />,
      ).toBlob();

      const mostRecent = selectedEvaluations[selectedEvaluations.length - 1];
      const date = mostRecent?.date ?? "";
      const path = await save({
        defaultPath: `${member.name} - Avaliação - ${date}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!path) {
        setIsGenerating(false);
        return;
      }

      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(path, new Uint8Array(arrayBuffer));
      setGeneratedPath(path);
      setStatus("PDF gerado com sucesso.");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Ocorreu um erro ao gerar o PDF: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleOpenFile() {
    if (!generatedPath) return;
    try {
      await filesApi.open(generatedPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Ocorreu um erro ao abrir o arquivo: ${message}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar PDF de Avaliação</DialogTitle>
          <DialogDescription>
            Selecione quais avaliações devem entrar no comparativo. Por padrão, a
            primeira e as duas últimas avaliações são comparadas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Avaliações selecionadas</span>
            {selectedEvaluations.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Selecione ao menos uma avaliação.
              </p>
            )}
            {selectedEvaluations.map((evaluation) => (
              <div
                key={evaluation.id}
                className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm"
              >
                <span>
                  Avaliação Nº {evaluation.number} —{" "}
                  {formatDate(evaluation.date)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => removeEvaluation(evaluation.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {availableEvaluations.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                Adicionar outra avaliação
              </span>
              <Select onValueChange={(value) => addEvaluation(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma avaliação" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvaluations.map((evaluation) => (
                    <SelectItem key={evaluation.id} value={evaluation.id}>
                      Avaliação Nº {evaluation.number} —{" "}
                      {formatDate(evaluation.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeGraphs}
              onChange={(e) => setIncludeGraphs(e.target.checked)}
              className="accent-primary size-4"
            />
            Gerar gráficos
          </label>

          {status && <p className="text-sm">{status}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          {generatedPath && (
            <Button type="button" variant="outline" onClick={handleOpenFile}>
              <ExternalLink /> Abrir arquivo
            </Button>
          )}
          <Button
            type="button"
            disabled={selectedEvaluations.length === 0 || isGenerating}
            onClick={handleGenerate}
          >
            <FileDown /> {isGenerating ? "Gerando..." : "Gerar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
