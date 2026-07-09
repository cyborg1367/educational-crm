"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  ConsultationAssessmentFields,
  assessmentFormStateToUpdateBody,
  consultationToAssessmentFormState,
  type ConsultationAssessmentFormState,
} from "@/components/domain/consultation-assessment-fields";
import { ConsultationOutcomeFields } from "@/components/domain/consultation-outcome-fields";
import { StatusBadge } from "@/components/domain/status-badge";
import { ErrorState, useToast } from "@/components/feedback";
import { Breadcrumb } from "@/components/layout";
import { WizardSkeleton } from "@/components/skeletons";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { listCourses } from "@/lib/api/courses";
import {
  getConsultation,
  setConsultationOutcome,
  updateConsultation,
} from "@/lib/api/consultations";
import { getCourse } from "@/lib/api/finance";
import { getPerson, listDepartments } from "@/lib/api/people";
import { getMe } from "@/lib/api/users";
import type {
  ConsultationOutcome,
  ConsultationRead,
  CourseRead,
  DepartmentRead,
  PersonRead,
  UserRead,
} from "@/lib/api/types";
import { canConductConsultation } from "@/lib/auth/role";
import { formatDateDisplay, formatDateTimeDisplay } from "@/lib/locale/date";
import { formatPhoneDisplay } from "@/lib/locale/number";
import {
  CONSULTATION_OUTCOME_LABELS,
  levelLabel,
  motivationLabel,
  statusDisplayLabel,
} from "@/lib/terminology";

const WIZARD_STEPS = [
  { id: "context", label: "زمینه" },
  { id: "assessment", label: "ارزیابی" },
  { id: "outcome", label: "نتیجه" },
] as const;

const DEFAULT_OUTCOME: ConsultationOutcome = "pre_enroll";

