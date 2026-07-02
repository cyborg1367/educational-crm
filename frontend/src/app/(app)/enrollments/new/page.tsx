"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ConfirmDialog } from "@/components/domain";
import { ErrorState, useToast } from "@/components/feedback";
import { DatePicker } from "@/components/form/date-picker";
import { FormField } from "@/components/form/form-field";
import { FrozenField } from "@/components/form/frozen-field";
import { MoneyInput } from "@/components/form/money-input";
import { Select } from "@/components/form/select";
import { Breadcrumb } from "@/components/layout";
import { WizardSkeleton } from "@/components/skeletons";
import { toApiError } from "@/lib/api/errors";
import type { ApiError } from "@/lib/api/error";
import {
  createEnrollment,
  createInvoice,
  getCourse,
  getPerson,
  listClasses,
} from "@/lib/api/finance";
import type {
  CourseClassRead,
  CourseRead,
  InstallmentPlanItem,
  PersonRead,
} from "@/lib/api/types";
import { canManageEnrollments } from "@/lib/auth/role";
import {
  addDaysToStorageDate,
  formatDateDisplay,
  formatToman,
  todayStorage,
} from "@/lib/locale";

type WizardInstallment = InstallmentPlanItem & { id: string };

const WIZARD_STEPS = [
  { id: "class", label: "انتخاب کلاس" },
  { id: "price", label: "بررسی قیمت" },
  { id: "installments", label: "برنامه اقساط" },
] as const;

function defaultInstallments(finalAmount: number): WizardInstallment[] {
  const today = todayStorage();
  const half = Math.floor(finalAmount / 2);
  const remainder = finalAmount - half;
  return [
    {
      id: "1",
      sequence: 1,
      amount: half,
      due_date: addDaysToStorageDate(today, 30),
    },
    {
      id: "2",
      sequence: 2,
      amount: remainder,
      due_date: addDaysToStorageDate(today, 60),
    },
  ];
}

export default function NewEnrollmentPage() {
  return (
    <React.Suspense
      fallback={
        <WizardSkeleton
          title="ثبت‌نام جدید"
          steps={WIZARD_STEPS.map((item) => ({ id: item.id, label: item.label }))}
          currentStep={0}
        >
          <p className="text-[var(--semantic-color-text-secondary)]">در حال بارگذاری…</p>
        </WizardSkeleton>
      }
    >
      <NewEnrollmentWizard />
    </React.Suspense>
  );
}

function NewEnrollmentWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const personId = Number(searchParams.get("person_id"));
  const readOnly = !canManageEnrollments();

  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [person, setPerson] = React.useState<PersonRead | null>(null);
  const [classes, setClasses] = React.useState<CourseClassRead[]>([]);
  const [coursesById, setCoursesById] = React.useState<Map<number, CourseRead>>(
    new Map(),
  );

  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [selectedCourse, setSelectedCourse] = React.useState<CourseRead | null>(
    null,
  );
  const [discount, setDiscount] = React.useState<number>(0);
  const [installments, setInstallments] = React.useState<WizardInstallment[]>(
    [],
  );

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedClass = React.useMemo(
    () => classes.find((cls) => String(cls.id) === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const priceSnapshot = selectedCourse?.current_price ?? 0;
  const finalAmount = Math.max(0, priceSnapshot - (discount ?? 0));
  const installmentSum = installments.reduce((sum, row) => sum + row.amount, 0);
  const installmentSumValid = installmentSum === finalAmount && finalAmount > 0;

  const loadInitial = React.useCallback(async () => {
    if (!Number.isFinite(personId)) {
      setError({
        detail: "شناسه شخص الزامی است",
        error_code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
        field: "person_id",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [personData, classesRes] = await Promise.all([
        getPerson(personId),
        listClasses({ limit: 500 }),
      ]);
      const openClasses = classesRes.items.filter(
        (cls) => cls.status === "planned" || cls.status === "active",
      );
      setPerson(personData);
      setClasses(openClasses);

      const courseIds = [...new Set(openClasses.map((cls) => cls.course_id))];
      const courses = await Promise.all(courseIds.map((id) => getCourse(id)));
      setCoursesById(new Map(courses.map((course) => [course.id, course])));
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری اطلاعات"));
    } finally {
      setLoading(false);
    }
  }, [personId]);

  React.useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  React.useEffect(() => {
    if (!selectedClass) {
      setSelectedCourse(null);
      return;
    }
    setSelectedCourse(coursesById.get(selectedClass.course_id) ?? null);
  }, [selectedClass, coursesById]);

  const classOptions = classes.map((cls) => {
    const course = coursesById.get(cls.course_id);
    return {
      value: String(cls.id),
      label: `${cls.name} — ${course?.title ?? "—"} — ${formatDateDisplay(cls.start_date)}`,
    };
  });

  const discountValid = discount >= 0 && discount <= priceSnapshot;
  const step1Valid = Boolean(selectedClassId);
  const step2Valid = priceSnapshot > 0 && discountValid;

  const handleNext = () => {
    if (step === 1) {
      setInstallments(defaultInstallments(finalAmount));
      setStep(2);
      return;
    }
    if (step === 2) {
      setConfirmOpen(true);
      return;
    }
    setStep((current) => current + 1);
  };

  const handleSubmit = async () => {
    if (!person || !selectedClass || !installmentSumValid) return;
    setSubmitting(true);
    try {
      const enrollment = await createEnrollment({
        person_id: person.id,
        class_id: selectedClass.id,
        discount_snapshot: discount,
        status: "pre_enroll",
      });

      await createInvoice({
        enrollment_id: enrollment.id,
        installments: installments.map(({ sequence, amount, due_date }) => ({
          sequence,
          amount,
          due_date,
        })),
      });

      toast({ variant: "success", title: "ثبت‌نام و فاکتور ایجاد شد" });
      setConfirmOpen(false);
      router.push(`/enrollments/${enrollment.id}`);
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در ثبت‌نام").detail,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateInstallment = (
    id: string,
    patch: Partial<Pick<WizardInstallment, "amount" | "due_date">>,
  ) => {
    setInstallments((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  if (readOnly) {
    return (
      <ErrorState
        error={{
          detail: "نقش شما اجازه ایجاد ثبت‌نام را ندارد",
          error_code: "PERMISSION_DENIED",
          timestamp: new Date().toISOString(),
        }}
      />
    );
  }

  if (loading) {
    return (
      <WizardSkeleton
        title="ثبت‌نام جدید"
        steps={WIZARD_STEPS.map((item) => ({ id: item.id, label: item.label }))}
        currentStep={0}
      >
        <p className="text-[var(--semantic-color-text-secondary)]">در حال بارگذاری…</p>
      </WizardSkeleton>
    );
  }

  if (error || !person) {
    return <ErrorState error={error ?? toApiError(null)} />;
  }

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: "خانه", href: "/dashboard" },
          { label: "افراد", href: "/people" },
          { label: person.full_name, href: `/people/${person.id}` },
          { label: "ثبت‌نام جدید" },
        ]}
        className="mb-[var(--semantic-space-sectionGap)]"
      />

      <WizardSkeleton
        title={`ثبت‌نام جدید — ${person.full_name}`}
        steps={WIZARD_STEPS.map((item) => ({ id: item.id, label: item.label }))}
        currentStep={step}
        onBack={() => setStep((current) => Math.max(0, current - 1))}
        onNext={handleNext}
        nextDisabled={
          step === 0
            ? !step1Valid
            : step === 1
              ? !step2Valid
              : !installmentSumValid
        }
        isLastStep={step === 2}
      >
        {step === 0 ? (
          <FormField label="کلاس" required>
            <Select
              searchable
              options={classOptions}
              value={selectedClassId}
              onChange={setSelectedClassId}
              placeholder="جستجو و انتخاب کلاس"
            />
          </FormField>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-[var(--primitive-space-4)]">
            <FrozenField
              variant="money"
              label="قیمت دوره (ثبت‌شده در فاکتور)"
              value={priceSnapshot}
              lockReason="این مبلغ در زمان ثبت‌نام به‌عنوان price_snapshot ذخیره می‌شود"
            />
            <FormField
              label="تخفیف"
              error={
                !discountValid
                  ? {
                      detail: "تخفیف نمی‌تواند بیشتر از قیمت باشد",
                      error_code: "VALIDATION_ERROR",
                      timestamp: new Date().toISOString(),
                      field: "discount_snapshot",
                    }
                  : null
              }
            >
              <MoneyInput
                value={discount}
                onValueChange={(value) => setDiscount(value ?? 0)}
                error={!discountValid}
              />
            </FormField>
            <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] p-[var(--primitive-space-4)]">
              <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                مبلغ نهایی
              </p>
              <p className="mt-[var(--primitive-space-1)] text-end text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)]">
                {formatToman(finalAmount)}
              </p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-[var(--primitive-space-4)]">
            {installments.map((row) => (
              <div
                key={row.id}
                className="grid gap-[var(--primitive-space-3)] rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] p-[var(--primitive-space-4)] md:grid-cols-3"
              >
                <FormField label={`قسط ${row.sequence}`}>
                  <MoneyInput
                    value={row.amount}
                    onValueChange={(value) =>
                      updateInstallment(row.id, { amount: value ?? 0 })
                    }
                  />
                </FormField>
                <FormField label="سررسید" className="md:col-span-2">
                  <DatePicker
                    value={row.due_date}
                    onChange={(value) => {
                      if (value) {
                        updateInstallment(row.id, { due_date: value });
                      }
                    }}
                  />
                </FormField>
              </div>
            ))}

            <div className="flex flex-col gap-[var(--primitive-space-2)]">
              <p className="text-end text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                جمع اقساط: {formatToman(installmentSum)} / مبلغ نهایی:{" "}
                {formatToman(finalAmount)}
              </p>
              {!installmentSumValid ? (
                <p
                  role="alert"
                  className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-status-danger)]"
                >
                  جمع اقساط باید برابر مبلغ نهایی باشد
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </WizardSkeleton>

      <ConfirmDialog
        tier={2}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="تأیید ثبت‌نام"
        body="این عملیات یک ثبت‌نام و فاکتور ایجاد می‌کند"
        confirmLabel="ثبت نهایی"
        confirmVariant="primary"
        confirmLoading={submitting}
        onConfirm={() => void handleSubmit()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
