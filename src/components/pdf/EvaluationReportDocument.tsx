import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
  Svg,
  Polygon,
  Line,
} from "@react-pdf/renderer";

import {
  bioimpedanceMetrics,
  formatMetricValue,
  perimeterMetrics,
  photoFields,
  type MetricDef,
} from "@/lib/metrics";
import { MiniLineChart } from "@/components/pdf/MiniLineChart";
import type { Evaluation, Member } from "@/types";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#444444",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  table: {
    borderWidth: 0.5,
    borderColor: "#cccccc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
  },
  tableCellLabel: {
    width: "28%",
    padding: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    textAlign: "center",
  },
  tableCell: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  tableCellValue: {
    fontSize: 8,
  },
  photoAngleRow: {
    marginBottom: 14,
  },
  photoAngleLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  photoRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoBox: {
    alignItems: "center",
  },
  photoImage: {
    width: 110,
    height: 140,
    objectFit: "cover",
    borderRadius: 2,
  },
  photoCaption: {
    fontSize: 7,
    color: "#555555",
    marginTop: 2,
  },
  chartsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function evaluationLabel(evaluation: Evaluation) {
  return `Nº ${evaluation.number} (${formatDate(evaluation.date)})`;
}

type Trend = "up" | "down" | "equal";

function getTrend(
  current: number | null,
  previous: number | null,
): Trend | null {
  if (current === null || previous === null) return null;
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "equal";
}

const TREND_ICON_SIZE = 6;

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "up") {
    return (
      <Svg
        width={TREND_ICON_SIZE}
        height={TREND_ICON_SIZE}
        style={{ marginLeft: 3 }}
      >
        <Polygon
          points={`${TREND_ICON_SIZE / 2},0 ${TREND_ICON_SIZE},${TREND_ICON_SIZE} 0,${TREND_ICON_SIZE}`}
          fill="#16a34a"
        />
      </Svg>
    );
  }
  if (trend === "down") {
    return (
      <Svg
        width={TREND_ICON_SIZE}
        height={TREND_ICON_SIZE}
        style={{ marginLeft: 3 }}
      >
        <Polygon
          points={`0,0 ${TREND_ICON_SIZE},0 ${TREND_ICON_SIZE / 2},${TREND_ICON_SIZE}`}
          fill="#dc2626"
        />
      </Svg>
    );
  }
  return (
    <Svg
      width={TREND_ICON_SIZE}
      height={TREND_ICON_SIZE}
      style={{ marginLeft: 3 }}
    >
      <Line
        x1={0}
        y1={TREND_ICON_SIZE / 2 - 1}
        x2={TREND_ICON_SIZE}
        y2={TREND_ICON_SIZE / 2 - 1}
        stroke="#9ca3af"
        strokeWidth={1}
      />
      <Line
        x1={0}
        y1={TREND_ICON_SIZE / 2 + 1}
        x2={TREND_ICON_SIZE}
        y2={TREND_ICON_SIZE / 2 + 1}
        stroke="#9ca3af"
        strokeWidth={1}
      />
    </Svg>
  );
}

function toDataUri(base64: string) {
  return `data:image/jpeg;base64,${base64}`;
}

const generalMetrics: MetricDef[] = [
  { key: "weightKg", label: "Peso", unit: "kg" },
  { key: "heightM", label: "Altura", unit: "m" },
];

