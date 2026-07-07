"use client";

import * as React from "react";

import { DatePicker } from "@/components/form/date-picker";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { Select } from "@/components/form/select";
import {
  INSTALLMENT_COUNT_OPTIONS,
  isPaymentPlanValid,
  isUpfrontValid,
  paymentPlanTotals,
  recalculatePaymentPlan,
  type PaymentPlanState,
  type WizardInstallmentRow,
} from "@/lib/enrollment/payment-plan";
import { formatCount, formatDateDisplay, formatToman } from "@/lib/locale";
import { toPersianDigits } from "@/lib/locale/number";

export type EnrollmentPaymentPlanFieldsProps = {
  finalAmount: number;
  priceSnapshot: number;
  discount: number;
  state: PaymentPlanState;
  onChange: (state: PaymentPlanState) => void;
};

function EnrollmentPaymentPlanFields({
  finalAmount,
  priceSnapshot,
  discount,
  state,
  onChange,
}: EnrollmentPaymentPlanFieldsProps) {
  const { installmentSum, totalSum } = paymentPlanTotals(state);
  const remainingAmount = Math.max(0, finalAmount - state.upfrontAmount);
  const upfrontValid = isUpfrontValid(state.upfrontAmount, finalAmount);
  const planValid = isPaymentPlanValid(state, finalAmount);

  const patchPlan = (patch: Partial<PaymentPlanState>) => {
    onChange(recalculatePaymentPlan(state, finalAmount, patch));
  };

  const updateInstallment = (
    id: string,
    patch: Partial<Pick<WizardInstallmentRow, "amount" | "due_date">>,
  ) => {
    onChange({
      ...state,
      installmentsManual: true,
      remainingInstallments: state.remainingInstallments.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          پیش‌پرداخت
        </h3>

        <FormField
          label="مبلغ پیش‌پرداخت"
          required
          error={
            !upfrontValid
              ? {
                  detail: "مبلغ پیش‌پرداخت باید بیشتر از صفر و حداکثر برابر مبلغ نهایی باشد",
                  error_code: "VALIDATION_ERROR",
                  timestamp: new Date().toISOString(),
                  field: "upfront_amount",
                }
              : null
          }
        >
          <MoneyInput
            value={state.upfrontAmount}
            onValueChange={(value) =>
              patchPlan({
                upfrontAmount: value ?? 0,
                installmentsManual: false,
              })
            }
            error={!upfrontValid}
          />
        </FormField>

        {upfrontValid ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            باقی‌مانده برای اقساط:{" "}
            <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
              {formatToman(remainingAmount)}
            </span>
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          اقساط باقی‌مانده
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField label="تعداد اقساط" required>
            <Select
              options={INSTALLMENT_COUNT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={state.installmentCount}
              onChange={(value) =>
                patchPlan({
                  installmentCount: value,
                  installmentsManual: false,
                })
              }
            />
          </FormField>

          <FormField label="تاریخ اولین قسط" required>
            <DatePicker
              value={state.firstInstallmentDate}
              onChange={(value) =>
                patchPlan({
                  firstInstallmentDate: value,
                  installmentsManual: false,
                })
              }
            />
          </FormField>
        </div>

        {state.remainingInstallments.length > 0 ? (
          <div className="overflow-x-auto rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]">
            <table className="w-full min-w-[480px] border-collapse text-[length:var(--primitive-font-size-sm)]">
              <thead>
                <tr className="border-b border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)]">
                  <th className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)] text-start font-[var(--primitive-font-weight-medium)]">
                    قسط
                  </th>
                  <th className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)] text-start font-[var(--primitive-font-weight-medium)]">
                    مبلغ
                  </th>
                  <th className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)] text-start font-[var(--primitive-font-weight-medium)]">
                    تاریخ سررسید
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.remainingInstallments.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--semantic-color-surface-border)] last:border-b-0"
                  >
                    <td className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)] align-top">
                      {toPersianDigits(String(row.sequence))}
                    </td>
                    <td className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)] align-top">
                      <MoneyInput
                        value={row.amount}
                        onValueChange={(value) =>
                          updateInstallment(row.id, { amount: value ?? 0 })
                        }
                      />
                    </td>
                    <td className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)] align-top">
                      <DatePicker
                        value={row.due_date}
                        onChange={(value) => {
                          if (value) {
                            updateInstallment(row.id, { due_date: value });
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-col gap-[var(--primitive-space-2)]">
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            جمع اقساط:{" "}
            <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
              {formatToman(installmentSum)}
            </span>
          </p>
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            جمع کل (پیش‌پرداخت + اقساط):{" "}
            <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
              {formatToman(totalSum)}
            </span>
          </p>
          {!planValid ? (
            <p
              role="alert"
              className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-status-danger)]"
            >
              جمع پرداخت‌ها باید برابر مبلغ نهایی باشد
            </p>
          ) : (
            <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-status-success)]">
              ✓ مبالغ صحیح است
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] p-[var(--primitive-space-4)]">
        <h3 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          خلاصه نهایی
        </h3>
        <dl className="flex flex-col gap-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)]">
          <div className="flex items-center justify-between gap-[var(--primitive-space-3)]">
            <dt className="text-[var(--semantic-color-text-secondary)]">
              مبلغ کل دوره
            </dt>
            <dd>{formatToman(priceSnapshot)}</dd>
          </div>
          <div className="flex items-center justify-between gap-[var(--primitive-space-3)]">
            <dt className="text-[var(--semantic-color-text-secondary)]">تخفیف</dt>
            <dd>{formatToman(discount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-[var(--primitive-space-3)]">
            <dt className="text-[var(--semantic-color-text-secondary)]">
              مبلغ نهایی
            </dt>
            <dd className="font-[var(--primitive-font-weight-medium)]">
              {formatToman(finalAmount)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-[var(--primitive-space-3)]">
            <dt className="text-[var(--semantic-color-text-secondary)]">
              پیش‌پرداخت
            </dt>
            <dd>{formatToman(state.upfrontAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-[var(--primitive-space-3)]">
            <dt className="text-[var(--semantic-color-text-secondary)]">
              تعداد اقساط
            </dt>
            <dd>{formatCount(state.remainingInstallments.length)}</dd>
          </div>
          <div className="my-[var(--primitive-space-1)] border-t border-[var(--semantic-color-surface-border)]" />
          <div className="flex items-center justify-between gap-[var(--primitive-space-3)]">
            <dt className="text-[var(--semantic-color-text-secondary)]">مجموع</dt>
            <dd className="font-[var(--primitive-font-weight-semibold)]">
              {formatToman(totalSum)}
              {planValid ? " ✓" : ""}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export { EnrollmentPaymentPlanFields };
