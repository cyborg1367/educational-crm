import {
  listInstallments,
  listInvoices,
  listPayments,
  listRefunds,
  listTasks,
} from "@/lib/api/finance";
import { formatToman } from "@/lib/locale";

export type DropPreflight = {
  consequences: string[];
  installmentCancelCount: number;
  refundTotal: number;
  openTaskCount: number;
};

export async function computeDropPreflight(
  enrollmentId: number,
): Promise<DropPreflight> {
  const [invoicesRes, paymentsRes, refundsRes, tasksRes] = await Promise.all([
    listInvoices({ limit: 500 }),
    listPayments({ limit: 500 }),
    listRefunds({ limit: 500 }),
    listTasks({ limit: 500 }),
  ]);

  const invoice = invoicesRes.items.find(
    (item) => item.enrollment_id === enrollmentId,
  );

  let installmentCancelCount = 0;
  let refundTotal = 0;

  if (invoice) {
    const installmentsRes = await listInstallments(invoice.id, { limit: 100 });
    const installments = installmentsRes.items;
    installmentCancelCount = installments.filter(
      (inst) => inst.status !== "cancelled",
    ).length;

    const installmentIds = new Set(installments.map((inst) => inst.id));
    const relatedPayments = paymentsRes.items.filter((payment) =>
      installmentIds.has(payment.installment_id),
    );

    const refundedByPayment = new Map<number, number>();
    for (const refund of refundsRes.items) {
      refundedByPayment.set(
        refund.payment_id,
        (refundedByPayment.get(refund.payment_id) ?? 0) + refund.amount,
      );
    }

    for (const payment of relatedPayments) {
      const alreadyRefunded = refundedByPayment.get(payment.id) ?? 0;
      refundTotal += payment.amount - alreadyRefunded;
    }
  }

  const openTaskCount = tasksRes.items.filter(
    (task) =>
      task.related_entity_type === "enrollment" &&
      task.related_entity_id === enrollmentId &&
      task.status === "open",
  ).length;

  return {
    installmentCancelCount,
    refundTotal,
    openTaskCount,
    consequences: [
      `${installmentCancelCount} قسط لغو می‌شود`,
      `${formatToman(refundTotal)} بازپرداخت می‌شود`,
      `${openTaskCount} وظیفه لغو می‌شود`,
    ],
  };
}

export function refundableBalance(
  paymentAmount: number,
  refunds: { payment_id: number; amount: number }[],
  paymentId: number,
): number {
  const alreadyRefunded = refunds
    .filter((refund) => refund.payment_id === paymentId)
    .reduce((sum, refund) => sum + refund.amount, 0);
  return paymentAmount - alreadyRefunded;
}
