import { useMemo, useState } from "react";
import { Plus, Search, Settings as SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberCard } from "@/components/members/MemberCard";
import { MemberForm } from "@/components/members/MemberForm";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useCreateMember, useMembersWithNextEvaluation } from "@/lib/queries";
import type { MemberFormValues } from "@/lib/schemas";

export default function MembersListPage() {
  const { data: members, isLoading } = useMembersWithNextEvaluation();
  const createMember = useCreateMember();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => member.name.toLowerCase().includes(term));
  }, [members, search]);

  async function handleCreate(values: MemberFormValues) {
    await createMember.mutateAsync({
      name: values.name,
      phone: values.phone,
      birthday: values.birthday,
      gender: values.gender,
      facePhoto: values.facePhoto ?? null,
      notes: values.notes ?? null,
    });
    setFormOpen(false);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Alunos</h1>
        <div className="flex gap-2">
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
            : "Nenhum aluno cadastrado ainda. Clique em “Novo aluno” para começar."}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filteredMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      <MemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={createMember.isPending}
      />

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
