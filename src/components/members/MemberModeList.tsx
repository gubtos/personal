import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";

import { toDataUrl } from "@/lib/photo";
import { daysUntilBirthday } from "@/lib/dates";
import type { MemberListItem, MemberListMode } from "@/types";

const MODE_LABELS: Record<MemberListMode, string> = {
  nome: "Próxima Avaliação",
  vencimento: "Vencimento",
  avaliacao: "Próxima Avaliação",
  aniversario: "Aniversário",
};

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function formatBirthday(iso: string) {
  const [, month, day] = iso.split("-");
  if (!month || !day) return iso;
  return `${day}/${month}`;
}

interface MemberModeListProps {
  members: MemberListItem[];
  mode: MemberListMode;
}

function isEvaluationStatusShown(mode: MemberListMode) {
  return mode === "nome" || mode === "avaliacao";
}

export function MemberModeList({ members, mode }: MemberModeListProps) {
  const today = new Date().toISOString().slice(0, 10);
  const showEvaluationStatus = isEvaluationStatusShown(mode);

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-3 text-left font-medium">Nome</th>
            <th className="p-3 text-left font-medium">{MODE_LABELS[mode]}</th>
            {mode === "vencimento" && (
              <th className="p-3 text-left font-medium">Status</th>
            )}
            {showEvaluationStatus && (
              <th className="p-3 text-left font-medium">Status</th>
            )}
            {mode === "aniversario" && (
              <th className="p-3 text-left font-medium">Dias p/ aniversário</th>
            )}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-t">
              <td className="p-3">
                <Link
                  to={`/membros/${member.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    {member.facePhoto ? (
                      <img
                        src={toDataUrl(member.facePhoto)}
                        alt={member.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <UserRound className="text-muted-foreground size-4" />
                    )}
                  </div>
                  <span className="truncate font-medium">{member.name}</span>
                </Link>
              </td>
              <td className="p-3">
                {mode === "nome" || mode === "avaliacao"
                  ? formatDate(member.nextEvaluationDate)
                  : mode === "vencimento" && member.currentDueDate
                    ? formatDate(member.currentDueDate)
                    : formatBirthday(member.birthday)}
              </td>
              {mode === "vencimento" && (
                <td className="p-3">
                  {member.currentPaid === true ? (
                    <span className="font-medium text-green-700 dark:text-green-500">
                      Pago
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Em aberto</span>
                  )}
                </td>
              )}
              {showEvaluationStatus && (
                <td className="p-3">
                  {member.nextEvaluationDate < today ? (
                    <span className="font-medium text-red-700 dark:text-red-500">
                      Atrasado
                    </span>
                  ) : (
                    <span className="font-medium text-green-700 dark:text-green-500">
                      Atualizado
                    </span>
                  )}
                </td>
              )}
              {mode === "aniversario" && (
                <td className="p-3">
                  {daysUntilBirthday(member.birthday) ?? "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
