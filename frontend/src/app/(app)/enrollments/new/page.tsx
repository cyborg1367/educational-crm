"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ConfirmDialog } from "@/components/domain";
import { EnrollmentPaymentPlanFields } from "@/components/domain/enrollment-payment-plan-fields";
import { ErrorState, useToast } from "@/components/feedback";
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
import { updateTask } from "@/lib/api/tasks";
import type {
  CourseClassRead,
  CourseRead,
  PersonRead,
} from "@/lib/api/types";
import { canManageEnrollments } from "@/lib/auth/role";
import {
  emptyPaymentPlanState,
  isPaymentPlanValid,
  paymentPlanToInvoiceInstallments,
  type PaymentPlanState,
} from "@/lib/enrollment/payment-plan";
import {
  formatDateDisplay,
  formatToman,
} from "@/lib/locale";

const WIZARD_STEPS = [
  { id: "class", label: "انتخاب کلاس" },
  { id: "price", label: "بررسی قیمت" },
  { id: "installments", label: "برنامه پرداخت" },
] as const;

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
  const taskIdRaw = searchParams.get("task_id");
  const taskId =
    taskIdRaw != null && taskIdRaw !== "" ? Number(taskIdRaw) : null;
  const courseIdRaw = searchParams.get("course_id");
  const courseId =
    courseIdRaw != null && courseIdRaw !== "" ? Number(courseIdRaw) : null;
  const readOnly = !canManageEnrollments();

  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [person, setPerson] = React.useState<PersonRead | null>(null);
  const [classes, setClasses] = React.useState<CourseClassRead[]>([]);
  const [coursesById, setCoursesById] = React.useState<Map<number, CourseRead>>(
    new Map(),
  );
  const [recommendedCourseName, setRecommendedCourseName] = React.useState<
    string | null
  >(null);

  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [selectedCourse, setSelectedCourse] = React.useState<CourseRead | null>(
    null,
  );
  const [discount, setDiscount] = React.useState<number>(0);
  const [paymentPlan, setPaymentPlan] = React.useState<PaymentPlanState>(
    emptyPaymentPlanState(0),
  );

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedClass = React.useMemo(
    () => classes.find((cls) => String(cls.id) === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const priceSnapshot = selectedCourse?.current_price ?? 0;
  const finalAmount = Math.max(0, priceSnapshot - (discount ?? 0));
  const paymentPlanValid = isPaymentPlanValid(paymentPlan, finalAmount);

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
      let openClasses = classesRes.items.filter(
        (cls) => cls.status === "planned" || cls.status === "active",
      );

      if (courseId != null && Number.isFinite(courseId)) {
        openClasses = openClasses.filter((cls) => cls.course_id === courseId);
        try {
          const recommendedCourse = await getCourse(courseId);
          setRecommendedCourseName(recommendedCourse.title);
        } catch {
          setRecommendedCourseName(null);
        }
      } else {
        setRecommendedCourseName(null);
      }

      setPerson(personData);
      setClasses(openClasses);

      if (openClasses.length === 1) {
        setSelectedClassId(String(openClasses[0].id));
      }

      const courseIds = [...new Set(openClasses.map((cls) => cls.course_id))];
      const courses = await Promise.all(courseIds.map((id) => getCourse(id)));
      setCoursesById(new Map(courses.map((course) => [course.id, course])));
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری اطلاعات"));
    } finally {
      setLoading(false);
    }
  }, [personId, courseId]);

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
      setPaymentPlan(emptyPaymentPlanState(finalAmount));
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
    if (!person || !selectedClass || !paymentPlanValid) return;
    setSubmitting(true);
    try {
      const enrollment = await createEnrollment({
        person_id: person.id,
        class_id: selectedClass.id,
        discount_snapshot: discount,
        status: "pre_enroll",
        defer_timeline_log: true,
      });

      await createInvoice({
        enrollment_id: enrollment.id,
        installments: paymentPlanToInvoiceInstallments(paymentPlan),
        record_upfront_payment: true,
      });

      if (taskId != null && Number.isFinite(taskId)) {
        await updateTask(taskId, { status: "done" });
        toast({
          variant: "success",
          title: "ثبت‌نام با موفقیت انجام شد و وظیفه تکمیل شد",
        });
      } else {
        toast({ variant: "success", title: "ثبت‌نام و فاکتور ایجاد شد" });
      }

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
              : !paymentPlanValid
        }
        isLastStep={step === 2}
      >
        {step === 0 ? (
          <div className="flex flex-col gap-[var(--primitive-space-4)]">
            <FrozenField
              variant="text"
              label="دانش‌پذیر"
              value={person.full_name}
              lockReason="دانش‌پذیر از وظیفه پیگیری ثبت‌نام انتخاب شده و قابل تغییر نیست"
            />
            {recommendedCourseName ? (
              <p className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                دوره پیشنهادی از مشاوره:{" "}
                <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                  {recommendedCourseName}
                </span>
              </p>
            ) : null}
            <FormField label="کلاس" required>
              <Select
                searchable
                options={classOptions}
                value={selectedClassId}
                onChange={setSelectedClassId}
                placeholder="جستجو و انتخاب کلاس"
              />
            </FormField>
          </div>
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
          <EnrollmentPaymentPlanFields
            finalAmount={finalAmount}
            priceSnapshot={priceSnapshot}
            discount={discount}
            state={paymentPlan}
            onChange={setPaymentPlan}
          />
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
