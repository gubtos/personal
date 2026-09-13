import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoViewerDialog } from "@/components/shared/PhotoViewerDialog";
import { useEvaluationPhotos } from "@/lib/queries";
import { toDataUrl } from "@/lib/photo";
import type { EvaluationPhotoKey } from "@/types";

const photoAngles: { key: EvaluationPhotoKey; label: string }[] = [
  { key: "photoFront", label: "Frontal" },
  { key: "photoSideRight", label: "Lateral Direita" },
  { key: "photoSideLeft", label: "Lateral Esquerda" },
  { key: "photoBack", label: "Costas" },
];

const ALL_ANGLES_VALUE = "all";

interface AnglePhoto {
  number: number;
  date: string;
  photo: string;
}

interface PhotoControls {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}

export function PhotosTab({ memberId }: { memberId: string }) {
  const { data: allPhotos, isLoading } = useEvaluationPhotos(memberId);
  const [angleKey, setAngleKey] = useState<string>(ALL_ANGLES_VALUE);
  const [selectionByAngle, setSelectionByAngle] = useState<
    Record<string, { left: number; right: number }>
  >({});
  const [viewerPhoto, setViewerPhoto] = useState<{ label: string; value: string } | null>(
    null,
  );

  const showAllAngles = angleKey === ALL_ANGLES_VALUE;

  const photoGroups = useMemo(() => {
    if (!allPhotos) return [];
    return photoAngles.map((angle) => ({
      angle,
      photos: allPhotos
        .filter((evaluation) => Boolean(evaluation[angle.key]))
        .map((evaluation) => ({
          number: evaluation.number,
          date: evaluation.date,
          photo: evaluation[angle.key] as string,
        })),
    }));
  }, [allPhotos]);

  const visibleGroups = showAllAngles
    ? photoGroups
    : photoGroups.filter((group) => group.angle.key === angleKey);

  const openPhoto = (angleLabel: string, photo: AnglePhoto) =>
    setViewerPhoto({ label: `${angleLabel} — Nº ${photo.number}`, value: photo.photo });

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  if (!allPhotos || allPhotos.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Nenhuma foto cadastrada ainda para exibir.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Comparação de Fotos</CardTitle>
          <Select value={angleKey} onValueChange={setAngleKey}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ANGLES_VALUE}>Todos</SelectItem>
              {photoAngles.map((angle) => (
                <SelectItem key={angle.key} value={angle.key}>
                  {angle.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {visibleGroups.map(({ angle, photos }) => {
            const maxIndex = Math.max(photos.length - 1, 0);
            const selection = selectionByAngle[angle.key] ?? {
              left: Math.max(maxIndex - 1, 0),
              right: maxIndex,
            };
            const leftIndex = Math.min(Math.max(selection.left, 0), maxIndex);
            const rightIndex = Math.min(Math.max(selection.right, 0), maxIndex);
            const updateSelection = (next: { left: number; right: number }) =>
              setSelectionByAngle((prev) => ({ ...prev, [angle.key]: next }));

            return (
              <div key={angle.key} className="flex flex-col items-center gap-3">
                <span className="text-sm font-medium">{angle.label}</span>
                {photos.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-xs">
                    Nenhuma foto cadastrada.
                  </p>
                ) : photos.length === 1 ? (
                  <PhotoWithControls
                    angleLabel={angle.label}
                    photo={photos[0]}
                    onOpen={openPhoto}
                  />
                ) : (
                  <div className="flex flex-wrap items-start justify-center gap-6">
                    <PhotoWithControls
                      angleLabel={angle.label}
                      photo={photos[leftIndex]}
                      onOpen={openPhoto}
                      controls={{
                        prevDisabled: leftIndex === 0,
                        nextDisabled: leftIndex >= maxIndex,
                        onPrev: () =>
                          updateSelection({ ...selection, left: leftIndex - 1 }),
                        onNext: () =>
                          updateSelection({ ...selection, left: leftIndex + 1 }),
                      }}
                    />
                    <PhotoWithControls
                      angleLabel={angle.label}
                      photo={photos[rightIndex]}
                      onOpen={openPhoto}
                      controls={{
                        prevDisabled: rightIndex === 0,
                        nextDisabled: rightIndex >= maxIndex,
                        onPrev: () =>
                          updateSelection({ ...selection, right: rightIndex - 1 }),
                        onNext: () =>
                          updateSelection({ ...selection, right: rightIndex + 1 }),
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <PhotoViewerDialog
        open={viewerPhoto !== null}
        onOpenChange={(open) => !open && setViewerPhoto(null)}
        label={viewerPhoto?.label ?? ""}
        value={viewerPhoto?.value ?? null}
      />
    </div>
  );
}

function PhotoWithControls({
  angleLabel,
  photo,
  onOpen,
  controls,
}: {
  angleLabel: string;
  photo: AnglePhoto;
  onOpen: (angleLabel: string, photo: AnglePhoto) => void;
  controls?: PhotoControls;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => onOpen(angleLabel, photo)}
        className="bg-muted flex aspect-1/2 w-56 cursor-pointer items-center justify-center overflow-hidden rounded-md hover:opacity-80 sm:w-80"
      >
        <img
          src={toDataUrl(photo.photo)}
          alt={`Avaliação Nº ${photo.number}`}
          className="size-full object-contain"
        />
      </button>
      <span className="text-muted-foreground text-xs">
        Nº {photo.number} — {formatDate(photo.date)}
      </span>
      {controls && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Foto anterior"
            disabled={controls.prevDisabled}
            onClick={controls.onPrev}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próxima foto"
            disabled={controls.nextDisabled}
            onClick={controls.onNext}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
