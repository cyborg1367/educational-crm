"use client";

import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { Textarea } from "@/components/form/textarea";
import type { ApiFieldError } from "@/lib/api/error";
import type { CourseRead } from "@/lib/api/types";
import {
  CONSULTATION_LEVEL_OPTIONS,
  CONSULTATION_MOTIVATION_OPTIONS,
} from "@/lib/terminology";

export type ConsultationAssessmentFormState = {
  current_level: string;
  goal: string;
  recommended_course_id: string;
  notes: string;
};

export function consultationToAssessmentFormState(
  consultation: {
    current_level: string | null;
    goal: string | null;
    recommended_course_id: number | null;
    notes: string | null;
  },
): ConsultationAssessmentFormState {
  return {
    current_level: consultation.current_level ?? "",
    goal: consultation.goal ?? "",
    recommended_course_id:
      consultation.recommended_course_id != null
        ? String(consultation.recommended_course_id)
        : "",
    notes: consultation.notes ?? "",
  };
}

export function assessmentFormStateToUpdateBody(
  state: ConsultationAssessmentFormState,
) {
  return {
    current_level: state.current_level || null,
    goal: state.goal || null,
    recommended_course_id: state.recommended_course_id
      ? Number(state.recommended_course_id)
      : null,
    notes: state.notes.trim() || null,
  };
}

export type ConsultationAssessmentFieldsProps = {
  formState: ConsultationAssessmentFormState;
  onChange: (patch: Partial<ConsultationAssessmentFormState>) => void;
  courses: CourseRead[];
  fieldError?: ApiFieldError | null;
  disabled?: boolean;
};

export function ConsultationAssessmentFields({
  formState,
  onChange,
  courses,
  fieldError,
  disabled = false,
}: ConsultationAssessmentFieldsProps) {
  return (
    <div className="flex flex-col gap-[var(--primitive-space-4)]">
      <FormField
        label="سطح دانش"
        error={fieldError?.field === "current_level" ? fieldError : null}
      >
        <Select
          inputSize="lg"
          options={CONSULTATION_LEVEL_OPTIONS}
          value={formState.current_level}
          onChange={(value) => onChange({ current_level: value })}
          placeholder="انتخاب سطح"
          disabled={disabled}
        />
      </FormField>

      <FormField label="انگیزه" error={fieldError?.field === "goal" ? fieldError : null}>
        <Select
          inputSize="lg"
          options={CONSULTATION_MOTIVATION_OPTIONS}
          value={formState.goal}
          onChange={(value) => onChange({ goal: value })}
          placeholder="انتخاب انگیزه"
          disabled={disabled}
        />
      </FormField>

      <FormField
        label="دوره پیشنهادی"
        error={
          fieldError?.field === "recommended_course_id" ? fieldError : null
        }
      >
        <Select
          searchable
          inputSize="lg"
          options={courses.map((course) => ({
            value: String(course.id),
            label: course.title,
          }))}
          value={formState.recommended_course_id}
          onChange={(value) => onChange({ recommended_course_id: value })}
          placeholder="انتخاب دوره"
          disabled={disabled}
        />
      </FormField>

      <FormField label="یادداشت مشاور" error={fieldError?.field === "notes" ? fieldError : null}>
        <Textarea
          value={formState.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="یادداشت آزاد درباره دانش‌پذیر..."
          disabled={disabled}
          rows={4}
        />
      </FormField>
    </div>
  );
}
