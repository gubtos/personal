import type { Evaluation, EvaluationPhotoKey } from "@/types";

export interface MetricDef {
  key: keyof Evaluation;
  label: string;
  unit: string;
}

export const perimeterMetrics: MetricDef[] = [
  { key: "neckCm", label: "Pescoço", unit: "cm" },
  { key: "chestCm", label: "Tórax", unit: "cm" },
  { key: "waistCm", label: "Cintura", unit: "cm" },
  { key: "abdomenCm", label: "Abdômen", unit: "cm" },
  { key: "hipCm", label: "Quadril", unit: "cm" },
  { key: "forearmRightCm", label: "Antebraço Direito", unit: "cm" },
  { key: "forearmLeftCm", label: "Antebraço Esquerdo", unit: "cm" },
  { key: "armRightCm", label: "Braço Direito", unit: "cm" },
  { key: "armLeftCm", label: "Braço Esquerdo", unit: "cm" },
  { key: "thighRightCm", label: "Coxa Direita", unit: "cm" },
  { key: "thighLeftCm", label: "Coxa Esquerda", unit: "cm" },
  { key: "calfRightCm", label: "Panturrilha Direita", unit: "cm" },
  { key: "calfLeftCm", label: "Panturrilha Esquerda", unit: "cm" },
  { key: "armFlexedRightCm", label: "Braço Contraído Direito", unit: "cm" },
  { key: "armFlexedLeftCm", label: "Braço Contraído Esquerdo", unit: "cm" },
];

export const bioimpedanceMetrics: MetricDef[] = [
  { key: "heartRateBpm", label: "Frequência Cardíaca", unit: "bpm" },
  { key: "heartIndex", label: "Índice de Coração", unit: "L/Min/m²" },
  { key: "bmi", label: "IMC (Índice de Massa Corpórea)", unit: "" },
  { key: "bodyFatPct", label: "Gordura Corporal", unit: "%" },
  { key: "muscleRatePct", label: "Taxa Muscular", unit: "%" },
  { key: "fatFreeMassKg", label: "Massa Livre de Gordura", unit: "kg" },
  { key: "subcutaneousFatPct", label: "Gordura Subcutânea", unit: "%" },
  { key: "visceralFat", label: "Gordura Visceral", unit: "" },
  { key: "bodyWaterPct", label: "Água Corporal", unit: "%" },
  { key: "skeletalMusclePct", label: "Massa Muscular Esquelética", unit: "%" },
  { key: "muscleMassKg", label: "Massa Muscular", unit: "kg" },
  { key: "boneMassKg", label: "Massa Óssea", unit: "kg" },
  { key: "bmrKcal", label: "TMB (Taxa do Metabolismo Basal)", unit: "kcal" },
  { key: "metabolicAge", label: "Idade Metabólica", unit: "anos" },
];

export const photoFields: { key: EvaluationPhotoKey; label: string }[] = [
  { key: "photoFront", label: "Foto Frontal" },
  { key: "photoSideRight", label: "Foto Lateral Direita" },
  { key: "photoSideLeft", label: "Foto Lateral Esquerda" },
  { key: "photoBack", label: "Foto de Costas" },
];

export function formatMetricValue(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) return "—";
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}
