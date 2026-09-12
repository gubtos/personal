import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEvaluations } from "@/lib/queries";
import { bioimpedanceMetrics, perimeterMetrics, type MetricDef } from "@/lib/metrics";

const weightMetric: MetricDef = { key: "weightKg", label: "Peso", unit: "kg" };

const allMetrics: MetricDef[] = [weightMetric, ...perimeterMetrics, ...bioimpedanceMetrics];

const ALL_METRICS_VALUE = "all";

export function EvolutionTab({ memberId }: { memberId: string }) {
  const { data: evaluations, isLoading } = useEvaluations(memberId);
  const [metricKey, setMetricKey] = useState<string>(ALL_METRICS_VALUE);

  const showAllMetrics = metricKey === ALL_METRICS_VALUE;
  const metric = allMetrics.find((m) => m.key === metricKey) ?? weightMetric;

  const chartData = useMemo(() => {
    if (!evaluations) return [];
    return evaluations.map((evaluation) => ({
      label: `Nº ${evaluation.number}`,
      date: evaluation.date,
      value: evaluation[metric.key] as number | null,
    }));
  }, [evaluations, metric.key]);

  const allChartData = useMemo(() => {
    if (!evaluations) return [];
    return allMetrics.map((m) => ({
      metric: m,
      data: evaluations.map((evaluation) => ({
        label: `Nº ${evaluation.number}`,
        date: evaluation.date,
        value: evaluation[m.key] as number | null,
      })),
    }));
  }, [evaluations]);

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
                          labelFormatter={(label, payload) => {
                            const date = payload?.[0]?.payload?.date;
                            return date ? `${label} — ${formatDate(date)}` : `${label}`;
                          }}
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
                    labelFormatter={(label, payload) => {
                      const date = payload?.[0]?.payload?.date;
                      return date ? `${label} — ${formatDate(date)}` : `${label}`;
                    }}
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
    </div>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
