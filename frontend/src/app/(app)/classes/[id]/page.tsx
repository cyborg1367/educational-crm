"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { DataTable, RelationshipCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { StatusBadge } from "@/components/domain";
import { ErrorState, useToast } from "@/components/feedback";
import { BlockSkeleton } from "@/components/feedback/skeleton";
import { Breadcrumb } from "@/components/layout";
import { T1DetailSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api/errors";
import type { ApiError } from "@/lib/api/error";
import {
  createAttendance,
  getClass,
  getCourse,
  listAttendances,
  listEnrollments,
  updateAttendance,
} from "@/lib/api/finance";
import { getPerson } from "@/lib/api/people";
import { listUsers } from "@/lib/api/users";
import type {
  AttendanceRead,
  CourseClassRead,
  CourseRead,
  EnrollmentRead,
  PersonRead,
} from "@/lib/api/types";
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  formatToman,
  todayStorage,
  type StorageDate,
} from "@/lib/locale";
import { cn } from "@/lib/utils";

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: 200,
  offset: 0,
  has_more: false,
});

type RosterRow = EnrollmentRead & { person_name: string };

type CellState = {
  present: boolean;
  attendanceId?: number;
  dirty: boolean;
};

function cellKey(enrollmentId: number, sessionDate: StorageDate): string {
  return `${enrollmentId}:${sessionDate}`;
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

function AttendanceGrid({
  enrollments,
  sessionDates,
  cells,
  savingRowId,
  onToggle,
  onSaveRow,
}: {
  enrollments: RosterRow[];
  sessionDates: StorageDate[];
  cells: Map<string, CellState>;
  savingRowId: number | null;
  onToggle: (
    enrollmentId: number,
    sessionDate: StorageDate,
    present: boolean,
  ) => void;
  onSaveRow: (enrollmentId: number) => void;
}) {
  if (enrollments.length === 0) {
    return (
      <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
        دانش‌آموزی در این کلاس ثبت‌نام نشده است
      </p>
    );
  }

  if (sessionDates.length === 0) {
    return (
      <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
        هنوز جلسه‌ای ثبت نشده است
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]">
      <table className="w-full min-w-[640px] border-collapse text-[length:var(--primitive-font-size-sm)]">
        <thead>
          <tr className="border-b border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)]">
            <th className="sticky start-0 z-[1] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-3)] py-[var(--primitive-space-3)] text-start font-[var(--primitive-font-weight-medium)]">
              دانش‌آموز
            </th>
            {sessionDates.map((date) => (
              <th
                key={date}
                className="px-[var(--primitive-space-2)] py-[var(--primitive-space-3)] text-center font-[var(--primitive-font-weight-medium)] whitespace-nowrap"
              >
                {formatDateDisplay(date)}
              </th>
            ))}
            <th className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)]" />
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enrollment) => {
            const hasDirty = sessionDates.some((date) => {
              const state = cells.get(cellKey(enrollment.id, date));
              return state?.dirty;
            });

            return (
              <tr
                key={enrollment.id}
                className="border-b border-[var(--semantic-color-surface-border)] last:border-b-0"
              >
                <td className="sticky start-0 z-[1] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] font-[var(--primitive-font-weight-medium)]">
                  {enrollment.person_name}
                </td>
                {sessionDates.map((date) => {
                  const state = cells.get(cellKey(enrollment.id, date));
                  const present = state?.present ?? false;

                  return (
                    <td
                      key={date}
                      className="px-[var(--primitive-space-2)] py-[var(--primitive-space-2)] text-center"
                    >
                      <Button
                        type="button"
                        size="lg"
                        variant={present ? "primary" : "secondary"}
                        className={cn(
                          "min-w-[var(--primitive-space-12)]",
                          !present &&
                            "text-[var(--semantic-color-status-danger)]",
                          state?.dirty && "ring-2 ring-[var(--semantic-color-action-focusRing)]",
                        )}
                        onClick={() =>
                          onToggle(enrollment.id, date, !present)
                        }
                        aria-pressed={present}
                      >
                        {present ? "حاضر" : "غایب"}
                      </Button>
                    </td>
                  );
                })}
                <td className="px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]">
                  <Button
                    type="button"
                    size="lg"
                    variant="secondary"
                    disabled={!hasDirty || savingRowId === enrollment.id}
                    loading={savingRowId === enrollment.id}
                    onClick={() => onSaveRow(enrollment.id)}
                  >
                    ذخیره حضور
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const classId = Number(params.id);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [courseClass, setCourseClass] = React.useState<CourseClassRead | null>(
    null,
  );
  const [course, setCourse] = React.useState<CourseRead | null>(null);
  const [teacherName, setTeacherName] = React.useState("—");
  const [enrollments, setEnrollments] = React.useState<RosterRow[]>([]);
  const [sessionDates, setSessionDates] = React.useState<StorageDate[]>([]);
  const [cells, setCells] = React.useState<Map<string, CellState>>(new Map());
  const [tabLoading, setTabLoading] = React.useState(false);
  const [savingRowId, setSavingRowId] = React.useState<number | null>(null);

  const loadClass = React.useCallback(async () => {
    if (!Number.isFinite(classId)) {
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
      const cls = await getClass(classId);
      setCourseClass(cls);

      const [courseData, usersRes] = await Promise.all([
        getCourse(cls.course_id),
        listUsers({ limit: 500 }),
      ]);
      setCourse(courseData);
      setTeacherName(
        usersRes.items.find((user) => user.id === cls.teacher_id)?.name ?? "—",
      );
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری کلاس"));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const loadTabData = React.useCallback(async () => {
    if (!courseClass) return;
    setTabLoading(true);
    try {
      const enrollmentRes = await listEnrollments({ limit: 500 });
      const classEnrollments = enrollmentRes.items.filter(
        (e) => e.class_id === courseClass.id,
      );

      const people = await Promise.all(
        classEnrollments.map((enrollment) =>
          getPerson(enrollment.person_id).catch(() => null),
        ),
      );
      const personById = new Map<number, PersonRead>();
      for (const person of people) {
        if (person) {
          personById.set(person.id, person);
        }
      }

      const roster: RosterRow[] = classEnrollments.map((enrollment) => ({
        ...enrollment,
        person_name:
          personById.get(enrollment.person_id)?.full_name ??
          `شخص #${enrollment.person_id}`,
      }));

      const attendanceResults = await Promise.all(
        classEnrollments.map((enrollment) =>
          listAttendances({ enrollment_id: enrollment.id, limit: 200 }),
        ),
      );
      const allAttendances = attendanceResults.flatMap((res) => res.items);

      const dates = [
        ...new Set(allAttendances.map((a) => a.session_date)),
      ].sort() as StorageDate[];

      if (
        dates.length === 0 &&
        (courseClass.status === "planned" || courseClass.status === "active")
      ) {
        dates.push(todayStorage());
      }

      const nextCells = new Map<string, CellState>();
      for (const attendance of allAttendances) {
        nextCells.set(
          cellKey(attendance.enrollment_id, attendance.session_date),
          {
            present: attendance.present,
            attendanceId: attendance.id,
            dirty: false,
          },
        );
      }

      setEnrollments(roster);
      setSessionDates(dates);
      setCells(nextCells);
    } catch {
      // Tab-level fallback
    } finally {
      setTabLoading(false);
    }
  }, [courseClass]);

  React.useEffect(() => {
    void loadClass();
  }, [loadClass]);

  React.useEffect(() => {
    if (courseClass) {
      void loadTabData();
    }
  }, [courseClass, loadTabData]);

  const handleToggle = (
    enrollmentId: number,
    sessionDate: StorageDate,
    present: boolean,
  ) => {
    setCells((prev) => {
      const next = new Map(prev);
      const key = cellKey(enrollmentId, sessionDate);
      const existing = next.get(key);
      next.set(key, {
        present,
        attendanceId: existing?.attendanceId,
        dirty: true,
      });
      return next;
    });
  };

  const handleSaveRow = async (enrollmentId: number) => {
    setSavingRowId(enrollmentId);
    try {
      const dirtyDates = sessionDates.filter((date) => {
        const state = cells.get(cellKey(enrollmentId, date));
        return state?.dirty;
      });

      const createdIds = new Map<string, number>();

      for (const sessionDate of dirtyDates) {
        const state = cells.get(cellKey(enrollmentId, sessionDate));
        if (!state) continue;

        if (state.attendanceId != null) {
          await updateAttendance(state.attendanceId, {
            present: state.present,
          });
        } else {
          const created = await createAttendance({
            enrollment_id: enrollmentId,
            session_date: sessionDate,
            present: state.present,
          });
          createdIds.set(cellKey(enrollmentId, sessionDate), created.id);
        }
      }

      setCells((prev) => {
        const next = new Map(prev);
        for (const sessionDate of dirtyDates) {
          const key = cellKey(enrollmentId, sessionDate);
          const state = next.get(key);
          if (state) {
            next.set(key, {
              present: state.present,
              attendanceId: createdIds.get(key) ?? state.attendanceId,
              dirty: false,
            });
          }
        }
        return next;
      });

      toast({ variant: "success", title: "حضور ذخیره شد" });
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در ذخیره حضور").detail,
      });
    } finally {
      setSavingRowId(null);
    }
  };

  if (loading) {
    return (
      <T1DetailSkeleton
        title="…"
        tabs={[
          {
            id: "roster",
            label: "لیست دانش‌آموزان",
            content: <BlockSkeleton height="200px" width="100%" />,
          },
        ]}
        secondary={<BlockSkeleton height="120px" width="100%" />}
      />
    );
  }

  if (error || !courseClass) {
    return <ErrorState error={error ?? toApiError(null)} />;
  }

  const dateRangeLabel = courseClass.end_date
    ? `${formatDateDisplay(courseClass.start_date)} – ${formatDateDisplay(courseClass.end_date)}`
    : formatDateDisplay(courseClass.start_date);

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: "خانه", href: "/dashboard" },
          { label: "کلاس‌ها", href: "/classes" },
          { label: courseClass.name },
        ]}
        className="mb-[var(--semantic-space-sectionGap)]"
      />

      <T1DetailSkeleton
        title={
          <span className="inline-flex flex-wrap items-center gap-[var(--primitive-space-3)]">
            {courseClass.name}
            <span className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-normal)] text-[var(--semantic-color-text-secondary)]">
              {dateRangeLabel}
            </span>
          </span>
        }
        statusAction={
          <StatusBadge domain="class" value={courseClass.status} />
        }
        tabs={[
          {
            id: "roster",
            label: "لیست دانش‌آموزان",
            content: (
              <DataTable
                columns={[
                  {
                    key: "person_name",
                    header: "نام",
                    cell: (row) => (
                      <Link
                        href={`/people/${row.person_id}`}
                        className="text-[var(--semantic-color-action-primary)] hover:underline"
                      >
                        {row.person_name}
                      </Link>
                    ),
                  },
                  {
                    key: "status",
                    header: "وضعیت",
                    cell: (row) => (
                      <StatusBadge domain="enrollment" value={row.status} />
                    ),
                  },
                  {
                    key: "final_amount",
                    header: "مبلغ نهایی",
                    align: "end",
                    cell: (row) => formatToman(row.final_amount),
                  },
                  {
                    key: "created_at",
                    header: "تاریخ ثبت‌نام",
                    align: "end",
                    cell: (row) =>
                      formatDateTimeDisplay(row.created_at, "YYYY/MM/DD"),
                  },
                ]}
                data={{
                  ...emptyPage<RosterRow>(),
                  items: enrollments,
                  total_count: enrollments.length,
                }}
                loading={tabLoading}
                emptyMessage="دانش‌آموزی ثبت‌نام نشده است"
              />
            ),
          },
          {
            id: "attendance",
            label: "حضور و غیاب",
            content: tabLoading ? (
              <BlockSkeleton height="240px" width="100%" />
            ) : (
              <AttendanceGrid
                enrollments={enrollments}
                sessionDates={sessionDates}
                cells={cells}
                savingRowId={savingRowId}
                onToggle={handleToggle}
                onSaveRow={(id) => void handleSaveRow(id)}
              />
            ),
          },
          {
            id: "schedule",
            label: "برنامه",
            content: (
              <dl className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)]">
                <KeyValueRow label="مدرس" value={teacherName} />
                <KeyValueRow
                  label="تاریخ شروع"
                  value={formatDateDisplay(courseClass.start_date)}
                />
                <KeyValueRow
                  label="تاریخ پایان"
                  value={
                    courseClass.end_date
                      ? formatDateDisplay(courseClass.end_date)
                      : "—"
                  }
                />
                <KeyValueRow label="نام کلاس" value={courseClass.name} />
                <KeyValueRow label="دوره" value={course?.title ?? "—"} />
              </dl>
            ),
          },
        ]}
        secondary={
          <RelationshipCard
            label="دوره"
            title={course?.title ?? "—"}
            subtitle={course ? formatToman(course.current_price) : undefined}
            href={course ? `/courses/${course.id}` : undefined}
          />
        }
      />
    </>
  );
}
