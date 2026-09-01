import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { useEvaluations } from "@/lib/queries";
import { bioimpedanceMetrics, perimeterMetrics, type MetricDef } from "@/lib/metrics";
import { toDataUrl } from "@/lib/photo";
import type { Evaluation } from "@/types";

const weightMetric: MetricDef = { key: "weightKg", label: "Peso", unit: "kg" };

const allMetrics: MetricDef[] = [weightMetric, ...perimeterMetrics, ...bioimpedanceMetrics];

const photoAngles: { key: keyof Evaluation; label: string }[] = [
  { key: "photoFront", label: "Frontal" },
  { key: "photoSideRight", label: "Lateral Direita" },
  { key: "photoSideLeft", label: "Lateral Esquerda" },
  { key: "photoBack", label: "Costas" },
];

const ALL_METRICS_VALUE = "all";
const ALL_ANGLES_VALUE = "all";

export function EvolutionTab({ memberId }: { memberId: string }) {
  const { data: evaluations, isLoading } = useEvaluations(memberId);
  const [metricKey, setMetricKey] = useState<string>(ALL_METRICS_VALUE);
  const [angleKey, setAngleKey] = useState<string>(ALL_ANGLES_VALUE);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoIndexByAngle, setPhotoIndexByAngle] = useState<Record<string, number>>({});
  const [viewerPhoto, setViewerPhoto] = useState<{ label: string; value: string } | null>(
    null,
  );

  const showAllMetrics = metricKey === ALL_METRICS_VALUE;
  const showAllAngles = angleKey === ALL_ANGLES_VALUE;
  const metric = allMetrics.find((m) => m.key === metricKey) ?? weightMetric;

  const chartData = useMemo(() => {
    if (!evaluations) return [];
    return evaluations.map((evaluation) => ({
      label: `Nº ${evaluation.number}`,
      value: evaluation[metric.key] as number | null,
    }));
  }, [evaluations, metric.key]);

  const allChartData = useMemo(() => {
    if (!evaluations) return [];
    return allMetrics.map((m) => ({
      metric: m,
      data: evaluations.map((evaluation) => ({
        label: `Nº ${evaluation.number}`,
        value: evaluation[m.key] as number | null,
      })),
    }));
  }, [evaluations]);

  const photosForAngle = useMemo(() => {
    if (!evaluations || showAllAngles) return [];
    return evaluations
      .filter((evaluation) => Boolean(evaluation[angleKey as keyof Evaluation]))
      .map((evaluation) => ({
        number: evaluation.number,
        date: evaluation.date,
        photo: evaluation[angleKey as keyof Evaluation] as string,
      }));
  }, [evaluations, angleKey, showAllAngles]);

  const photosByAngle = useMemo(() => {
    if (!evaluations) return [];
    return photoAngles.map((angle) => ({
      angle,
      photos: evaluations
        .filter((evaluation) => Boolean(evaluation[angle.key]))
        .map((evaluation) => ({
          number: evaluation.number,
          date: evaluation.date,
          photo: evaluation[angle.key] as string,
        })),
    }));
  }, [evaluations]);

  const clampedPhotoIndex = Math.min(photoIndex, Math.max(photosForAngle.length - 1, 0));
  const currentPhoto = photosForAngle[clampedPhotoIndex];

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  if (!evaluations || evaluations.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Nenhuma avaliação cadastrada ainda para exibir a evolução.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Evolução das Medidas</CardTitle>
          <Select value={metricKey} onValueChange={setMetricKey}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_METRICS_VALUE}>Todas</SelectItem>
              {allMetrics.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {showAllMetrics ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {allChartData.map(({ metric: m, data }) => (
                <div key={m.key} className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{m.label}</span>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" fontSize={11} />
                        <YAxis
                          fontSize={11}
                          domain={["auto", "auto"]}
                          unit={m.unit ? ` ${m.unit}` : ""}
                        />
                        <Tooltip
                          formatter={(value) =>
                            m.unit ? `${value} ${m.unit}` : `${value}`
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          connectNulls
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    domain={["auto", "auto"]}
                    unit={metric.unit ? ` ${metric.unit}` : ""}
                  />
                  <Tooltip
                    formatter={(value) =>
                      metric.unit ? `${value} ${metric.unit}` : `${value}`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    connectNulls
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Comparação de Fotos</CardTitle>
          <Select
            value={angleKey}
            onValueChange={(value) => {
              setAngleKey(value);
              setPhotoIndex(0);
            }}
          >
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
        <CardContent className="flex flex-col items-center gap-3">
          {showAllAngles ? (
            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {photosByAngle.map(({ angle, photos }) => {
                const index = Math.min(
                  photoIndexByAngle[angle.key] ?? 0,
                  Math.max(photos.length - 1, 0),
                );
                const photo = photos[index];
                return (
                  <div key={angle.key} className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium">{angle.label}</span>
                    {photos.length === 0 ? (
                      <p className="text-muted-foreground py-12 text-center text-xs">
                        Nenhuma foto cadastrada.
                      </p>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            photo &&
                            setViewerPhoto({
                              label: `${angle.label} — Nº ${photo.number}`,
                              value: photo.photo,
                            })
                          }
                          className="bg-muted flex aspect-1/2 w-full max-w-xs cursor-pointer items-center justify-center overflow-hidden rounded-md hover:opacity-80"
                        >
                          <img
                            src={toDataUrl(photo?.photo)}
                            alt={`Avaliação Nº ${photo?.number}`}
                            className="size-full object-contain"
                          />
                        </button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={index === 0}
                            onClick={() =>
                              setPhotoIndexByAngle((prev) => ({
                                ...prev,
                                [angle.key]: Math.max(index - 1, 0),
                              }))
                            }
                          >
                            <ChevronLeft />
                          </Button>
                          <span className="text-muted-foreground text-xs">
                            Nº {photo?.number} — {formatDate(photo?.date ?? "")}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={index >= photos.length - 1}
                            onClick={() =>
                              setPhotoIndexByAngle((prev) => ({
                                ...prev,
                                [angle.key]: Math.min(index + 1, photos.length - 1),
                              }))
                            }
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : photosForAngle.length === 0 ? (
            <p className="text-muted-foreground py-12 text-sm">
              Nenhuma foto cadastrada para este ângulo.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  currentPhoto &&
                  setViewerPhoto({
                    label: `Nº ${currentPhoto.number}`,
                    value: currentPhoto.photo,
                  })
                }
                className="bg-muted flex aspect-1/2 w-full max-w-xs cursor-pointer items-center justify-center overflow-hidden rounded-md hover:opacity-80"
              >
                <img
                  src={toDataUrl(currentPhoto?.photo)}
                  alt={`Avaliação Nº ${currentPhoto?.number}`}
                  className="size-full object-contain"
                />
              </button>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={clampedPhotoIndex === 0}
                  onClick={() => setPhotoIndex((i) => Math.max(i - 1, 0))}
                >
                  <ChevronLeft />
                </Button>
                <span className="text-muted-foreground text-sm">
                  Avaliação Nº {currentPhoto?.number} — {formatDate(currentPhoto?.date ?? "")}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={clampedPhotoIndex >= photosForAngle.length - 1}
                  onClick={() =>
                    setPhotoIndex((i) => Math.min(i + 1, photosForAngle.length - 1))
                  }
                >
                  <ChevronRight />
                </Button>
              </div>
            </>
          )}
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

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
