"use client";

import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { Textarea } from "@/components/form/textarea";
import type { ApiFieldError } from "@/lib/api/error";
import type {
  ConsultationOutcome,
  CourseRead,
  DepartmentRead,
} from "@/lib/api/types";
import { CONSULTATION_WIZARD_OUTCOME_OPTIONS } from "@/lib/terminology";

export type ConsultationOutcomeFieldsProps = {
  outcome: ConsultationOutcome;
  onOutcomeChange: (outcome: ConsultationOutcome) => void;
  departments: DepartmentRead[];
  referDepartmentId: string;
  onReferDepartmentIdChange: (value: string) => void;
  courses: CourseRead[];
  recommendedCourseId: string;
  onRecommendedCourseIdChange: (value: string) => void;
  admissionNotes: string;
  onAdmissionNotesChange: (value: string) => void;
  fieldError?: ApiFieldError | null;
};

export function ConsultationOutcomeFields({
  outcome,
  onOutcomeChange,
  departments,
  referDepartmentId,
  onReferDepartmentIdChange,
  courses,
  recommendedCourseId,
  onRecommendedCourseIdChange,
  admissionNotes,
  onAdmissionNotesChange,
  fieldError,
}: ConsultationOutcomeFieldsProps) {
  return (
    <div className="flex flex-col gap-[var(--primitive-space-sectionGap)]">
      <FormField
        label="نتیجه مشاوره"
        required
        error={fieldError?.field === "outcome" ? fieldError : null}
      >
        <Select
          inputSize="lg"
          options={CONSULTATION_WIZARD_OUTCOME_OPTIONS}
          value={outcome}
          onChange={(value) => onOutcomeChange(value as ConsultationOutcome)}
        />
      </FormField>

      {outcome === "pre_enroll" ? (
        <FormField
          label="دوره پیشنهادی"
          required
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
            value={recommendedCourseId}
            onChange={onRecommendedCourseIdChange}
            placeholder="انتخاب دوره"
          />
        </FormField>
      ) : null}

      {outcome === "refer_other_dept" ? (
        <FormField
          label="دپارتمان مقصد"
          required
          error={
            fieldError?.field === "refer_to_department_id" ? fieldError : null
          }
        >
          <Select
            inputSize="lg"
            options={departments.map((dept) => ({
              value: String(dept.id),
              label: dept.name,
            }))}
            value={referDepartmentId}
            onChange={onReferDepartmentIdChange}
            placeholder="انتخاب دپارتمان"
          />
        </FormField>
      ) : null}

      <FormField
        label="یادداشت به کارشناس پذیرش"
        error={fieldError?.field === "notes" ? fieldError : null}
      >
        <Textarea
          value={admissionNotes}
          onChange={(event) => onAdmissionNotesChange(event.target.value)}
          placeholder="پیام به کارشناس پذیرش..."
          rows={4}
        />
      </FormField>
    </div>
  );
}
