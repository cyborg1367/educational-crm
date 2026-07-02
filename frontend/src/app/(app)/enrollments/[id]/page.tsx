"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import {
  DataTable,
  FinancialTable,
  RelationshipCard,
  Timeline,
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
import { Badge } from "@/components/primitives/badge";
import { T1DetailSkeleton } from "@/components/skeletons";
import { toApiError } from "@/lib/api/errors";
import type { ApiError } from "@/lib/api/error";
import {
  createPayment,
  dropEnrollment,
  getClass,
  getEnrollment,
  getPerson,
  listAttendances,
  listInstallments,
  listInvoices,
} from "@/lib/api/finance";
import type {
  AttendanceRead,
  CourseClassRead,
  EnrollmentRead,
  InstallmentRead,
  PersonRead,
} from "@/lib/api/types";
import { canManageEnrollments, canManageFinance } from "@/lib/auth/role";
import { computeDropPreflight } from "@/lib/finance/preflight";
import { formatDateDisplay, formatToman } from "@/lib/locale";

const MONEY_LOCK_REASON =
  "مبلغ در زمان ثبت‌نام ثبت شده و قابل تغییر نیست";

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: 200,
  offset: 0,
  has_more: false,
});

function PresenceBadge({ present }: { present: boolean }) {
  return (
    <Badge
      className={
        present
          ? "bg-[color-mix(in_srgb,var(--semantic-color-status-success)_15%,transparent)] text-[var(--semantic-color-status-success)]"
          : "bg-[color-mix(in_srgb,var(--semantic-color-status-danger)_15%,transparent)] text-[var(--semantic-color-status-danger)]"
      }
    >
      {present ? "حاضر" : "غایب"}
    </Badge>
  );
}

