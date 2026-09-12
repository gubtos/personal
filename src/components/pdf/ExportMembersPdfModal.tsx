import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { ExternalLink, FileDown } from "lucide-react";

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
import { MembersPdfDocument } from "@/components/pdf/MembersPdfDocument";
import { filesApi, membersApi } from "@/lib/tauri-commands";
import type { MemberListItem } from "@/types";

type SortOption = "nome" | "avaliacao" | "aniversario";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "nome", label: "Nome" },
  { value: "avaliacao", label: "Data da próxima avaliação" },
  { value: "aniversario", label: "Data de Nascimento" },
];

/** Day of the year (1-366) of the next birthday, so sorting works across the year wrap. */
function nextBirthdayOrdinal(birthday: string, today: Date): number {
  const [, month, day] = birthday.split("-").map(Number);
  const currentOrdinal = dayOfYear(today);
  const birthdayOrdinal = dayOfYear(
    new Date(today.getFullYear(), (month ?? 1) - 1, day ?? 1),
  );
  // If this year's birthday already passed, push it to next year's (add 365/366).
  return birthdayOrdinal <= currentOrdinal ? birthdayOrdinal + 366 : birthdayOrdinal;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function sortMembers(members: MemberListItem[], sort: SortOption): MemberListItem[] {
  const sorted = [...members];
  const today = new Date();
  switch (sort) {
    case "nome":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      break;
    case "avaliacao":
      sorted.sort(
        (a, b) =>
          a.nextEvaluationDate.localeCompare(b.nextEvaluationDate) ||
          a.name.localeCompare(b.name, "pt-BR"),
      );
      break;
    case "aniversario":
      sorted.sort(
        (a, b) =>
          nextBirthdayOrdinal(a.birthday, today) -
          nextBirthdayOrdinal(b.birthday, today),
      );
      break;
  }
  return sorted;
}

interface ExportMembersPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportMembersPdfModal({
  open,
  onOpenChange,
}: ExportMembersPdfModalProps) {
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [sort, setSort] = useState<SortOption>("nome");
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [generatedPath, setGeneratedPath] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus(null);
      setGeneratedPath(null);
      setSort("nome");
      membersApi
        .listSorted("avaliacao", true)
        .then(setMembers)
        .catch((error) =>
          setStatus(
            `Ocorreu um erro ao carregar os alunos: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
    }
  }, [open]);

  const sortedMembers = sortMembers(members, sort);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort;

  async function handleGenerate() {
    if (sortedMembers.length === 0) return;
    setIsGenerating(true);
    setStatus(null);
    setGeneratedPath(null);
    try {
      const blob = await pdf(
        <MembersPdfDocument members={sortedMembers} sortLabel={sortLabel} />,
      ).toBlob();

      const path = await save({
        defaultPath: `Lista de Alunos - ${new Date().toISOString().slice(0, 10)}.pdf`,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar PDF da lista de alunos</DialogTitle>
          <DialogDescription>
            Gera um PDF com a tabela de alunos (nome, data de nascimento e próxima
            avaliação), ordenada pela opção escolhida.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="membersPdfSort" className="text-sm font-medium">
              Ordenar por
            </label>
            <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
              <SelectTrigger id="membersPdfSort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {members.length === 0 && !status && (
            <p className="text-muted-foreground text-xs">
              Nenhum aluno ativo para exportar.
            </p>
          )}

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
            disabled={sortedMembers.length === 0 || isGenerating}
            onClick={handleGenerate}
          >
            <FileDown /> {isGenerating ? "Gerando..." : "Gerar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
