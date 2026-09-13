import { useEffect, useMemo, useState } from "react";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { EvaluationDetail } from "@/components/evaluations/EvaluationDetail";
import { EvaluationForm } from "@/components/evaluations/EvaluationForm";
import { photoFields } from "@/lib/metrics";
import {
  useCreateEvaluation,
  useDeleteEvaluation,
  useEvaluationPhoto,
  useEvaluations,
  useEvaluationPhotos,
  useUpdateEvaluation,
} from "@/lib/queries";
import type { EvaluationInput, PhotoReference } from "@/types";

interface EvaluationsTabProps {
  memberId: string;
  birthday: string;
  onGeneratePdf: () => void;
}

export function EvaluationsTab({
  memberId,
  birthday,
  onGeneratePdf,
}: EvaluationsTabProps) {
  const { data: evaluations, isLoading } = useEvaluations(memberId);
  const createEvaluation = useCreateEvaluation(memberId);
  const deleteEvaluation = useDeleteEvaluation(memberId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!evaluations || evaluations.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillExists = evaluations.some((e) => e.id === selectedId);
    if (!stillExists) {
      // Default to the most recent evaluation (list is ordered by date ascending).
      setSelectedId(evaluations[evaluations.length - 1].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluations]);

  const selected = evaluations?.find((e) => e.id === selectedId) ?? null;
  const updateEvaluation = useUpdateEvaluation(memberId, selected?.id ?? "");

  const { data: selectedPhotos } = useEvaluationPhoto(selected?.id);
  const { data: allPhotos } = useEvaluationPhotos(
    memberId,
    formOpen || editing,
  );

  const photoReferences = useMemo<PhotoReference[]>(() => {
    if (!allPhotos) return [];
    return allPhotos.flatMap((evaluation) =>
      photoFields.flatMap((field) => {
        const photo = evaluation[field.key];
        return photo
          ? [
              {
                id: `${evaluation.id}-${field.key}`,
                fieldKey: field.key,
                evaluationNumber: evaluation.number,
                date: evaluation.date,
                photo,
              },
            ]
          : [];
      }),
    );
  }, [allPhotos]);

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  async function handleCreate(values: EvaluationInput) {
    const created = await createEvaluation.mutateAsync(values);
    setSelectedId(created.id);
    setFormOpen(false);
  }

  async function handleUpdate(values: EvaluationInput) {
    await updateEvaluation.mutateAsync(values);
    setEditing(false);
  }

  async function handleDelete() {
    if (!selected) return;
    await deleteEvaluation.mutateAsync(selected.id);
    setDeleteOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {evaluations && evaluations.length > 0 && (
            <Select
              value={selectedId ?? undefined}
              onValueChange={(value) => setSelectedId(value)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione uma avaliação" />
              </SelectTrigger>
              <SelectContent>
                {[...evaluations].reverse().map((evaluation) => (
                  <SelectItem key={evaluation.id} value={evaluation.id}>
                    Avaliação Nº {evaluation.number} —{" "}
                    {formatDate(evaluation.date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus /> Nova avaliação
          </Button>
          {selected && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Editar
              </Button>
              <Button size="sm" variant="outline" onClick={onGeneratePdf}>
                <FileDown /> Gerar PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 /> Excluir
              </Button>
            </>
          )}
        </div>
      </div>

      {!evaluations ||
        (evaluations.length === 0 && (
          <p className="text-muted-foreground py-12 text-center">
            Nenhuma avaliação cadastrada ainda. Clique em “Nova avaliação” para
            começar.
          </p>
        ))}

      {selected && (
        <EvaluationDetail
          evaluation={selected}
          photos={selectedPhotos}
          birthday={birthday}
        />
      )}

      <EvaluationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        nextNumber={(evaluations?.length ?? 0) + 1}
        photoReferences={photoReferences}
        onSubmit={handleCreate}
        isSubmitting={createEvaluation.isPending}
      />

      {selected && selectedPhotos && (
        <EvaluationForm
          open={editing}
          onOpenChange={setEditing}
          evaluation={selected}
          photos={selectedPhotos}
          nextNumber={selected.number}
          photoReferences={photoReferences}
          onSubmit={handleUpdate}
          isSubmitting={updateEvaluation.isPending}
        />
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir avaliação"
        description="Tem certeza que deseja excluir esta avaliação? Essa ação não pode ser desfeita."
        onConfirm={handleDelete}
      />
    </div>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
