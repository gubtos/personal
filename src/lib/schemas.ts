import { z } from "zod";

export const genderOptions = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
] as const;

export const memberSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  phone: z.string().trim().min(1, "Informe o telefone"),
  birthday: z.string().trim().min(1, "Informe a data de nascimento"),
  gender: z.enum(["masculino", "feminino", "outro"], {
    message: "Selecione o gênero",
  }),
  facePhoto: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

/** Normalizes a locale decimal comma (common on ABNT keyboards) to a dot so `Number()` can parse it. */
function normalizeDecimal(value: string): string {
  return value.trim().replace(",", ".");
}

const requiredNumberString = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((v) => {
      const normalized = normalizeDecimal(v);
      return !Number.isNaN(Number(normalized)) && Number(normalized) > 0;
    }, message);

const optionalNumberString = z
  .string()
  .optional()
  .refine((v) => {
    if (v === undefined || v === "") return true;
    return !Number.isNaN(Number(normalizeDecimal(v)));
  }, "Valor inválido");

export const evaluationSchema = z.object({
  date: z.string().trim().min(1, "Informe a data da avaliação"),

  weightKg: requiredNumberString("Informe o peso"),
  heightM: requiredNumberString("Informe a altura"),

  neckCm: optionalNumberString,
  chestCm: optionalNumberString,
  waistCm: optionalNumberString,
  abdomenCm: optionalNumberString,
  hipCm: optionalNumberString,
  forearmRightCm: optionalNumberString,
  forearmLeftCm: optionalNumberString,
  armRightCm: optionalNumberString,
  armLeftCm: optionalNumberString,
  thighRightCm: optionalNumberString,
  thighLeftCm: optionalNumberString,
  calfRightCm: optionalNumberString,
  calfLeftCm: optionalNumberString,
  armFlexedRightCm: optionalNumberString,
  armFlexedLeftCm: optionalNumberString,

  heartRateBpm: optionalNumberString,
  heartIndex: optionalNumberString,
  bmi: optionalNumberString,
  bodyFatPct: optionalNumberString,
  muscleRatePct: optionalNumberString,
  fatFreeMassKg: optionalNumberString,
  subcutaneousFatPct: optionalNumberString,
  visceralFat: optionalNumberString,
  bodyWaterPct: optionalNumberString,
  skeletalMusclePct: optionalNumberString,
  muscleMassKg: optionalNumberString,
  boneMassKg: optionalNumberString,
  bmrKcal: optionalNumberString,
  metabolicAge: optionalNumberString,

  photoFront: z.string().nullable(),
  photoSideRight: z.string().nullable(),
  photoSideLeft: z.string().nullable(),
  photoBack: z.string().nullable(),

  notes: z.string().optional(),
});

export type EvaluationFormValues = z.infer<typeof evaluationSchema>;

const numericFieldKeys = [
  "neckCm",
  "chestCm",
  "waistCm",
  "abdomenCm",
  "hipCm",
  "forearmRightCm",
  "forearmLeftCm",
  "armRightCm",
  "armLeftCm",
  "thighRightCm",
  "thighLeftCm",
  "calfRightCm",
  "calfLeftCm",
  "armFlexedRightCm",
  "armFlexedLeftCm",
  "heartRateBpm",
  "heartIndex",
  "bmi",
  "bodyFatPct",
  "muscleRatePct",
  "fatFreeMassKg",
  "subcutaneousFatPct",
  "visceralFat",
  "bodyWaterPct",
  "skeletalMusclePct",
  "muscleMassKg",
  "boneMassKg",
  "bmrKcal",
  "metabolicAge",
] as const;

/** Converts the string-based evaluation form values into the numeric shape expected by the Tauri command. */
export function toEvaluationInput(values: EvaluationFormValues) {
  const result: Record<string, unknown> = {
    date: values.date,
    weightKg: Number(normalizeDecimal(values.weightKg)),
    heightM: Number(normalizeDecimal(values.heightM)),
    photoFront: values.photoFront ?? null,
    photoSideRight: values.photoSideRight ?? null,
    photoSideLeft: values.photoSideLeft ?? null,
    photoBack: values.photoBack ?? null,
    notes: values.notes ?? null,
  };
  for (const key of numericFieldKeys) {
    const raw = values[key];
    result[key] = raw === undefined || raw === "" ? null : Number(normalizeDecimal(raw));
  }
  return result as {
    date: string;
    weightKg: number;
    heightM: number;
    photoFront: string | null;
    photoSideRight: string | null;
    photoSideLeft: string | null;
    photoBack: string | null;
    notes: string | null;
  } & Record<(typeof numericFieldKeys)[number], number | null>;
}

