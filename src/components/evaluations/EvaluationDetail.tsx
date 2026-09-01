import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoViewerDialog } from "@/components/shared/PhotoViewerDialog";
import { bioimpedanceMetrics, formatMetricValue, perimeterMetrics, photoFields } from "@/lib/metrics";
import { toDataUrl } from "@/lib/photo";
import type { Evaluation } from "@/types";

export function EvaluationDetail({ evaluation }: { evaluation: Evaluation }) {
  const [viewerKey, setViewerKey] = useState<keyof Evaluation | null>(null);
  const viewerField = photoFields.find((field) => field.key === viewerKey);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data da Avaliação" value={formatDate(evaluation.date)} />
          <Field label="Avaliação Número" value={String(evaluation.number)} />
          <Field label="Peso" value={`${evaluation.weightKg} kg`} />
          <Field label="Altura" value={`${evaluation.heightM} m`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medidas de Perímetros (cm)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {perimeterMetrics.map((metric) => (
            <Field
              key={metric.key}
              label={metric.label}
              value={formatMetricValue(
                evaluation[metric.key] as number | null,
                metric.unit,
              )}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medidas de Bioimpedância</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {bioimpedanceMetrics.map((metric) => (
            <Field
              key={metric.key}
              label={metric.label}
              value={formatMetricValue(
                evaluation[metric.key] as number | null,
                metric.unit,
              )}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {photoFields.map((field) => {
            const value = evaluation[field.key] as string | null;
            return (
              <div key={field.key} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => value && setViewerKey(field.key)}
                  disabled={!value}
                  aria-label={value ? `Ver ${field.label}` : undefined}
                  className="bg-muted flex aspect-1/2 w-full items-center justify-center overflow-hidden rounded-md enabled:cursor-pointer enabled:hover:opacity-80"
                >
                  {value ? (
                    <img
                      src={toDataUrl(value)}
                      alt={field.label}
                      className="size-full object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Sem foto
                    </span>
                  )}
                </button>
                <p className="text-muted-foreground text-xs">{field.label}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {evaluation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{evaluation.notes}</p>
          </CardContent>
        </Card>
      )}

      <PhotoViewerDialog
        open={viewerKey !== null}
        onOpenChange={(open) => !open && setViewerKey(null)}
        label={viewerField?.label ?? ""}
        value={viewerKey ? (evaluation[viewerKey] as string | null) : null}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
