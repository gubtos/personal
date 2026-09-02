import { useEffect, useMemo, useState } from "react";
import { FileDown, Plus, Search, Settings as SettingsIcon, UserX, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberForm } from "@/components/members/MemberForm";
import { MemberModeList } from "@/components/members/MemberModeList";
import { ExportMembersPdfModal } from "@/components/pdf/ExportMembersPdfModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useCreateMember, useMembersSorted } from "@/lib/queries";
import { daysUntilBirthday } from "@/lib/dates";
import type { MemberFormValues } from "@/lib/schemas";
import type { MemberListMode } from "@/types";

const MODE_OPTIONS: { value: MemberListMode; label: string }[] = [
  { value: "nome", label: "Nome" },
  { value: "vencimento", label: "Vencimento" },
  { value: "avaliacao", label: "Próxima Avaliação" },
  { value: "aniversario", label: "Data de Nascimento" },
];

const MODE_STORAGE_KEY = "members-list-mode";
const DISABLED_STORAGE_KEY = "members-list-show-disabled";

function loadStoredMode(): MemberListMode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return MODE_OPTIONS.some((option) => option.value === stored)
    ? (stored as MemberListMode)
    : "nome";
}

export default function MembersListPage() {
  const [mode, setMode] = useState<MemberListMode>(loadStoredMode);
  const [showDisabled, setShowDisabled] = useState(
    () => localStorage.getItem(DISABLED_STORAGE_KEY) === "1",
  );
  const { data: members, isLoading } = useMembersSorted(mode, !showDisabled);
  const createMember = useCreateMember();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(DISABLED_STORAGE_KEY, showDisabled ? "1" : "0");
  }, [showDisabled]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? members.filter((member) => member.name.toLowerCase().includes(term))
      : members;
    if (mode === "aniversario") {
      return [...filtered].sort((a, b) => {
        const aDays = daysUntilBirthday(a.birthday);
        const bDays = daysUntilBirthday(b.birthday);
        if (aDays === null && bDays === null) return 0;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        return aDays - bDays;
      });
    }
    return filtered;
  }, [members, search, mode]);

  async function handleCreate(values: MemberFormValues) {
    await createMember.mutateAsync({
      name: values.name,
      phone: values.phone,
      birthday: values.birthday,
      gender: values.gender,
      facePhoto: values.facePhoto ?? null,
      notes: values.notes ?? null,
      paymentDueDay: values.paymentDueDay,
    });
    setFormOpen(false);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">
          {showDisabled ? "Alunos desativados" : "Alunos"}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDisabled((v) => !v)}
          >
            {showDisabled ? (
              <>
                <Users /> Ver ativos
              </>
            ) : (
              <>
                <UserX /> Ver desativados
              </>
            )}
          </Button>
          <Select value={mode} onValueChange={(value) => setMode(value as MemberListMode)}>
            <SelectTrigger className="w-[180px]" aria-label="Modo de exibição">
              <SelectValue>
                {MODE_OPTIONS.find((option) => option.value === mode)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setPdfOpen(true)}
            aria-label="Exportar PDF da lista de alunos"
          >
            <FileDown /> Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Configurações"
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon />
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Novo aluno
          </Button>
        </div>
      </header>

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {!isLoading && filteredMembers.length === 0 && (
        <p className="text-muted-foreground py-12 text-center">
          {search
            ? "Nenhum aluno encontrado."
            : showDisabled
              ? "Nenhum aluno desativado."
              : "Nenhum aluno cadastrado ainda. Clique em “Novo aluno” para começar."}
        </p>
      )}

      {!isLoading && filteredMembers.length > 0 && (
        <MemberModeList members={filteredMembers} mode={mode} />
      )}

      <MemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={createMember.isPending}
      />

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <ExportMembersPdfModal open={pdfOpen} onOpenChange={setPdfOpen} />
    </div>
  );
}
