"use client";

import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { Textarea } from "@/components/form/textarea";
import type { ApiFieldError } from "@/lib/api/error";
import {
  CONSULTATION_LEVEL_OPTIONS,
  CONSULTATION_MOTIVATION_OPTIONS,
} from "@/lib/terminology";

export type ConsultationAssessmentFormState = {
  current_level: string;
  goal: string;
  notes: string;
};

export function consultationToAssessmentFormState(
  consultation: {
    current_level: string | null;
    goal: string | null;
    notes: string | null;
  },
): ConsultationAssessmentFormState {
  return {
    current_level: consultation.current_level ?? "",
    goal: consultation.goal ?? "",
    notes: consultation.notes ?? "",
  };
}

export function assessmentFormStateToUpdateBody(
  state: ConsultationAssessmentFormState,
) {
  return {
    current_level: state.current_level || null,
    goal: state.goal || null,
    notes: state.notes.trim() || null,
  };
}

export type ConsultationAssessmentFieldsProps = {
  formState: ConsultationAssessmentFormState;
  onChange: (patch: Partial<ConsultationAssessmentFormState>) => void;
  fieldError?: ApiFieldError | null;
  disabled?: boolean;
};

export function ConsultationAssessmentFields({
  formState,
  onChange,
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
