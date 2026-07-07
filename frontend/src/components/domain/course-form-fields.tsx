"use client";

import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { Checkbox } from "@/components/form/selection-control";
import { Select } from "@/components/form/select";
import { Textarea } from "@/components/form/textarea";
import { TextInput } from "@/components/form/text-input";
import { listCourses } from "@/lib/api/courses";
import type { ApiFieldError } from "@/lib/api/error";
import type {
  CourseCreate,
  CourseRead,
  CourseUpdate,
  DepartmentRead,
} from "@/lib/api/types";
import { sortDepartmentsByInstituteCatalog } from "@/lib/department/institute-departments";
import { formatCount } from "@/lib/locale";

export type CourseFormState = {
  title: string;
  departmentId: string;
  price: number | null;
  totalHours: string;
  sessionDuration: string;
  sessionsPerWeek: string;
  description: string;
  isActive: boolean;
  prerequisiteIds: number[];
};

export function emptyCourseFormState(
  departments: DepartmentRead[] = [],
): CourseFormState {
  const sorted = sortDepartmentsByInstituteCatalog(
    departments.filter((department) => department.is_active),
  );
  return {
    title: "",
    departmentId: sorted[0] ? String(sorted[0].id) : "",
    price: null,
    totalHours: "",
    sessionDuration: "",
    sessionsPerWeek: "",
    description: "",
    isActive: true,
    prerequisiteIds: [],
  };
}

function computeDurationSessions(state: CourseFormState): number | null {
  const totalHours = Number(state.totalHours);
  const sessionDuration = Number(state.sessionDuration);
  if (
    !state.totalHours ||
    !state.sessionDuration ||
    !Number.isFinite(totalHours) ||
    !Number.isFinite(sessionDuration) ||
    totalHours <= 0 ||
    sessionDuration <= 0
  ) {
    return null;
  }
  return Math.ceil(totalHours / sessionDuration);
}

export function courseFormStateToCreateBody(state: CourseFormState): CourseCreate {
  return {
    title: state.title.trim(),
    department_id: Number(state.departmentId),
    current_price: state.price ?? 0,
    total_hours: state.totalHours ? Number(state.totalHours) : null,
    session_duration: state.sessionDuration
      ? Number(state.sessionDuration)
      : null,
    sessions_per_week: state.sessionsPerWeek
      ? Number(state.sessionsPerWeek)
      : null,
    description: state.description.trim() || null,
    is_active: state.isActive,
    prerequisite_ids: state.prerequisiteIds,
  };
}

export function courseFormStateFromRead(course: CourseRead): CourseFormState {
  return {
    title: course.title,
    departmentId: String(course.department_id),
    price: course.current_price,
    totalHours: course.total_hours != null ? String(course.total_hours) : "",
    sessionDuration:
      course.session_duration != null ? String(course.session_duration) : "",
    sessionsPerWeek:
      course.sessions_per_week != null ? String(course.sessions_per_week) : "",
    description: course.description ?? "",
    isActive: course.is_active,
    prerequisiteIds: course.prerequisite_ids ?? [],
  };
}

export function courseFormStateToUpdateBody(
  state: CourseFormState,
): CourseUpdate {
  return courseFormStateToCreateBody(state);
}

export function isCourseFormValid(state: CourseFormState): boolean {
  return (
    Boolean(state.title.trim()) &&
    Boolean(state.departmentId) &&
    state.price != null &&
    state.price > 0
  );
}

export function computeCourseScheduleSummary(state: CourseFormState): {
  totalSessions: number;
  weeks: number;
} | null {
  const totalSessions = computeDurationSessions(state);
  const sessionsPerWeek = Number(state.sessionsPerWeek);
  if (
    totalSessions == null ||
    !state.sessionsPerWeek ||
    !Number.isFinite(sessionsPerWeek) ||
    sessionsPerWeek <= 0
  ) {
    return null;
  }
  const weeks = Math.ceil(totalSessions / sessionsPerWeek);
  return { totalSessions, weeks };
}

export type CourseFormFieldsProps = {
  state: CourseFormState;
  onChange: (patch: Partial<CourseFormState>) => void;
  departments: DepartmentRead[];
  editingCourseId?: number | null;
  fieldError?: ApiFieldError | null;
};

