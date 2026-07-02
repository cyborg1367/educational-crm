"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/domain";
import { ErrorState, useToast } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { Textarea } from "@/components/form/textarea";
import { Breadcrumb } from "@/components/layout";
import { WizardSkeleton } from "@/components/skeletons";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import {
  getConsultation,
  setConsultationOutcome,
  updateConsultation,
} from "@/lib/api/consultations";
import { getCourse, listClasses } from "@/lib/api/finance";
import { getPerson, listDepartments } from "@/lib/api/people";
import type {
  ConsultationOutcome,
  ConsultationRead,
  CourseClassRead,
  CourseRead,
  DepartmentRead,
  PersonRead,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  CONSULTATION_OUTCOME_OPTIONS,
} from "@/lib/terminology";

const WIZARD_STEPS = [
  { id: "context", label: "انتخاب نتیجه" },
  { id: "details", label: "جزئیات" },
] as const;

const DEFAULT_OUTCOME: ConsultationOutcome = "pre_enroll";

function findEarliestOpenClass(
  classes: CourseClassRead[],
  courseId: number,
): CourseClassRead | null {
  return (
    classes
      .filter(
        (cls) =>
          cls.course_id === courseId &&
          (cls.status === "planned" || cls.status === "active"),
      )
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null
  );
}

function KeyValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(6rem,8rem)_1fr] gap-[var(--primitive-space-3)] border-b border-[var(--semantic-color-surface-border)] py-[var(--primitive-space-3)] last:border-b-0">
      <dt className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
        {label}
      </dt>
      <dd className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-primary)]">
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default function ConsultationOutcomeWizardPage() {
  const params = useParams<{ id: string; consultationId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const personId = Number(params.id);
  const consultationId = Number(params.consultationId);

  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [person, setPerson] = React.useState<PersonRead | null>(null);
  const [consultation, setConsultation] = React.useState<ConsultationRead | null>(
    null,
  );
  const [recommendedCourse, setRecommendedCourse] =
    React.useState<CourseRead | null>(null);
  const [openClasses, setOpenClasses] = React.useState<CourseClassRead[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentRead[]>([]);

  const [outcome, setOutcome] = React.useState<ConsultationOutcome>(DEFAULT_OUTCOME);
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [referDepartmentId, setReferDepartmentId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!Number.isFinite(personId) || !Number.isFinite(consultationId)) {
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
      const [personData, consultationData, classRes, deptRes] =
        await Promise.all([
          getPerson(personId),
          getConsultation(consultationId),
          listClasses({ limit: 500 }),
          listDepartments({ limit: 100 }),
        ]);

      if (consultationData.person_id !== personId) {
        setError({
          detail: "مشاوره به این شخص تعلق ندارد",
          error_code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      const open = classRes.items.filter(
        (cls) => cls.status === "planned" || cls.status === "active",
      );

      let course: CourseRead | null = null;
      if (consultationData.recommended_course_id != null) {
        course = await getCourse(consultationData.recommended_course_id);
        const defaultClass = findEarliestOpenClass(
          open,
          consultationData.recommended_course_id,
        );
        if (defaultClass) {
          setSelectedClassId(String(defaultClass.id));
        }
      }

      setPerson(personData);
      setConsultation(consultationData);
      setRecommendedCourse(course);
      setOpenClasses(open);
      setDepartments(deptRes.items);
      setOutcome(DEFAULT_OUTCOME);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری مشاوره"));
    } finally {
      setLoading(false);
    }
  }, [personId, consultationId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const classOptions = React.useMemo(() => {
    const pool =
      consultation?.recommended_course_id != null
        ? openClasses.filter(
            (cls) => cls.course_id === consultation.recommended_course_id,
          )
        : openClasses;
    return pool.map((cls) => ({
      value: String(cls.id),
      label: cls.name,
    }));
  }, [openClasses, consultation?.recommended_course_id]);

  const canProceedStep1 = outcome.length > 0;

  const canSubmitStep2 = React.useMemo(() => {
    switch (outcome) {
      case "pre_enroll":
        return selectedClassId.length > 0;
      case "refer_other_dept":
        return referDepartmentId.length > 0;
      default:
        return true;
    }
  }, [outcome, selectedClassId, referDepartmentId]);

  const submitOutcome = async () => {
    if (!consultation) return;
    setSubmitting(true);
    setFieldError(null);
    try {
      if (outcome === "refer_other_dept") {
        await updateConsultation(consultation.id, {
          refer_to_department_id: Number(referDepartmentId),
        });
      }

      if (
        (outcome === "not_suitable" || outcome === "closed") &&
        notes.trim()
      ) {
        await updateConsultation(consultation.id, {
          notes: notes.trim(),
        });
      }

      await setConsultationOutcome(consultation.id, {
        outcome,
        class_id:
          outcome === "pre_enroll" ? Number(selectedClassId) : undefined,
      });

      toast({ variant: "success", title: "نتیجه مشاوره ثبت شد" });
      router.push(`/people/${personId}`);
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        toast({
          variant: "error",
          title: toApiError(err, "خطا در ثبت نتیجه").detail,
        });
      }
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    if (outcome === "pre_enroll") {
      setConfirmOpen(true);
      return;
    }

    void submitOutcome();
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.push(`/people/${personId}`);
    }
  };

  if (loading) {
    return (
      <WizardSkeleton
        title="تعیین نتیجه مشاوره"
        steps={WIZARD_STEPS.map((item) => ({ id: item.id, label: item.label }))}
        currentStep={0}
      >
        <p className="text-[var(--semantic-color-text-secondary)]">در حال بارگذاری…</p>
      </WizardSkeleton>
    );
  }

  if (error || !consultation || !person) {
    return <ErrorState error={error ?? toApiError(null)} />;
  }

  if (consultation.outcome != null) {
    return (
      <ErrorState
        error={{
          detail: "نتیجه این مشاوره قبلاً ثبت شده است",
          error_code: "CONFLICT",
          timestamp: new Date().toISOString(),
        }}
      />
    );
  }

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: "خانه", href: "/dashboard" },
          { label: "افراد", href: "/people" },
          { label: person.full_name, href: `/people/${personId}` },
          { label: "تعیین نتیجه مشاوره" },
        ]}
        className="mb-[var(--semantic-space-sectionGap)]"
      />

      <WizardSkeleton
        title="تعیین نتیجه مشاوره"
        steps={WIZARD_STEPS.map((item) => ({ id: item.id, label: item.label }))}
        currentStep={step}
        onBack={handleBack}
        onNext={handleNext}
        nextDisabled={
          step === 0 ? !canProceedStep1 : !canSubmitStep2 || submitting
        }
        isLastStep={step === WIZARD_STEPS.length - 1}
      >
        {step === 0 ? (
          <div className="flex flex-col gap-[var(--semantic-space-sectionGap)]">
            <dl className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)]">
              <KeyValueRow
                label="سطح فعلی"
                value={consultation.current_level}
              />
              <KeyValueRow label="هدف" value={consultation.goal} />
              <KeyValueRow
                label="دوره پیشنهادی"
                value={recommendedCourse?.title ?? "—"}
              />
            </dl>

            <FormField
              label="نتیجه مشاوره"
              required
              error={fieldError?.field === "outcome" ? fieldError : null}
            >
              <div
                className={cn(
                  "rounded-[var(--primitive-radius-md)]",
                  outcome === DEFAULT_OUTCOME &&
                    "bg-[color-mix(in_srgb,var(--semantic-color-status-info)_8%,var(--semantic-color-surface-card))] p-[var(--primitive-space-2)]",
                )}
              >
                <Select
                  inputSize="lg"
                  options={CONSULTATION_OUTCOME_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  value={outcome}
                  onChange={(value) =>
                    setOutcome(value as ConsultationOutcome)
                  }
                />
                {outcome === DEFAULT_OUTCOME ? (
                  <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                    پیشنهاد در دسترس نیست
                  </p>
                ) : null}
              </div>
            </FormField>
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--semantic-space-sectionGap)]">
            {outcome === "pre_enroll" ? (
              <FormField
                label="کلاس"
                required
                error={fieldError?.field === "class_id" ? fieldError : null}
              >
                <Select
                  searchable
                  inputSize="lg"
                  options={classOptions}
                  value={selectedClassId}
                  onChange={setSelectedClassId}
                  placeholder="جستجو و انتخاب کلاس"
                />
              </FormField>
            ) : null}

            {outcome === "follow_up" ? (
              <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                با ثبت این نتیجه، یک وظیفه پیگیری برای مشاور ایجاد می‌شود. آیا
                مطمئن هستید؟
              </p>
            ) : null}

            {outcome === "refer_other_dept" ? (
              <FormField
                label="دپارتمان مقصد"
                required
                error={
                  fieldError?.field === "refer_to_department_id"
                    ? fieldError
                    : null
                }
              >
                <Select
                  inputSize="lg"
                  options={departments.map((dept) => ({
                    value: String(dept.id),
                    label: dept.name,
                  }))}
                  value={referDepartmentId}
                  onChange={setReferDepartmentId}
                  placeholder="انتخاب دپارتمان"
                />
              </FormField>
            ) : null}

            {outcome === "not_suitable" || outcome === "closed" ? (
              <FormField
                label="یادداشت"
                error={fieldError?.field === "notes" ? fieldError : null}
              >
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                />
              </FormField>
            ) : null}
          </div>
        )}
      </WizardSkeleton>

      <ConfirmDialog
        tier={2}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="تأیید پیش‌ثبت‌نام"
        body="این عملیات یک ثبت‌نام و فاکتور ایجاد می‌کند. مطمئن هستید؟"
        confirmLabel="ثبت نهایی"
        confirmVariant="primary"
        confirmLoading={submitting}
        onConfirm={() => void submitOutcome()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