function ComparisonTable({ evaluations }: { evaluations: Evaluation[] }) {
  const groups: { title: string; metrics: MetricDef[] }[] = [
    { title: "Dados Gerais", metrics: generalMetrics },
    { title: "Medidas de Perímetros (cm)", metrics: perimeterMetrics },
    { title: "Medidas de Bioimpedância", metrics: bioimpedanceMetrics },
  ];

  return (
    <>
      {groups.map((group) => (
        <View key={group.title} wrap={false} style={{ marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>{group.title}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableCellLabel}>Medida</Text>
              {evaluations.map((evaluation) => (
                <Text key={evaluation.id} style={styles.tableHeaderCell}>
                  {evaluationLabel(evaluation)}
                </Text>
              ))}
            </View>
            {group.metrics.map((metric) => (
              <View key={metric.key} style={styles.tableRow}>
                <Text style={styles.tableCellLabel}>{metric.label}</Text>
                {evaluations.map((evaluation, index) => {
                  const value = evaluation[metric.key] as number | null;
                  const previousValue =
                    index > 0
                      ? (evaluations[index - 1][metric.key] as number | null)
                      : null;
                  const trend =
                    index > 0 ? getTrend(value, previousValue) : null;
                  return (
                    <View key={evaluation.id} style={styles.tableCell}>
                      <Text style={styles.tableCellValue}>
                        {formatMetricValue(value, metric.unit)}
                      </Text>
                      {trend && <TrendIcon trend={trend} />}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function PhotoComparison({ evaluations }: { evaluations: Evaluation[] }) {
  return (
    <>
      {photoFields.map((angle) => {
        const withPhoto = evaluations.filter((e) => Boolean(e[angle.key]));
        if (withPhoto.length === 0) return null;
        return (
          <View key={angle.key} style={styles.photoAngleRow} wrap={false}>
            <Text style={styles.photoAngleLabel}>{angle.label}</Text>
            <View style={styles.photoRow}>
              {withPhoto.map((evaluation) => (
                <View key={evaluation.id} style={styles.photoBox}>
                  <Image
                    style={styles.photoImage}
                    src={toDataUri(evaluation[angle.key] as string)}
                  />
                  <Text style={styles.photoCaption}>
                    {evaluationLabel(evaluation)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </>
  );
}

function EvolutionCharts({ evaluations }: { evaluations: Evaluation[] }) {
  const allMetrics: MetricDef[] = [
    ...generalMetrics,
    ...perimeterMetrics,
    ...bioimpedanceMetrics,
  ];

  const data = allMetrics.map((metric) => ({
    metric,
    data: evaluations.map((evaluation) => ({
      label: `Nº ${evaluation.number}`,
      value: evaluation[metric.key] as number | null,
    })),
  }));

  return (
    <View style={styles.chartsGrid}>
      {data.map(({ metric, data: chartData }) => (
        <MiniLineChart
          key={metric.key}
          title={metric.label}
          unit={metric.unit}
          data={chartData}
        />
      ))}
    </View>
  );
}

export function EvaluationReportDocument({
  member,
  allEvaluations,
  selectedEvaluations,
}: {
  member: Member;
  allEvaluations: Evaluation[];
  selectedEvaluations: Evaluation[];
}) {
  const genderLabel: Record<string, string> = {
    masculino: "Masculino",
    feminino: "Feminino",
    outro: "Outro",
  };

  return (
    <Document title={`Avaliação Física - ${member.name}`} author="Avaliação">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Avaliação Física</Text>
        <Text style={styles.subtitle}>Aluno: {member.name}</Text>
        <Text style={styles.subtitle}>Telefone: {member.phone}</Text>
        <Text style={styles.subtitle}>
          Data de nascimento: {formatDate(member.birthday)} — Gênero:{" "}
          {genderLabel[member.gender] ?? member.gender}
        </Text>
        <Text style={styles.subtitle}>
          {selectedEvaluations.length > 1
            ? `Comparativo entre as avaliações ${selectedEvaluations
                .map((e) => `Nº ${e.number}`)
                .join(", ")}`
            : `Avaliação Nº ${selectedEvaluations[0]?.number ?? ""}`}
        </Text>

        <ComparisonTable evaluations={selectedEvaluations} />
      </Page>

      {selectedEvaluations.some((e) =>
        photoFields.some((angle) => Boolean(e[angle.key])),
      ) && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Comparação de Fotos</Text>
          <PhotoComparison evaluations={selectedEvaluations} />
        </Page>
      )}

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Evolução Completa</Text>
        <Text style={{ fontSize: 8, color: "#666666", marginBottom: 8 }}>
          Gráficos com o histórico completo de todas as avaliações registradas.
        </Text>
        <EvolutionCharts evaluations={allEvaluations} />
      </Page>
    </Document>
  );
}
