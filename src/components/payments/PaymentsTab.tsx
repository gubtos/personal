import { Button } from "@/components/ui/button";
import { usePayments, useSetPaymentPaid } from "@/lib/queries";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatReferenceMonth(referenceMonth: string) {
  const [year, month] = referenceMonth.split("-");
  const monthName = MONTH_NAMES[Number(month) - 1] ?? month;
  return `${monthName} de ${year}`;
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function PaymentsTab({ memberId }: { memberId: string }) {
  const { data: payments, isLoading } = usePayments(memberId);
  const setPaid = useSetPaymentPaid(memberId);

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  if (!payments || payments.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Nenhum pagamento registrado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-3 text-left font-medium">Mês Referência</th>
            <th className="p-3 text-left font-medium">Data de vencimento</th>
            <th className="p-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-t">
              <td className="p-3">{formatReferenceMonth(payment.referenceMonth)}</td>
              <td className="p-3">{formatDate(payment.dueDate)}</td>
              <td className="p-3">
                {payment.paid ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-700 dark:text-green-500">
                      Pago
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={setPaid.isPending}
                      onClick={() => setPaid.mutate({ id: payment.id, paid: false })}
                    >
                      Desfazer
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={setPaid.isPending}
                    onClick={() => setPaid.mutate({ id: payment.id, paid: true })}
                  >
                    Pagar
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
