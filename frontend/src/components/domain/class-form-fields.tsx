"use client";

import * as React from "react";

import { DatePicker } from "@/components/form/date-picker";
import { FormField } from "@/components/form/form-field";
import { Checkbox } from "@/components/form/selection-control";
import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import { Button } from "@/components/ui/button";
import type { ApiFieldError } from "@/lib/api/error";
import type {
  ClassStatus,
  CourseClassCreate,
  CourseClassRead,
  CourseClassUpdate,
  CourseRead,
  DepartmentRead,
  UserRead,
} from "@/lib/api/types";
import { sortDepartmentsByInstituteCatalog } from "@/lib/department/institute-departments";
import {
  addDaysToStorageDate,
  formatCount,
  formatDateDisplay,
  type StorageDate,
} from "@/lib/locale";
import { CLASS_STATUS_OPTIONS, WEEKDAY_OPTIONS } from "@/lib/terminology";
import { cn } from "@/lib/utils";

export type ClassFormState = {
  courseId: string;
  teacherId: string;
  name: string;
  startDate: StorageDate | null;
  endDate: StorageDate | null;
  weekdays: string[];
  endDateManual: boolean;
  status: ClassStatus;
};

export function emptyClassFormState(): ClassFormState {
  return {
    courseId: "",
    teacherId: "",
    name: "",
    startDate: null,
    endDate: null,
    weekdays: [],
    endDateManual: false,
    status: "planned",
  };
}

export function classFormStateFromRead(
  courseClass: CourseClassRead,
  course: CourseRead | null,
): ClassFormState {
  const state: ClassFormState = {
    courseId: String(courseClass.course_id),
    teacherId: String(courseClass.teacher_id),
    name: courseClass.name,
    startDate: courseClass.start_date,
    endDate: courseClass.end_date,
    weekdays: courseClass.weekdays ?? [],
    endDateManual: false,
    status: courseClass.status,
  };

  const preview = computeClassSchedulePreview(course, state);
  if (preview && courseClass.end_date && courseClass.end_date !== preview.endDate) {
    state.endDateManual = true;
  }

  return state;
}

export function isClassFormValid(state: ClassFormState): boolean {
  return (
    Boolean(state.courseId) &&
    Boolean(state.teacherId) &&
    Boolean(state.name.trim()) &&
    state.startDate != null &&
    state.weekdays.length > 0
  );
}

export function computeClassEndDate(
  startDate: StorageDate,
  totalHours: number,
  sessionDuration: number,
  weekdayCount: number,
): StorageDate {
  const totalSessions = Math.ceil(totalHours / sessionDuration);
  const weeksNeeded = Math.ceil(totalSessions / weekdayCount);
  return addDaysToStorageDate(startDate, weeksNeeded * 7);
}

export type ClassSchedulePreview = {
  totalSessions: number;
  sessionDuration: number;
  totalHours: number;
  endDate: StorageDate;
};

export function computeClassSchedulePreview(
  course: CourseRead | null,
  state: ClassFormState,
): ClassSchedulePreview | null {
  if (
    course?.total_hours == null ||
    course.session_duration == null ||
    state.startDate == null ||
    state.weekdays.length === 0
  ) {
    return null;
  }

  const totalSessions = Math.ceil(
    course.total_hours / course.session_duration,
  );
  const endDate = computeClassEndDate(
    state.startDate,
    course.total_hours,
    course.session_duration,
    state.weekdays.length,
  );

  return {
    totalSessions,
    sessionDuration: course.session_duration,
    totalHours: course.total_hours,
    endDate,
  };
}

export function resolveClassEndDate(
  state: ClassFormState,
  selectedCourse: CourseRead | null,
): StorageDate | null {
  if (state.endDateManual) {
    return state.endDate;
  }
  const preview = computeClassSchedulePreview(selectedCourse, state);
  return preview?.endDate ?? state.endDate;
}

export function classFormStateToCreateBody(
  state: ClassFormState,
  selectedCourse: CourseRead | null = null,
): CourseClassCreate {
  return {
    course_id: Number(state.courseId),
    teacher_id: Number(state.teacherId),
    name: state.name.trim(),
    start_date: state.startDate!,
    end_date: resolveClassEndDate(state, selectedCourse),
    weekdays: state.weekdays,
    status: state.status,
  };
}