function parseInitialStep(raw: string | null): number {
  if (raw === "outcome" || raw === "2") return 2;
  if (raw === "assessment" || raw === "1") return 1;
  return 0;
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const personId = Number(params.id);
  const consultationId = Number(params.consultationId);

  const [step, setStep] = React.useState(() =>
    parseInitialStep(searchParams.get("step")),
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [person, setPerson] = React.useState<PersonRead | null>(null);
  const [consultation, setConsultation] = React.useState<ConsultationRead | null>(
    null,
  );
  const [me, setMe] = React.useState<UserRead | null>(null);
  const [courses, setCourses] = React.useState<CourseRead[]>([]);
  const [recommendedCourse, setRecommendedCourse] =
    React.useState<CourseRead | null>(null);
  const [departments, setDepartments] = React.useState<DepartmentRead[]>([]);

  const [assessmentForm, setAssessmentForm] =
    React.useState<ConsultationAssessmentFormState>(
      consultationToAssessmentFormState({
        current_level: null,
        goal: null,
        recommended_course_id: null,
        notes: null,
      }),
    );

  const [outcome, setOutcome] = React.useState<ConsultationOutcome>(DEFAULT_OUTCOME);
  const [referDepartmentId, setReferDepartmentId] = React.useState("");
  const [admissionNotes, setAdmissionNotes] = React.useState("");
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);
  const [savingAssessment, setSavingAssessment] = React.useState(false);
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
      const [personData, consultationData, deptRes, meData, courseRes] =
        await Promise.all([
          getPerson(personId),
          getConsultation(consultationId),
          listDepartments({ limit: 100 }),
          getMe(),
          listCourses({ is_active: true, limit: 500 }),
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

      let course: CourseRead | null = null;
      if (consultationData.recommended_course_id != null) {
        course = await getCourse(consultationData.recommended_course_id);
      }

      const deptCourses = courseRes.items.filter(
        (item) => item.department_id === consultationData.department_id,
      );

      setPerson(personData);
      setConsultation(consultationData);
      setMe(meData);
      setRecommendedCourse(course);
      setDepartments(deptRes.items);
      setCourses(deptCourses);
      setAssessmentForm(consultationToAssessmentFormState(consultationData));
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری مشاوره"));
    } finally {
      setLoading(false);
    }
  }, [personId, consultationId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const canEdit =
    consultation != null &&
    me != null &&
    canConductConsultation(consultation, me);

  const canSubmitOutcome =
    outcome !== "refer_other_dept" || referDepartmentId.length > 0;

  const saveAssessment = async (): Promise<boolean> => {
    if (!consultation) return false;
    setSavingAssessment(true);
    setFieldError(null);
    try {
      const updated = await updateConsultation(
        consultation.id,
        assessmentFormStateToUpdateBody(assessmentForm),
      );
      setConsultation(updated);
      setAssessmentForm(consultationToAssessmentFormState(updated));
      if (updated.recommended_course_id != null) {
        const course = await getCourse(updated.recommended_course_id);
        setRecommendedCourse(course);
      }
      toast({ variant: "success", title: "ارزیابی ذخیره شد" });
      return true;
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        toast({
          variant: "error",
          title: toApiError(err, "خطا در ذخیره ارزیابی").detail,
        });
      }
      return false;
    } finally {
      setSavingAssessment(false);
    }
  };

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

      await setConsultationOutcome(consultation.id, {
        outcome,
        notes: admissionNotes.trim() || undefined,
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
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    if (step === 1) {
      const saved = await saveAssessment();
      if (!saved) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      void submitOutcome();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setFieldError(null);
    } else {
      router.push(`/people/${personId}`);
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= step) {
      setStep(targetStep);
      setFieldError(null);
    }
  };

  if (loading) {
    return (
      <WizardSkeleton
        title="مشاوره"
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
      <>
        <Breadcrumb
          crumbs={[
            { label: "خانه", href: "/dashboard" },
            { label: "افراد", href: "/people" },
            { label: person.full_name, href: `/people/${personId}` },
            { label: "مشاوره" },
          ]}
          className="mb-[var(--semantic-space-sectionGap)]"
        />
        <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-5)]">
          <div className="mb-[var(--primitive-space-4)] flex items-center gap-[var(--primitive-space-2)]">
            <h1 className="text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)]">
              مشاوره #{consultation.id}
            </h1>
            <StatusBadge domain="consultation" value={consultation.outcome} />
          </div>
          <dl className="px-[var(--primitive-space-2)]">
            <KeyValueRow
              label="سطح"
              value={
                consultation.current_level
                  ? levelLabel(consultation.current_level)
                  : null
              }
            />
            <KeyValueRow
              label="انگیزه"
              value={consultation.goal ? motivationLabel(consultation.goal) : null}
            />
            <KeyValueRow
              label="دوره پیشنهادی"
              value={recommendedCourse?.title ?? "—"}
            />
            <KeyValueRow
              label="نتیجه"
              value={CONSULTATION_OUTCOME_LABELS[consultation.outcome]}
            />
            <KeyValueRow
              label="تاریخ"
              value={formatDateTimeDisplay(consultation.updated_at)}
            />
          </dl>
          <Link
            href={`/people/${personId}`}
            className="mt-[var(--primitive-space-4)] inline-block text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-link)]"
          >
            بازگشت به پرونده شخص
          </Link>
        </div>
      </>
    );
  }

  if (!canEdit) {
    return (
      <ErrorState
        error={{
          detail: "شما مجاز به انجام این مشاوره نیستید",
          error_code: "PERMISSION_DENIED",
          timestamp: new Date().toISOString(),
        }}
      />
    );
  }

  const nextDisabled =
    step === 1
      ? savingAssessment
      : step === 2
        ? !canSubmitOutcome || submitting
        : false;

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: "خانه", href: "/dashboard" },
          { label: "افراد", href: "/people" },
          { label: person.full_name, href: `/people/${personId}` },
          { label: "مشاوره" },
        ]}
        className="mb-[var(--semantic-space-sectionGap)]"
      />

      <WizardSkeleton
        title="مشاوره"
        steps={WIZARD_STEPS.map((item) => ({ id: item.id, label: item.label }))}
        currentStep={step}
        onBack={handleBack}
        onStepClick={handleStepClick}
        onNext={() => void handleNext()}
        nextDisabled={nextDisabled}
        nextLabel={
          step === 1
            ? savingAssessment
              ? "در حال ذخیره…"
              : "ذخیره و ادامه"
            : step === 2
              ? submitting
                ? "در حال ثبت…"
                : "ثبت نهایی"
              : "ادامه"
        }
        isLastStep={step === WIZARD_STEPS.length - 1}
      >
        {step === 0 ? (
          <div className="flex flex-col gap-[var(--primitive-space-sectionGap)]">
            <dl className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)]">
              <KeyValueRow label="نام" value={person.full_name} />
              <KeyValueRow
                label="تلفن"
                value={person.phone ? formatPhoneDisplay(person.phone) : null}
              />
              <KeyValueRow
                label="وضعیت"
                value={statusDisplayLabel("person", person.status)}
              />
              <KeyValueRow
                label="یادداشت ارجاع"
                value={consultation.notes?.trim() || "—"}
              />
              <KeyValueRow
                label="تاریخ ارجاع"
                value={formatDateDisplay(consultation.created_at.slice(0, 10))}
              />
            </dl>
            <Link
              href={`/people/${personId}`}
              className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-link)]"
            >
              مشاهده پرونده کامل
            </Link>
          </div>
        ) : null}

        {step === 1 ? (
          <ConsultationAssessmentFields
            formState={assessmentForm}
            onChange={(patch) =>
              setAssessmentForm((prev) => ({ ...prev, ...patch }))
            }
            courses={courses}
            fieldError={fieldError}
          />
        ) : null}

        {step === 2 ? (
          <ConsultationOutcomeFields
            outcome={outcome}
            onOutcomeChange={setOutcome}
            departments={departments}
            referDepartmentId={referDepartmentId}
            onReferDepartmentIdChange={setReferDepartmentId}
            admissionNotes={admissionNotes}
            onAdmissionNotesChange={setAdmissionNotes}
            fieldError={fieldError}
          />
        ) : null}
      </WizardSkeleton>
    </>
  );
}
