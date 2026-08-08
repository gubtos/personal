import { useEffect, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { UserRound } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fileToBase64, toDataUrl } from "@/lib/photo";
import { genderOptions, memberSchema, type MemberFormValues } from "@/lib/schemas";
import type { Member } from "@/types";

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member;
  onSubmit: (values: MemberFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const emptyValues: MemberFormValues = {
  name: "",
  phone: "",
  birthday: "",
  gender: "feminino",
  facePhoto: null,
};

export function MemberForm({
  open,
  onOpenChange,
  member,
  onSubmit,
  isSubmitting,
}: MemberFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    mode: "onTouched",
    defaultValues: member
      ? {
          name: member.name,
          phone: member.phone,
          birthday: member.birthday,
          gender: member.gender,
          facePhoto: member.facePhoto,
        }
      : emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(
        member
          ? {
              name: member.name,
              phone: member.phone,
              birthday: member.birthday,
              gender: member.gender,
              facePhoto: member.facePhoto,
            }
          : emptyValues,
      );
    }
  }, [open, member, reset]);

  const [genderValue, facePhotoValue] = watch(["gender", "facePhoto"]);

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setValue("facePhoto", base64, { shouldDirty: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? "Editar aluno" : "Novo aluno"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do aluno para {member ? "atualizar" : "cadastrar"} o
            cadastro.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div className="flex items-center gap-4">
            <div className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full">
              {facePhotoValue ? (
                <img
                  src={toDataUrl(facePhotoValue)}
                  alt="Foto de perfil"
                  className="size-full object-cover"
                />
              ) : (
                <UserRound className="text-muted-foreground size-8" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="facePhoto">Foto de perfil (opcional)</Label>
              <Input
                id="facePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="(11) 99999-0000"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="birthday">Data de nascimento</Label>
              <Input
                id="birthday"
                type="date"
                aria-invalid={Boolean(errors.birthday)}
                {...register("birthday")}
              />
              {errors.birthday && (
                <p className="text-destructive text-xs">
                  {errors.birthday.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender">Gênero</Label>
              <Select
                value={genderValue}
                onValueChange={(value) =>
                  setValue("gender", value as MemberFormValues["gender"], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {member ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
