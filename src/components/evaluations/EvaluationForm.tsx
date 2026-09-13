import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoPickerField } from "@/components/shared/PhotoPickerField";
import { Textarea } from "@/components/ui/textarea";
import { bioimpedanceMetrics, perimeterMetrics, photoFields } from "@/lib/metrics";
import { evaluationSchema, type EvaluationFormValues } from "@/lib/schemas";
import type { Evaluation, EvaluationPhotos, PhotoReference } from "@/types";

interface EvaluationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation?: Evaluation;
  photos?: EvaluationPhotos;
  nextNumber: number;
  photoReferences?: PhotoReference[];
  onSubmit: (values: EvaluationFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const emptyValues: EvaluationFormValues = {
  date: new Date().toISOString().slice(0, 10),
  weightKg: "",
  heightM: "",
  neckCm: "",
  chestCm: "",
  waistCm: "",
  abdomenCm: "",
  hipCm: "",
  forearmRightCm: "",
  forearmLeftCm: "",
  armRightCm: "",
  armLeftCm: "",
  thighRightCm: "",
  thighLeftCm: "",
  calfRightCm: "",
  calfLeftCm: "",
  armFlexedRightCm: "",
  armFlexedLeftCm: "",
  heartRateBpm: "",
  heartIndex: "",
  bmi: "",
  bodyFatPct: "",
  muscleRatePct: "",
  fatFreeMassKg: "",
  subcutaneousFatPct: "",
  visceralFat: "",
  bodyWaterPct: "",
  skeletalMusclePct: "",
  muscleMassKg: "",
  boneMassKg: "",
  bmrKcal: "",
  metabolicAge: "",
  photoFront: null,
  photoSideRight: null,
  photoSideLeft: null,
  photoBack: null,
  notes: "",
};

function numToStr(value: number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

function evaluationToFormValues(
  evaluation: Evaluation,
  photos?: EvaluationPhotos,
): EvaluationFormValues {
  return {
    date: evaluation.date,
    weightKg: String(evaluation.weightKg),
    heightM: String(evaluation.heightM),
    neckCm: numToStr(evaluation.neckCm),
    chestCm: numToStr(evaluation.chestCm),
    waistCm: numToStr(evaluation.waistCm),
    abdomenCm: numToStr(evaluation.abdomenCm),
    hipCm: numToStr(evaluation.hipCm),
    forearmRightCm: numToStr(evaluation.forearmRightCm),
    forearmLeftCm: numToStr(evaluation.forearmLeftCm),
    armRightCm: numToStr(evaluation.armRightCm),
    armLeftCm: numToStr(evaluation.armLeftCm),
    thighRightCm: numToStr(evaluation.thighRightCm),
    thighLeftCm: numToStr(evaluation.thighLeftCm),
    calfRightCm: numToStr(evaluation.calfRightCm),
    calfLeftCm: numToStr(evaluation.calfLeftCm),
    armFlexedRightCm: numToStr(evaluation.armFlexedRightCm),
    armFlexedLeftCm: numToStr(evaluation.armFlexedLeftCm),
    heartRateBpm: numToStr(evaluation.heartRateBpm),
    heartIndex: numToStr(evaluation.heartIndex),
    bmi: numToStr(evaluation.bmi),
    bodyFatPct: numToStr(evaluation.bodyFatPct),
    muscleRatePct: numToStr(evaluation.muscleRatePct),
    fatFreeMassKg: numToStr(evaluation.fatFreeMassKg),
    subcutaneousFatPct: numToStr(evaluation.subcutaneousFatPct),
    visceralFat: numToStr(evaluation.visceralFat),
    bodyWaterPct: numToStr(evaluation.bodyWaterPct),
    skeletalMusclePct: numToStr(evaluation.skeletalMusclePct),
    muscleMassKg: numToStr(evaluation.muscleMassKg),
    boneMassKg: numToStr(evaluation.boneMassKg),
    bmrKcal: numToStr(evaluation.bmrKcal),
    metabolicAge: numToStr(evaluation.metabolicAge),
    photoFront: photos?.photoFront ?? null,
    photoSideRight: photos?.photoSideRight ?? null,
    photoSideLeft: photos?.photoSideLeft ?? null,
    photoBack: photos?.photoBack ?? null,
    notes: evaluation.notes ?? "",
  };
}

export function EvaluationForm({
  open,
  onOpenChange,
  evaluation,
  photos,
  nextNumber,
  photoReferences = [],
  onSubmit,
  isSubmitting,
}: EvaluationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    mode: "onTouched",
    defaultValues: evaluation
      ? evaluationToFormValues(evaluation, photos)
      : emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(evaluation ? evaluationToFormValues(evaluation, photos) : emptyValues);
    }
  }, [open, evaluation, photos, reset]);

  const photoValues = watch(photoFields.map((f) => f.key) as Array<
    keyof EvaluationFormValues
  >);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {evaluation
              ? `Editar Avaliação Nº ${evaluation.number}`
              : `Nova Avaliação Nº ${nextNumber}`}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados coletados na avaliação física.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-6"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <section className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Data da Avaliação</Label>
              <Input
                id="date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                {...register("date")}
              />
              {errors.date && (
                <p className="text-destructive text-xs">{errors.date.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weightKg">Peso (kg)</Label>
              <Input
                id="weightKg"
                type="text"
                inputMode="decimal"
                aria-invalid={Boolean(errors.weightKg)}
                {...register("weightKg")}
              />
              {errors.weightKg && (
                <p className="text-destructive text-xs">
                  {errors.weightKg.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="heightM">Altura (m)</Label>
              <Input
                id="heightM"
                type="text"
                inputMode="decimal"
                aria-invalid={Boolean(errors.heightM)}
                {...register("heightM")}
              />
              {errors.heightM && (
                <p className="text-destructive text-xs">
                  {errors.heightM.message}
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">
              Medidas de Perímetros (cm)
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {perimeterMetrics.map((metric) => {
                const fieldError =
                  errors[metric.key as keyof EvaluationFormValues];
                return (
                  <div key={metric.key} className="flex flex-col gap-1.5">
                    <Label htmlFor={metric.key}>{metric.label}</Label>
                    <Input
                      id={metric.key}
                      type="text"
                      inputMode="decimal"
                      aria-invalid={Boolean(fieldError)}
                      {...register(metric.key as keyof EvaluationFormValues)}
                    />
                    {fieldError && (
                      <p className="text-destructive text-xs">
                        {fieldError.message as string}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Medidas de Bioimpedância</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {bioimpedanceMetrics.map((metric) => {
                const fieldError =
                  errors[metric.key as keyof EvaluationFormValues];
                return (
                  <div key={metric.key} className="flex flex-col gap-1.5">
                    <Label htmlFor={metric.key}>
                      {metric.label}
                      {metric.unit ? ` (${metric.unit})` : ""}
                    </Label>
                    <Input
                      id={metric.key}
                      type="text"
                      inputMode="decimal"
                      aria-invalid={Boolean(fieldError)}
                      {...register(metric.key as keyof EvaluationFormValues)}
                    />
                    {fieldError && (
                      <p className="text-destructive text-xs">
                        {fieldError.message as string}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Fotos</h3>
            <div className="grid grid-cols-2 gap-4">
              {photoFields.map((field, index) => (
                <PhotoPickerField
                  key={field.key}
                  id={field.key}
                  label={field.label}
                  value={photoValues[index] as string | null}
                  references={photoReferences}
                  onChange={(base64) =>
                    setValue(
                      field.key as keyof EvaluationFormValues,
                      base64,
                      { shouldDirty: true },
                    )
                  }
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Observações</h3>
            <Textarea rows={3} {...register("notes")} />
          </section>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {evaluation ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