function CourseFormFields({
  state,
  onChange,
  departments,
  editingCourseId = null,
  fieldError = null,
}: CourseFormFieldsProps) {
  const [departmentCourses, setDepartmentCourses] = React.useState<CourseRead[]>(
    [],
  );
  const [coursesLoading, setCoursesLoading] = React.useState(false);

  const departmentOptions = sortDepartmentsByInstituteCatalog(
    departments.filter(
      (department) =>
        department.is_active || String(department.id) === state.departmentId,
    ),
  ).map((department) => ({
    value: String(department.id),
    label: department.name,
  }));

  const scheduleSummary = computeCourseScheduleSummary(state);
  const computedSessions = computeDurationSessions(state);

  React.useEffect(() => {
    if (!state.departmentId) {
      setDepartmentCourses([]);
      return;
    }
    let cancelled = false;
    setCoursesLoading(true);
    void listCourses({
      department_id: Number(state.departmentId),
      is_active: true,
      limit: 500,
    })
      .then((res) => {
        if (!cancelled) {
          setDepartmentCourses(res.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDepartmentCourses([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCoursesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.departmentId]);

  const prerequisiteOptions = departmentCourses
    .filter(
      (course) =>
        course.id !== editingCourseId &&
        !state.prerequisiteIds.includes(course.id),
    )
    .map((course) => ({
      value: String(course.id),
      label: course.title,
    }));

  const selectedPrerequisites = state.prerequisiteIds
    .map((id) => departmentCourses.find((course) => course.id === id))
    .filter((course): course is CourseRead => course != null);

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          اطلاعات دوره
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="عنوان"
            required
            className="md:col-span-2"
            error={fieldError?.field === "title" ? fieldError : null}
          >
            <TextInput
              value={state.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="مثلاً Python مقدماتی"
            />
          </FormField>

          <FormField
            label="دپارتمان"
            required
            error={fieldError?.field === "department_id" ? fieldError : null}
          >
            <Select
              options={departmentOptions}
              value={state.departmentId}
              onChange={(value) =>
                onChange({ departmentId: value, prerequisiteIds: [] })
              }
              placeholder={
                departmentOptions.length === 0
                  ? "ابتدا دپارتمان تعریف کنید"
                  : "انتخاب دپارتمان"
              }
              disabled={departmentOptions.length === 0}
            />
          </FormField>
        </div>

        {departmentOptions.length === 0 ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            برای ثبت دوره، ابتدا از منوی دپارتمان‌ها حداقل یک دپارتمان فعال
            بسازید.
          </p>
        ) : null}
      </section>

      {state.departmentId ? (
        <section className="flex flex-col gap-[var(--primitive-space-4)]">
          <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
            پیش‌نیازها
          </h3>

          <FormField
            label="پیش‌نیازهای این دوره"
            error={
              fieldError?.field === "prerequisite_ids" ? fieldError : null
            }
          >
            <div className="flex flex-col gap-[var(--primitive-space-3)]">
              <Select
                options={prerequisiteOptions}
                value=""
                onChange={(value) => {
                  if (!value) return;
                  const id = Number(value);
                  if (!state.prerequisiteIds.includes(id)) {
                    onChange({
                      prerequisiteIds: [...state.prerequisiteIds, id],
                    });
                  }
                }}
                placeholder={
                  coursesLoading
                    ? "در حال بارگذاری…"
                    : prerequisiteOptions.length === 0
                      ? "دوره‌ای برای انتخاب نیست"
                      : "افزودن پیش‌نیاز"
                }
                disabled={coursesLoading || prerequisiteOptions.length === 0}
              />
              {selectedPrerequisites.length > 0 ? (
                <div className="flex flex-wrap gap-[var(--primitive-space-2)]">
                  {selectedPrerequisites.map((course) => (
                    <span
                      key={course.id}
                      className="inline-flex items-center gap-[var(--primitive-space-1)] rounded-[var(--primitive-radius-full)] border border-[#E87722] bg-[color-mix(in_srgb,#E87722_12%,white)] px-[var(--primitive-space-2)] py-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[#E87722]"
                    >
                      {course.title}
                      <button
                        type="button"
                        className="text-[#E87722] hover:opacity-70"
                        onClick={() =>
                          onChange({
                            prerequisiteIds: state.prerequisiteIds.filter(
                              (id) => id !== course.id,
                            ),
                          })
                        }
                        aria-label={`حذف ${course.title}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                دوره‌هایی که قبل از این دوره باید گذرانده شوند
              </p>
            </div>
          </FormField>
        </section>
      ) : null}

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          برنامه زمانی
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="کل ساعت دوره"
            error={fieldError?.field === "total_hours" ? fieldError : null}
          >
            <TextInput
              type="number"
              min={1}
              value={state.totalHours}
              onChange={(event) => onChange({ totalHours: event.target.value })}
              placeholder="مثلاً ۴۸"
            />
          </FormField>

          <FormField
            label="مدت هر جلسه"
            error={fieldError?.field === "session_duration" ? fieldError : null}
          >
            <div className="relative">
              <TextInput
                type="number"
                min={0.5}
                step={0.5}
                value={state.sessionDuration}
                onChange={(event) =>
                  onChange({ sessionDuration: event.target.value })
                }
                placeholder="مثلاً ۱.۵ ساعت"
                className="pe-[var(--primitive-space-14)]"
              />
              <span className="pointer-events-none absolute end-[var(--primitive-space-3)] top-1/2 -translate-y-1/2 text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                ساعت
              </span>
            </div>
          </FormField>

          <FormField
            label="جلسات در هفته"
            error={fieldError?.field === "sessions_per_week" ? fieldError : null}
          >
            <TextInput
              type="number"
              min={1}
              value={state.sessionsPerWeek}
              onChange={(event) =>
                onChange({ sessionsPerWeek: event.target.value })
              }
              placeholder="مثلاً ۲"
            />
          </FormField>
        </div>

        {computedSessions != null ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            تعداد کل جلسات:{" "}
            <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
              {formatCount(computedSessions)} جلسه
            </span>
          </p>
        ) : null}

        {scheduleSummary ? (
          <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            <p>
              مدت دوره:{" "}
              <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                حدود {formatCount(scheduleSummary.weeks)} هفته
              </span>
            </p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          قیمت و وضعیت
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="قیمت (تومان)"
            required
            error={fieldError?.field === "current_price" ? fieldError : null}
          >
            <MoneyInput
              value={state.price}
              onValueChange={(value) => onChange({ price: value })}
            />
          </FormField>

          <FormField label="وضعیت">
            <Checkbox
              label="فعال"
              checked={state.isActive}
              onChange={(event) => onChange({ isActive: event.target.checked })}
            />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          توضیحات
        </h3>

        <FormField
          label="توضیحات دوره"
          error={fieldError?.field === "description" ? fieldError : null}
        >
          <Textarea
            value={state.description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={4}
            placeholder="اختیاری"
          />
        </FormField>
      </section>
    </div>
  );
}

export { CourseFormFields };
