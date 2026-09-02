import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, UserCheck, UserRound, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { MemberForm } from "@/components/members/MemberForm";
import { EvaluationsTab } from "@/components/evaluations/EvaluationsTab";
import { EvolutionTab } from "@/components/evolution/EvolutionTab";
import { PaymentsTab } from "@/components/payments/PaymentsTab";
import { GeneratePdfModal } from "@/components/pdf/GeneratePdfModal";
import {
  useDeleteMember,
  useEvaluations,
  useMember,
  useNextEvaluationDate,
  useSetMemberActive,
  useUpdateMember,
} from "@/lib/queries";
import { toDataUrl } from "@/lib/photo";
import type { MemberFormValues } from "@/lib/schemas";

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { data: member, isLoading } = useMember(memberId);
  const updateMember = useUpdateMember(memberId ?? "");
  const deleteMember = useDeleteMember();
  const setMemberActive = useSetMemberActive();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const { data: evaluations } = useEvaluations(member?.id);
  const { data: nextEvaluationDate } = useNextEvaluationDate(member?.id);

  if (isLoading) {
    return <p className="text-muted-foreground p-6">Carregando...</p>;
  }

  if (!member) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Aluno não encontrado.</p>
        <Link to="/" className="text-primary text-sm underline">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  async function handleUpdate(values: MemberFormValues) {
    await updateMember.mutateAsync({
      name: values.name,
      phone: values.phone,
      birthday: values.birthday,
      gender: values.gender,
      facePhoto: values.facePhoto ?? null,
      notes: values.notes ?? null,
      paymentDueDay: values.paymentDueDay,
    });
    setEditOpen(false);
  }

  async function handleDelete() {
    if (!member) return;
    await deleteMember.mutateAsync(member.id);
    navigate("/");
  }

  async function handleToggleActive() {
    if (!member) return;
    await setMemberActive.mutateAsync({ id: member.id, active: !member.active });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft /> Voltar
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {member.facePhoto ? (
              <img
                src={toDataUrl(member.facePhoto)}
                alt={member.name}
                className="size-full object-cover"
              />
            ) : (
              <UserRound className="text-muted-foreground size-8" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{member.name}</h1>
            <p className="text-muted-foreground text-sm">{member.phone}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Editar dados
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={setMemberActive.isPending}
            onClick={handleToggleActive}
          >
            {member.active ? (
              <>
                <UserX /> Desativar aluno
              </>
            ) : (
              <>
                <UserCheck /> Ativar aluno
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 /> Excluir aluno
          </Button>
        </div>
      </header>

      <Tabs defaultValue="avaliacoes">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="pt-4">
          <MemberDataView
            member={member}
            nextEvaluationDate={nextEvaluationDate}
            onEdit={() => setEditOpen(true)}
          />
        </TabsContent>

        <TabsContent value="avaliacoes" className="pt-4">
          <EvaluationsTab
            memberId={member.id}
            onGeneratePdf={() => setPdfOpen(true)}
          />
        </TabsContent>

        <TabsContent value="evolucao" className="pt-4">
          <EvolutionTab memberId={member.id} />
        </TabsContent>

        <TabsContent value="pagamentos" className="pt-4">
          <PaymentsTab memberId={member.id} />
        </TabsContent>
      </Tabs>

      <MemberForm
        open={editOpen}
        onOpenChange={setEditOpen}
        member={member}
        onSubmit={handleUpdate}
        isSubmitting={updateMember.isPending}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir aluno"
        description={`Tem certeza que deseja excluir ${member.name}? Todas as avaliações também serão removidas. Essa ação não pode ser desfeita.`}
        onConfirm={handleDelete}
      />

      {evaluations && evaluations.length > 0 && (
        <GeneratePdfModal
          open={pdfOpen}
          onOpenChange={setPdfOpen}
          member={member}
          evaluations={evaluations}
        />
      )}
    </div>
  );
}

function MemberDataView({
  member,
  nextEvaluationDate,
  onEdit,
}: {
  member: NonNullable<ReturnType<typeof useMember>["data"]>;
  nextEvaluationDate: string | undefined;
  onEdit: () => void;
}) {
  const genderLabel: Record<string, string> = {
    masculino: "Masculino",
    feminino: "Feminino",
    outro: "Outro",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Nome" value={member.name} />
        <Field label="Telefone" value={member.phone} />
        <Field label="Data de nascimento" value={formatDate(member.birthday)} />
        <Field label="Gênero" value={genderLabel[member.gender]} />
        <Field
          label="Dia de vencimento"
          value={member.paymentDueDay ? String(member.paymentDueDay) : "Padrão (5)"}
        />
        <Field
          label="Próxima Avaliação"
          value={nextEvaluationDate ? formatDate(nextEvaluationDate) : "—"}
        />
      </div>
      {member.notes && (
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Observações</span>
          <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
        </div>
      )}
      <div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil /> Editar
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
