export type Gender = "masculino" | "feminino" | "outro";

export interface Member {
  id: string;
  name: string;
  phone: string;
  birthday: string; // ISO date (YYYY-MM-DD)
  gender: Gender;
  facePhoto: string | null; // base64 (no data: prefix)
  createdAt: string;
  updatedAt: string;
}

export interface MemberInput {
  name: string;
  phone: string;
  birthday: string;
  gender: Gender;
  facePhoto?: string | null;
}

export interface Evaluation {
  id: string;
  memberId: string;
  number: number;
  date: string; // ISO date (YYYY-MM-DD)

  weightKg: number;
  heightM: number;

  neckCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipCm: number | null;
  forearmRightCm: number | null;
  forearmLeftCm: number | null;
  armRightCm: number | null;
  armLeftCm: number | null;
  thighRightCm: number | null;
  thighLeftCm: number | null;
  calfRightCm: number | null;
  calfLeftCm: number | null;
  armFlexedRightCm: number | null;
  armFlexedLeftCm: number | null;

  heartRateBpm: number | null;
  heartIndex: number | null;
  bmi: number | null;
  bodyFatPct: number | null;
  muscleRatePct: number | null;
  fatFreeMassKg: number | null;
  subcutaneousFatPct: number | null;
  visceralFat: number | null;
  bodyWaterPct: number | null;
  skeletalMusclePct: number | null;
  muscleMassKg: number | null;
  boneMassKg: number | null;
  bmrKcal: number | null;
  metabolicAge: number | null;

  photoFront: string | null;
  photoSideRight: string | null;
  photoSideLeft: string | null;
  photoBack: string | null;

  createdAt: string;
  updatedAt: string;
}

export type EvaluationInput = Omit<
  Evaluation,
  "id" | "memberId" | "number" | "createdAt" | "updatedAt"
>;