export default function EnrollmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const enrollmentId = Number(params.id);
  const readOnly = !canManageEnrollments();
  const canPay = canManageFinance();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [enrollment, setEnrollment] = React.useState<EnrollmentRead | null>(null);
  const [person, setPerson] = React.useState<PersonRead | null>(null);
  const [courseClass, setCourseClass] = React.useState<CourseClassRead | null>(
    null,
  );
  const [invoiceId, setInvoiceId] = React.useState<number | null>(null);
  const [installments, setInstallments] = React.useState<InstallmentRead[]>([]);
  const [attendances, setAttendances] = React.useState<AttendanceRead[]>([]);
  const [tabLoading, setTabLoading] = React.useState(false);

  const [dropOpen, setDropOpen] = React.useState(false);
  const [dropLoading, setDropLoading] = React.useState(false);
  const [dropPreflightLoading, setDropPreflightLoading] = React.useState(false);
  const [dropConsequences, setDropConsequences] = React.useState<string[]>([]);
  const [dropReason, setDropReason] = React.useState("");
  const [dropNotes, setDropNotes] = React.useState("");

  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = React.useState(false);
  const [paymentInstallment, setPaymentInstallment] =
    React.useState<InstallmentRead | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState<number | null>(null);

  const loadCore = React.useCallback(async () => {
    if (!Number.isFinite(enrollmentId)) {
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
      const enrollmentData = await getEnrollment(enrollmentId);
      const [personData, classData] = await Promise.all([
        getPerson(enrollmentData.person_id),
        getClass(enrollmentData.class_id),
      ]);
      setEnrollment(enrollmentData);
      setPerson(personData);
      setCourseClass(classData);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری ثبت‌نام"));
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  const loadFinanceAndAttendance = React.useCallback(async () => {
    if (!enrollment) return;
    setTabLoading(true);
    try {
      const [invoicesRes, attendancesRes] = await Promise.all([
        listInvoices({ limit: 500 }),
        listAttendances({ enrollment_id: enrollment.id, limit: 500 }),
      ]);

      const invoice = invoicesRes.items.find(
        (item) => item.enrollment_id === enrollment.id,
      );
      setInvoiceId(invoice?.id ?? null);

      if (invoice) {
        const installmentsRes = await listInstallments(invoice.id, {
          limit: 100,
        });
        setInstallments(installmentsRes.items);
      } else {
        setInstallments([]);
      }

      const filteredAttendances = attendancesRes.items.filter(
        (row) => row.enrollment_id === enrollment.id,
      );
      setAttendances(filteredAttendances);
    } catch {
      setInstallments([]);
      setAttendances([]);
    } finally {
      setTabLoading(false);
    }
  }, [enrollment]);

  React.useEffect(() => {
    void loadCore();
  }, [loadCore]);

  React.useEffect(() => {
    if (enrollment) {
      void loadFinanceAndAttendance();
    }
  }, [enrollment, loadFinanceAndAttendance]);

  const handleDropAction = async () => {
    setDropPreflightLoading(true);
    setDropReason("");
    setDropNotes("");
    try {
      const preflight = await computeDropPreflight(enrollmentId);
      setDropConsequences(preflight.consequences);
      setDropOpen(true);
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در محاسبه پیامدها").detail,
      });
    } finally {
      setDropPreflightLoading(false);
    }
  };

  const handleDropConfirm = async () => {
    if (!dropReason.trim()) return;
    setDropLoading(true);
    try {
      const updated = await dropEnrollment(enrollmentId, {
        reason: dropReason.trim(),
        notes: dropNotes.trim() || null,
      });
      setEnrollment(updated);
      setDropOpen(false);
      toast({ variant: "success", title: "ثبت‌نام لغو شد" });
      await loadFinanceAndAttendance();
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در لغو ثبت‌نام").detail,
      });
    } finally {
      setDropLoading(false);
    }
  };

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
      await loadFinanceAndAttendance();
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در ثبت پرداخت").detail,
      });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <T1DetailSkeleton
        title="…"
        tabs={[
          {
            id: "overview",
            label: "اطلاعات کلی",
            content: <BlockSkeleton height="200px" width="100%" />,
          },
        ]}
        secondary={<BlockSkeleton height="120px" width="100%" />}
      />
    );
  }

  if (error || !enrollment || !person || !courseClass) {
    return <ErrorState error={error ?? toApiError(null)} />;
  }

  const headerTitle = `${courseClass.name} — ${person.full_name}`;

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
        statusAction={
          readOnly ? (
            <StatusBadge domain="enrollment" value={enrollment.status} />
          ) : (
            <StatusAction
              entity="enrollment"
              status={enrollment.status}
              onAction={(action) => {
                if (action === "drop") {
                  void handleDropAction();
                }
              }}
            />
          )
        }
        tabs={[
          {
            id: "overview",
            label: "اطلاعات کلی",
            content: (
              <div className="flex flex-col gap-[var(--semantic-space-sectionGap)]">
                <div className="grid gap-[var(--primitive-space-4)] md:grid-cols-2">
                  <FrozenField
                    variant="money"
                    label="قیمت ثبت‌شده"
                    value={enrollment.price_snapshot}
                    lockReason={MONEY_LOCK_REASON}
                  />
                  <FrozenField
                    variant="money"
                    label="تخفیف"
                    value={enrollment.discount_snapshot}
                    lockReason={MONEY_LOCK_REASON}
                  />
                  <FrozenField
                    variant="money"
                    label="مبلغ نهایی"
                    value={enrollment.final_amount}
                    lockReason={MONEY_LOCK_REASON}
                  />
                </div>
                <dl className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)]">
                  <div className="grid grid-cols-[minmax(6rem,8rem)_1fr] gap-[var(--primitive-space-3)] border-b border-[var(--semantic-color-surface-border)] py-[var(--primitive-space-3)]">
                    <dt className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                      وضعیت
                    </dt>
                    <dd>
                      <StatusBadge domain="enrollment" value={enrollment.status} />
                    </dd>
                  </div>
                  {enrollment.consultation_id != null ? (
                    <div className="py-[var(--primitive-space-3)]">
                      <RelationshipCard
                        label="مشاوره مرتبط"
                        title={`مشاوره #${enrollment.consultation_id}`}
                        subtitle={person.full_name}
                        href={`/people/${enrollment.person_id}`}
                      />
                    </div>
                  ) : null}
                </dl>
              </div>
            ),
          },
          {
            id: "invoice",
            label: "فاکتور و اقساط",
            content: invoiceId ? (
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
                      canPay && !readOnly ? (
                        <StatusAction
                          entity="installment"
                          status={row.status}
                          onAction={() => openPaymentDrawer(row)}
                        />
                      ) : (
                        <StatusBadge domain="installment" value={row.status} />
                      ),
                  },
                ]}
                data={{
                  ...emptyPage<InstallmentRead>(),
                  items: installments,
                  total_count: installments.length,
                }}
                loading={tabLoading}
                emptyMessage="قسطی یافت نشد"
              />
            ) : (
              <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                فاکتوری برای این ثبت‌نام صادر نشده است.
              </p>
            ),
          },
          {
            id: "attendance",
            label: "حضور و غیاب",
            content: (
              <DataTable
                columns={[
                  {
                    key: "session_date",
                    header: "تاریخ جلسه",
                    align: "end",
                    cell: (row) => formatDateDisplay(row.session_date),
                  },
                  {
                    key: "present",
                    header: "وضعیت",
                    cell: (row) => <PresenceBadge present={row.present} />,
                  },
                  { key: "notes", header: "یادداشت", cell: (row) => row.notes ?? "—" },
                ]}
                data={{
                  ...emptyPage<AttendanceRead>(),
                  items: attendances,
                  total_count: attendances.length,
                }}
                loading={tabLoading}
                emptyMessage="رکورد حضور و غیابی ثبت نشده"
              />
            ),
          },
          {
            id: "timeline",
            label: "تایم‌لاین",
            content: (
              <Timeline
                personId={enrollment.person_id}
                orgId={enrollment.org_id}
                useMock={false}
              />
            ),
          },
        ]}
        secondary={
          <div className="flex flex-col gap-[var(--primitive-space-3)]">
            <RelationshipCard
              label="شخص"
              title={person.full_name}
              subtitle={person.phone ?? person.email ?? undefined}
              href={`/people/${person.id}`}
            />
            <RelationshipCard
              label="کلاس"
              title={courseClass.name}
              subtitle={formatDateDisplay(courseClass.start_date)}
              href={`/classes/${courseClass.id}`}
            />
            {invoiceId ? (
              <RelationshipCard
                label="فاکتور"
                title={`فاکتور #${invoiceId}`}
                href={`/invoices/${invoiceId}`}
              />
            ) : null}
          </div>
        }
      />

      <ConfirmDialog
        tier={3}
        open={dropOpen}
        onOpenChange={setDropOpen}
        title="لغو ثبت‌نام"
        body="این عملیات غیرقابل بازگشت است. لطفاً دلیل لغو را وارد کنید."
        confirmLabel="لغو ثبت‌نام"
        confirmLoading={dropLoading || dropPreflightLoading}
        confirmDisabled={!dropReason.trim()}
        onConfirm={() => void handleDropConfirm()}
        onCancel={() => setDropOpen(false)}
        consequences={dropConsequences}
      >
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <FormField label="دلیل" required>
            <Textarea
              value={dropReason}
              onChange={(e) => setDropReason(e.target.value)}
              rows={3}
            />
          </FormField>
          <FormField label="یادداشت (اختیاری)">
            <Textarea
              value={dropNotes}
              onChange={(e) => setDropNotes(e.target.value)}
              rows={2}
            />
          </FormField>
        </div>
      </ConfirmDialog>

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
          <FormField
            label="مبلغ پرداخت"
            required
            error={
              paymentAmount != null &&
              paymentAmount > 0 &&
              paymentAmount > paymentRemaining
                ? {
                    detail: "مبلغ از مانده بیشتر است",
                    error_code: "VALIDATION_ERROR",
                    timestamp: new Date().toISOString(),
                    field: "amount",
                  }
                : null
            }
          >
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
    </>
  );
}