export function classFormStateToUpdateBody(
  state: ClassFormState,
  selectedCourse: CourseRead | null = null,
): CourseClassUpdate {
  return {
    course_id: Number(state.courseId),
    teacher_id: Number(state.teacherId),
    name: state.name.trim(),
    start_date: state.startDate!,
    end_date: resolveClassEndDate(state, selectedCourse),
    weekdays: state.weekdays,
    status: state.status,
  };
}

export type ClassFormFieldsProps = {
  mode: "create" | "edit";
  state: ClassFormState;
  onChange: (patch: Partial<ClassFormState>) => void;
  courses: CourseRead[];
  departments: DepartmentRead[];
  teachers: UserRead[];
  selectedCourse: CourseRead | null;
  fieldError?: ApiFieldError | null;
};

function ClassFormFields({
  mode,
  state,
  onChange,
  courses,
  departments,
  teachers,
  selectedCourse,
  fieldError = null,
}: ClassFormFieldsProps) {
  const departmentById = React.useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );

  const departmentTabs = React.useMemo(() => {
    const departmentIds = new Set(courses.map((course) => course.department_id));
    if (selectedCourse) {
      departmentIds.add(selectedCourse.department_id);
    }
    return sortDepartmentsByInstituteCatalog(
      [...departmentIds]
        .map((id) => departmentById.get(id))
        .filter((department): department is DepartmentRead => department != null),
    ).map((department) => ({
      id: String(department.id),
      label: department.name,
      count: courses.filter((course) => course.department_id === department.id)
        .length,
    }));
  }, [courses, departmentById, selectedCourse]);

  const [departmentTab, setDepartmentTab] = React.useState(() => {
    if (selectedCourse) {
      return String(selectedCourse.department_id);
    }
    return departmentTabs[0]?.id ?? "";
  });

  React.useEffect(() => {
    if (selectedCourse) {
      const selectedTab = String(selectedCourse.department_id);
      if (departmentTabs.some((tab) => tab.id === selectedTab)) {
        setDepartmentTab(selectedTab);
        return;
      }
    }
    if (
      departmentTab &&
      departmentTabs.some((tab) => tab.id === departmentTab)
    ) {
      return;
    }
    setDepartmentTab(departmentTabs[0]?.id ?? "");
  }, [selectedCourse, departmentTabs, departmentTab]);

  const courseOptions = React.useMemo(() => {
    const activeDepartmentId = Number(departmentTab);
    return courses
      .filter((course) => course.department_id === activeDepartmentId)
      .map((course) => ({
        value: String(course.id),
        label: course.title,
      }));
  }, [courses, departmentTab]);

  const teacherOptions = teachers.map((teacher) => ({
    value: String(teacher.id),
    label: teacher.name,
  }));

  const schedulePreview = computeClassSchedulePreview(selectedCourse, state);
  const autoEndDateActive = schedulePreview != null && !state.endDateManual;
  const displayedEndDate = autoEndDateActive
    ? schedulePreview.endDate
    : state.endDate;

  const toggleWeekday = (value: string, checked: boolean) => {
    const next = checked
      ? [...state.weekdays, value]
      : state.weekdays.filter((day) => day !== value);
    onChange({ weekdays: next, endDateManual: false });
  };

  const courseHasSchedule =
    selectedCourse?.total_hours != null &&
    selectedCourse.session_duration != null;

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          اطلاعات کلاس
        </h3>

        <FormField
          label="دوره"
          required
          error={fieldError?.field === "course_id" ? fieldError : null}
        >
          {courses.length === 0 ? (
            <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
              هنوز دوره فعالی برای انتخاب وجود ندارد.
            </p>
          ) : (
            <div className="flex flex-col gap-[var(--primitive-space-3)]">
              {departmentTabs.length > 1 ? (
                <div
                  role="tablist"
                  aria-label="فیلتر دوره بر اساس دپارتمان"
                  className="flex gap-[var(--primitive-space-1)] overflow-x-auto border-b border-[var(--semantic-color-surface-border)]"
                >
                  {departmentTabs.map((tab) => {
                    const selected = tab.id === departmentTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setDepartmentTab(tab.id)}
                        className={cn(
                          "relative shrink-0 px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
                          "text-[length:var(--primitive-font-size-sm)] transition-colors",
                          selected
                            ? "font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-action-primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--semantic-color-action-primary)]"
                            : "text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)]",
                        )}
                      >
                        {tab.label}
                        <span className="ms-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] opacity-70">
                          ({formatCount(tab.count)})
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {courseOptions.length === 0 ? (
                <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                  در این دپارتمان دوره فعالی نیست.
                </p>
              ) : (
                <Select
                  searchable
                  options={courseOptions}
                  value={
                    courseOptions.some((option) => option.value === state.courseId)
                      ? state.courseId
                      : ""
                  }
                  onChange={(value) =>
                    onChange({
                      courseId: value,
                      endDateManual: false,
                      endDate: null,
                    })
                  }
                  placeholder="انتخاب دوره"
                />
              )}

              {selectedCourse &&
              String(selectedCourse.department_id) !== departmentTab ? (
                <p className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                  دوره انتخاب‌شده: {selectedCourse.title}
                </p>
              ) : null}
            </div>
          )}
        </FormField>

        {selectedCourse ? (
          courseHasSchedule ? (
            <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
              برنامه دوره: {selectedCourse.total_hours} ساعت، هر جلسه{" "}
              {selectedCourse.session_duration} ساعت
              {selectedCourse.sessions_per_week != null
                ? `، ${selectedCourse.sessions_per_week} جلسه در هفته`
                : ""}
            </p>
          ) : (
            <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-status-warning)]">
              برای محاسبه خودکار تاریخ اتمام، اطلاعات برنامه زمانی این دوره را
              در منوی دوره‌ها تکمیل کنید.
            </p>
          )
        ) : null}

        <FormField
          label="مدرس"
          required
          error={fieldError?.field === "teacher_id" ? fieldError : null}
        >
          <Select
            searchable
            options={teacherOptions}
            value={state.teacherId}
            onChange={(value) => onChange({ teacherId: value })}
            placeholder="انتخاب مدرس"
          />
        </FormField>

        <FormField
          label="نام کلاس"
          required
          error={fieldError?.field === "name" ? fieldError : null}
        >
          <TextInput
            value={state.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="مثلاً Python 101 - صبح شنبه‌ها"
          />
        </FormField>

        {mode === "edit" ? (
          <FormField
            label="وضعیت"
            error={fieldError?.field === "status" ? fieldError : null}
          >
            <Select
              options={CLASS_STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={state.status}
              onChange={(value) => onChange({ status: value as ClassStatus })}
            />
          </FormField>
        ) : null}
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          زمان‌بندی
        </h3>

        <FormField
          label="روزهای هفته"
          required
          error={fieldError?.field === "weekdays" ? fieldError : null}
        >
          <div className="grid grid-cols-2 gap-[var(--primitive-space-2)]">
            {WEEKDAY_OPTIONS.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={state.weekdays.includes(option.value)}
                onChange={(event) =>
                  toggleWeekday(option.value, event.target.checked)
                }
              />
            ))}
          </div>
        </FormField>

        <FormField
          label="تاریخ شروع"
          required
          error={fieldError?.field === "start_date" ? fieldError : null}
        >
          <DatePicker
            value={state.startDate}
            onChange={(value) =>
              onChange({
                startDate: value,
                endDateManual: false,
              })
            }
          />
        </FormField>

        <FormField
          label="تاریخ اتمام"
          error={fieldError?.field === "end_date" ? fieldError : null}
        >
          <div className="flex flex-col gap-[var(--primitive-space-2)]">
            <DatePicker
              value={displayedEndDate}
              disabled={autoEndDateActive}
              onChange={(value) =>
                onChange({
                  endDate: value,
                  endDateManual: true,
                })
              }
            />
            {autoEndDateActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start px-0"
                onClick={() => onChange({ endDateManual: true })}
              >
                ویرایش دستی تاریخ
              </Button>
            ) : schedulePreview ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start px-0"
                onClick={() =>
                  onChange({
                    endDateManual: false,
                    endDate: schedulePreview.endDate,
                  })
                }
              >
                بازگشت به محاسبه خودکار
              </Button>
            ) : null}
          </div>
        </FormField>

        {schedulePreview ? (
          <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            <p>
              تاریخ اتمام بر اساس اطلاعات دوره محاسبه شده:{" "}
              <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                {formatDateDisplay(schedulePreview.endDate)}
              </span>
            </p>
            <p className="mt-[var(--primitive-space-1)]">
              {schedulePreview.totalSessions} جلسه ×{" "}
              {schedulePreview.sessionDuration} ساعت ={" "}
              {schedulePreview.totalHours} ساعت
            </p>
          </div>
        ) : null}

        {state.endDateManual &&
        schedulePreview &&
        displayedEndDate &&
        displayedEndDate !== schedulePreview.endDate ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-status-warning)]">
            تاریخ دستی (متفاوت از محاسبه خودکار)
          </p>
        ) : null}
      </section>
    </div>
  );
}

export { ClassFormFields };
