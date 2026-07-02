"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import {
  DataTable,
  FinancialTable,
  RelationshipCard,
} from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import {
  ConfirmDialog,
  PermissionBanner,
  StatusAction,
  StatusBadge,
} from "@/components/domain";
import { AppDrawer, ErrorState, useToast } from "@/components/feedback";
import { BlockSkeleton } from "@/components/feedback/skeleton";
import { FrozenField } from "@/components/form/frozen-field";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { Textarea } from "@/components/form/textarea";
import { Breadcrumb } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { T1DetailSkeleton } from "@/components/skeletons";
import { toApiError } from "@/lib/api/errors";
import type { ApiError } from "@/lib/api/error";
import {
  createPayment,
  createRefund,
  getClass,
  getEnrollment,
  getInvoice,
  getPerson,
  listPayments,
  listRefunds,
} from "@/lib/api/finance";
import type {
  CourseClassRead,
  EnrollmentRead,
  InstallmentRead,
  InvoiceDetailRead,
  PaymentRead,
  PersonRead,
  RefundRead,
} from "@/lib/api/types";
import { canManageFinance } from "@/lib/auth/role";
import { refundableBalance } from "@/lib/finance/preflight";
import { formatDateDisplay, formatToman } from "@/lib/locale";

const INVOICE_LOCK_REASON = "مبلغ فاکتور پس از صدور قابل تغییر نیست";

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: 200,
  offset: 0,
  has_more: false,
});

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const invoiceId = Number(params.id);
  const readOnly = !canManageFinance();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [invoice, setInvoice] = React.useState<InvoiceDetailRead | null>(null);
  const [enrollment, setEnrollment] = React.useState<EnrollmentRead | null>(null);
  const [person, setPerson] = React.useState<PersonRead | null>(null);
  const [courseClass, setCourseClass] = React.useState<CourseClassRead | null>(
    null,
  );
  const [payments, setPayments] = React.useState<PaymentRead[]>([]);
  const [refunds, setRefunds] = React.useState<RefundRead[]>([]);
  const [financeLoading, setFinanceLoading] = React.useState(false);

  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = React.useState(false);
  const [paymentInstallment, setPaymentInstallment] =
    React.useState<InstallmentRead | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState<number | null>(null);

  const [refundOpen, setRefundOpen] = React.useState(false);
  const [refundSubmitting, setRefundSubmitting] = React.useState(false);
  const [refundPayment, setRefundPayment] = React.useState<PaymentRead | null>(
    null,
  );
  const [refundReason, setRefundReason] = React.useState("");

  const loadInvoice = React.useCallback(async () => {
    if (!Number.isFinite(invoiceId)) {
      setError({
        detail: "شناسه نامعتبر",
        error_code: "NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const invoiceData = await getInvoice(invoiceId);
      const enrollmentData = await getEnrollment(invoiceData.enrollment_id);
      const [personData, classData] = await Promise.all([
        getPerson(enrollmentData.person_id),
        getClass(enrollmentData.class_id),
      ]);
      setInvoice(invoiceData);
      setEnrollment(enrollmentData);
      setPerson(personData);
      setCourseClass(classData);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری فاکتور"));
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  const loadPaymentsAndRefunds = React.useCallback(async () => {
    if (!invoice) return;
    setFinanceLoading(true);
    try {
      const installmentIds = new Set(invoice.installments.map((inst) => inst.id));
      const [paymentsRes, refundsRes] = await Promise.all([
        listPayments({ limit: 500 }),
        listRefunds({ limit: 500 }),
      ]);
      setPayments(
        paymentsRes.items.filter((payment) =>
          installmentIds.has(payment.installment_id),
        ),
      );
      const paymentIds = new Set(
        paymentsRes.items
          .filter((payment) => installmentIds.has(payment.installment_id))
          .map((payment) => payment.id),
      );
      setRefunds(refundsRes.items.filter((refund) => paymentIds.has(refund.payment_id)));
    } catch {
      setPayments([]);
      setRefunds([]);
    } finally {
      setFinanceLoading(false);
    }
  }, [invoice]);

  React.useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  React.useEffect(() => {
    if (invoice) {
      void loadPaymentsAndRefunds();
    }
  }, [invoice, loadPaymentsAndRefunds]);

  const openPaymentDrawer = (installment: InstallmentRead) => {
    setPaymentInstallment(installment);
    setPaymentAmount(null);
    setPaymentOpen(true);
  };

  const paymentRemaining = paymentInstallment
    ? paymentInstallment.amount - paymentInstallment.paid_amount
    : 0;

  const paymentValid =
    paymentAmount != null &&
    paymentAmount > 0 &&
    paymentAmount <= paymentRemaining;

  const handleRecordPayment = async () => {
    if (!paymentInstallment || !paymentValid || paymentAmount == null) return;
    setPaymentSubmitting(true);
    try {
      await createPayment({
        installment_id: paymentInstallment.id,
        amount: paymentAmount,
      });
      toast({ variant: "success", title: "پرداخت ثبت شد" });
      setPaymentOpen(false);
      await loadInvoice();
      await loadPaymentsAndRefunds();
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در ثبت پرداخت").detail,
      });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const openRefundDialog = (payment: PaymentRead) => {
    setRefundPayment(payment);
    setRefundReason("");
    setRefundOpen(true);
  };

  const currentRefundable = refundPayment
    ? refundableBalance(refundPayment.amount, refunds, refundPayment.id)
    : 0;

  const refundConsequences = refundPayment
    ? [
        `مبلغ بازگشتی: ${formatToman(currentRefundable)}`,
        `مانده قابل بازپرداخت پس از این عملیات: ۰ تومان`,
      ]
    : [];

  const handleRefundConfirm = async () => {
    if (!refundPayment || !refundReason.trim() || currentRefundable <= 0) return;
    setRefundSubmitting(true);
    try {
      await createRefund({
        payment_id: refundPayment.id,
        amount: currentRefundable,
        reason: refundReason.trim(),
      });
      toast({ variant: "success", title: "بازپرداخت ثبت شد" });
      setRefundOpen(false);
      await loadInvoice();
      await loadPaymentsAndRefunds();
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در بازپرداخت").detail,
      });
    } finally {
      setRefundSubmitting(false);
    }
  };

  if (loading) {
    return (
      <T1DetailSkeleton
        title="…"
        tabs={[
          {
            id: "invoice",
            label: "فاکتور",
            content: <BlockSkeleton height="320px" width="100%" />,
          },
        ]}
        secondary={<BlockSkeleton height="120px" width="100%" />}
      />
    );
  }

  if (error || !invoice || !enrollment || !person || !courseClass) {
    return <ErrorState error={error ?? toApiError(null)} />;
  }

  const headerTitle = `${person.full_name} — ${courseClass.name}`;

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: "خانه", href: "/dashboard" },
          { label: "ثبت‌نام‌ها", href: "/enrollments" },
          { label: headerTitle },
        ]}
        className="mb-[var(--semantic-space-sectionGap)]"
      />

      <T1DetailSkeleton
        title={headerTitle}
        permissionBanner={readOnly ? <PermissionBanner /> : undefined}
        statusAction={<StatusBadge domain="invoice" value={invoice.status} />}
        tabs={[
          {
            id: "invoice",
            label: "فاکتور",
            content: (
              <div className="flex flex-col gap-[var(--semantic-space-sectionGap)]">
                <FrozenField
                  variant="money"
                  label="مبلغ کل"
                  value={invoice.total_amount}
                  lockReason={INVOICE_LOCK_REASON}
                />

                <section>
                  <h2 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                    اقساط
                  </h2>
                  <FinancialTable
                    columns={[
                      {
                        key: "sequence",
                        header: "قسط",
                        numeric: true,
                        cell: (row) => row.sequence,
                      },
                      {
                        key: "amount",
                        header: "مبلغ",
                        numeric: true,
                        cell: (row) => formatToman(row.amount),
                      },
                      {
                        key: "due_date",
                        header: "سررسید",
                        numeric: true,
                        cell: (row) => formatDateDisplay(row.due_date),
                      },
                      {
                        key: "paid_amount",
                        header: "پرداخت‌شده",
                        numeric: true,
                        cell: (row) => formatToman(row.paid_amount),
                      },
                      {
                        key: "status",
                        header: "وضعیت",
                        cell: (row) =>
                          readOnly ? (
                            <StatusBadge domain="installment" value={row.status} />
                          ) : (
                            <StatusAction
                              entity="installment"
                              status={row.status}
                              onAction={() => openPaymentDrawer(row)}
                            />
                          ),
                      },
                    ]}
                    data={{
                      ...emptyPage<InstallmentRead>(),
                      items: invoice.installments,
                      total_count: invoice.installments.length,
                    }}
                    loading={financeLoading}
                    emptyMessage="قسطی یافت نشد"
                  />
                </section>

                <section>
                  <h2 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                    پرداخت‌ها
                  </h2>
                  <DataTable
                    columns={[
                      {
                        key: "amount",
                        header: "مبلغ",
                        align: "end",
                        cell: (row) => formatToman(row.amount),
                      },
                      {
                        key: "payment_date",
                        header: "تاریخ",
                        align: "end",
                        cell: (row) => formatDateDisplay(row.payment_date),
                      },
                      {
                        key: "recorded_by",
                        header: "ثبت‌کننده",
                        align: "end",
                        cell: (row) => row.recorded_by,
                      },
                      {
                        key: "actions",
                        header: "عملیات",
                        cell: (row) => {
                          const balance = refundableBalance(
                            row.amount,
                            refunds,
                            row.id,
                          );
                          if (readOnly || balance <= 0) return "—";
                          return (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => openRefundDialog(row)}
                            >
                              بازپرداخت
                            </Button>
                          );
                        },
                      },
                    ]}
                    data={{
                      ...emptyPage<PaymentRead>(),
                      items: payments,
                      total_count: payments.length,
                    }}
                    loading={financeLoading}
                    emptyMessage="پرداختی ثبت نشده"
                  />
                </section>

                <section>
                  <h2 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                    بازپرداخت‌ها
                  </h2>
                  <DataTable
                    columns={[
                      {
                        key: "amount",
                        header: "مبلغ",
                        align: "end",
                        cell: (row) => formatToman(row.amount),
                      },
                      { key: "reason", header: "دلیل" },
                      {
                        key: "refund_date",
                        header: "تاریخ",
                        align: "end",
                        cell: (row) => formatDateDisplay(row.refund_date),
                      },
                    ]}
                    data={{
                      ...emptyPage<RefundRead>(),
                      items: refunds,
                      total_count: refunds.length,
                    }}
                    loading={financeLoading}
                    emptyMessage="بازپرداختی ثبت نشده"
                  />
                </section>
              </div>
            ),
          },
        ]}
        secondary={
          <div className="flex flex-col gap-[var(--primitive-space-3)]">
            <RelationshipCard
              label="ثبت‌نام"
              title={courseClass.name}
              subtitle={formatToman(enrollment.final_amount)}
              href={`/enrollments/${enrollment.id}`}
            />
            <RelationshipCard
              label="شخص"
              title={person.full_name}
              subtitle={person.phone ?? undefined}
              href={`/people/${person.id}`}
            />
          </div>
        }
      />

      <AppDrawer
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        mode="form"
        title="ثبت پرداخت"
        onSubmit={() => void handleRecordPayment()}
        submitLoading={paymentSubmitting}
        submitDisabled={!paymentValid}
        submitLabel="ثبت پرداخت"
      >
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            مانده قابل پرداخت: {formatToman(paymentRemaining)}
          </p>
          <FormField label="مبلغ پرداخت" required>
            <MoneyInput
              value={paymentAmount}
              onValueChange={setPaymentAmount}
              error={
                paymentAmount != null &&
                paymentAmount > 0 &&
                paymentAmount > paymentRemaining
              }
            />
          </FormField>
        </div>
      </AppDrawer>

      {/* Refund dialog always requires reason — include Textarea as children */}
      <ConfirmDialog
        tier={3}
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="بازپرداخت"
        body="بازپرداخت یک عملیات مالی با اثر غیرقابل بازگشت است."
        confirmLabel="تأیید بازپرداخت"
        confirmLoading={refundSubmitting}
        confirmDisabled={!refundReason.trim() || currentRefundable <= 0}
        onConfirm={() => void handleRefundConfirm()}
        onCancel={() => setRefundOpen(false)}
        consequences={refundConsequences}
      >
        <FormField label="دلیل بازپرداخت" required>
          <Textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            rows={3}
          />
        </FormField>
      </ConfirmDialog>
    </>
  );
}
