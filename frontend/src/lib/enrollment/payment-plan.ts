import type { InstallmentPlanItem } from "@/lib/api/types";
import {
  addMonthsToStorageDate,
  todayStorage,
  type StorageDate,
} from "@/lib/locale";

export type WizardInstallmentRow = InstallmentPlanItem & { id: string };

export type PaymentPlanState = {
  upfrontAmount: number;
  installmentCount: string;
  firstInstallmentDate: StorageDate | null;
  remainingInstallments: WizardInstallmentRow[];
  installmentsManual: boolean;
};

export const INSTALLMENT_COUNT_OPTIONS = [
  { value: "1", label: "۱ قسط" },
  { value: "2", label: "۲ قسط" },
  { value: "3", label: "۳ قسط" },
  { value: "4", label: "۴ قسط" },
  { value: "6", label: "۶ قسط" },
] as const;

export function defaultUpfrontAmount(finalAmount: number): number {
  if (finalAmount <= 0) {
    return 0;
  }
  return Math.ceil(finalAmount * 0.3);
}

export function splitRemainingAmount(
  remaining: number,
  count: number,
): number[] {
  if (count <= 0 || remaining <= 0) {
    return [];
  }
  const perInstallment = Math.floor(remaining / count);
  const lastInstallment = remaining - perInstallment * (count - 1);
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? lastInstallment : perInstallment,
  );
}

export function buildRemainingInstallments(
  remaining: number,
  count: number,
  firstDate: StorageDate,
): WizardInstallmentRow[] {
  const amounts = splitRemainingAmount(remaining, count);
  return amounts.map((amount, index) => ({
    id: String(index + 1),
    sequence: index + 1,
    amount,
    due_date: addMonthsToStorageDate(firstDate, index),
  }));
}

export function emptyPaymentPlanState(finalAmount: number): PaymentPlanState {
  const upfrontAmount = defaultUpfrontAmount(finalAmount);
  const installmentCount = "2";
  const firstInstallmentDate = addMonthsToStorageDate(todayStorage(), 1);
  const remaining = Math.max(0, finalAmount - upfrontAmount);

  return {
    upfrontAmount,
    installmentCount,
    firstInstallmentDate,
    remainingInstallments: buildRemainingInstallments(
      remaining,
      Number(installmentCount),
      firstInstallmentDate,
    ),
    installmentsManual: false,
  };
}

export function recalculatePaymentPlan(
  state: PaymentPlanState,
  finalAmount: number,
  patch: Partial<PaymentPlanState> = {},
): PaymentPlanState {
  const next: PaymentPlanState = { ...state, ...patch };
  const upfrontAmount = next.upfrontAmount;
  const installmentCount = next.installmentCount;
  const firstInstallmentDate = next.firstInstallmentDate;
  const installmentsManual =
    patch.installmentsManual ?? next.installmentsManual;

  if (
    installmentsManual ||
    firstInstallmentDate == null ||
    !installmentCount
  ) {
    return { ...next, installmentsManual };
  }

  const remaining = Math.max(0, finalAmount - upfrontAmount);
  const count = Number(installmentCount);

  return {
    ...next,
    remainingInstallments: buildRemainingInstallments(
      remaining,
      count,
      firstInstallmentDate,
    ),
    installmentsManual: false,
  };
}

export function isUpfrontValid(
  upfrontAmount: number,
  finalAmount: number,
): boolean {
  return upfrontAmount > 0 && upfrontAmount <= finalAmount;
}

export function paymentPlanTotals(
  state: PaymentPlanState,
): {
  installmentSum: number;
  totalSum: number;
  remainingForInstallments: number;
} {
  const installmentSum = state.remainingInstallments.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  return {
    installmentSum,
    totalSum: state.upfrontAmount + installmentSum,
    remainingForInstallments: Math.max(
      0,
      state.upfrontAmount > 0 ? installmentSum : 0,
    ),
  };
}

export function isPaymentPlanValid(
  state: PaymentPlanState,
  finalAmount: number,
): boolean {
  if (finalAmount <= 0) {
    return false;
  }
  if (!isUpfrontValid(state.upfrontAmount, finalAmount)) {
    return false;
  }
  if (!state.firstInstallmentDate || !state.installmentCount) {
    return false;
  }
  if (state.remainingInstallments.length !== Number(state.installmentCount)) {
    return false;
  }
  const { totalSum } = paymentPlanTotals(state);
  return totalSum === finalAmount;
}

export function paymentPlanToInvoiceInstallments(
  state: PaymentPlanState,
): InstallmentPlanItem[] {
  const today = todayStorage();
  return [
    {
      sequence: 1,
      amount: state.upfrontAmount,
      due_date: today,
    },
    ...state.remainingInstallments.map((row, index) => ({
      sequence: index + 2,
      amount: row.amount,
      due_date: row.due_date,
    })),
  ];
}
