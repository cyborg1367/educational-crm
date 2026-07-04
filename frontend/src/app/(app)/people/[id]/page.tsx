"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import {
  DataTable,
  RelationshipCard,
  Timeline,
} from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import {
  AISummaryPanel,
  ConfirmDialog,
  StaleLeadIndicator,
  StatusAction,
  StatusBadge,
} from "@/components/domain";
import {
  emptyPersonFormState,
  personFormStateFromRead,
  personFormStateToUpdateBody,
  type PersonFormState,
} from "@/components/domain/person-form-fields";
import { PersonFormDialog } from "@/components/domain/person-form-dialog";
import { ErrorState, useToast } from "@/components/feedback";
import { Breadcrumb } from "@/components/layout";
import { Badge } from "@/components/primitives/badge";
import { T1DetailSkeleton } from "@/components/skeletons";
import { BlockSkeleton } from "@/components/feedback/skeleton";
import { Button } from "@/components/ui/button";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import {
  deletePerson,
  getPerson,
  listClasses,
  listDepartments,
  listEnrollments,
  listJourneys,
  listTasks,
  updatePerson,
} from "@/lib/api/people";
import { listConsultations } from "@/lib/api/consultations";
import { getCourse } from "@/lib/api/finance";
import { listUsers } from "@/lib/api/users";
import { canManageEnrollments } from "@/lib/auth/role";
import type {
  ConsultationRead,
  CourseClassRead,
  CourseRead,
  DepartmentRead,
  EnrollmentRead,
  JourneyRead,
  PersonRead,
  TaskRead,
} from "@/lib/api/types";
import { formatDateDisplay, formatDateTimeDisplay, formatToman } from "@/lib/locale";
import {
  fetchLastActivityForPerson,
  isStaleLead,
} from "@/lib/person/stale-lead";
import {
  genderLabel,
  interestLabel,
  sourceLabel,
  taskTypeLabel,
  terminologyLabel,
} from "@/lib/terminology";

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: 50,
  offset: 0,
  has_more: false,
});

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

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const personId = Number(params.id);
  const canEnroll = canManageEnrollments();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [person, setPerson] = React.useState<PersonRead | null>(null);
  const [lastActivityAt, setLastActivityAt] = React.useState<string | null>(
    null,
  );

  const [journeys, setJourneys] = React.useState<JourneyRead[]>([]);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRead[]>([]);
  const [tasks, setTasks] = React.useState<TaskRead[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentRead[]>([]);
  const [classes, setClasses] = React.useState<CourseClassRead[]>([]);
  const [consultations, setConsultations] = React.useState<ConsultationRead[]>(
    [],
  );
  const [coursesById, setCoursesById] = React.useState<Map<number, CourseRead>>(
    new Map(),
  );
  const [usersMap, setUsersMap] = React.useState<Record<number, string>>({});
  const [tabLoading, setTabLoading] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [formState, setFormState] = React.useState<PersonFormState | null>(null);
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const departmentNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const dept of departments) {
      map.set(dept.id, dept.name);
    }
    return map;
  }, [departments]);

  const classNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const cls of classes) {
      map.set(cls.id, cls.name);
    }
    return map;
  }, [classes]);

  const personJourneys = React.useMemo(
    () => journeys.filter((j) => j.person_id === personId),
    [journeys, personId],
  );

  const personEnrollments = React.useMemo(
    () =>
      enrollments
        .filter((e) => e.person_id === personId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [enrollments, personId],
  );

  const personTasks = React.useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.person_id === personId ||
            (t.related_entity_type === "person" &&
              t.related_entity_id === personId),
        )
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [tasks, personId],
  );

  const personConsultations = React.useMemo(
    () =>
      consultations
        .filter((c) => c.person_id === personId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [consultations, personId],
  );

  const currentJourney = React.useMemo(() => {
    const active = personJourneys.find((j) => j.status === "active");
    if (active) return active;
    return [...personJourneys].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0];
  }, [personJourneys]);

  const latestEnrollment = personEnrollments[0] ?? null;

  const loadPerson = React.useCallback(async () => {
    if (!Number.isFinite(personId)) {
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
      const [personData, lastActivity, usersRes] = await Promise.all([
        getPerson(personId),
        fetchLastActivityForPerson(personId),
        listUsers({ limit: 500 }),
      ]);
      setPerson(personData);
      setLastActivityAt(lastActivity);
      setUsersMap(
        Object.fromEntries(usersRes.items.map((user) => [user.id, user.name])),
      );
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری شخص"));
    } finally {
      setLoading(false);
    }
  }, [personId]);

  const loadTabData = React.useCallback(async () => {
    if (!person) return;
    setTabLoading(true);
    try {
      const [journeyRes, enrollmentRes, taskRes, deptRes, classRes, consultRes] =
        await Promise.all([
          listJourneys({ limit: 500 }),
          listEnrollments({ limit: 500 }),
          listTasks({ limit: 500 }),
          listDepartments({ limit: 100 }),
          listClasses({ limit: 500 }),
          listConsultations({ limit: 500 }),
        ]);
      setJourneys(journeyRes.items);
      setEnrollments(enrollmentRes.items);
      setTasks(taskRes.items);
      setDepartments(deptRes.items);
      setClasses(classRes.items);
      setConsultations(consultRes.items);

      const courseIds = [
        ...new Set(
          consultRes.items
            .map((c) => c.recommended_course_id)
            .filter((id): id is number => id != null),
        ),
      ];
      if (courseIds.length > 0) {
        const courses = await Promise.all(
          courseIds.map((id) => getCourse(id).catch(() => null)),
        );
        const courseMap = new Map<number, CourseRead>();
        for (const course of courses) {
          if (course) {
            courseMap.set(course.id, course);
          }
        }
        setCoursesById(courseMap);
      }
    } catch {
      // Tab-level errors handled per tab via empty states
    } finally {
      setTabLoading(false);
    }
  }, [person]);

  React.useEffect(() => {
    void loadPerson();
  }, [loadPerson]);

  React.useEffect(() => {
    if (person) {
      void loadTabData();
    }
  }, [person, loadTabData]);

  const openEditDrawer = () => {
    if (!person) return;
    setFormState(personFormStateFromRead(person));
    setFormError(null);
    setFieldError(null);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!person || !formState || !formState.fullName.trim()) return;
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      const updated = await updatePerson(
        person.id,
        personFormStateToUpdateBody(formState),
      );
      setPerson(updated);
      toast({ variant: "success", title: "تغییرات ذخیره شد" });
      setEditOpen(false);
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        setFormError(toApiError(err, "خطا در ذخیره تغییرات"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!person) return;
    setDeleting(true);
    try {
      await deletePerson(person.id);
      toast({ variant: "success", title: "شخص حذف شد" });
      setDeleteOpen(false);
      router.push("/people");
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در حذف شخص").detail,
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <T1DetailSkeleton
        title="…"
        tabs={[
          {
            id: "overview",
            label: "اطلاعات کلی",
            content: <BlockSkeleton height="200px" width="100%" />,
          },
        ]}
        secondary={<BlockSkeleton height="120px" width="100%" />}
      />
    );
  }

  if (error || !person) {
    return <ErrorState error={error ?? toApiError(null)} />;
  }

  const stale = isStaleLead(person.status, lastActivityAt);

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: "خانه", href: "/dashboard" },
          { label: "افراد", href: "/people" },
          { label: person.full_name },
        ]}
        className="mb-[var(--semantic-space-sectionGap)]"
      />

      <T1DetailSkeleton
        title={
          <span className="inline-flex flex-wrap items-center gap-[var(--primitive-space-3)]">
            {person.full_name}
            {stale ? <StaleLeadIndicator /> : null}
          </span>
        }
        statusAction={
          <div className="flex flex-wrap items-center gap-[var(--primitive-space-3)]">
            <StatusBadge domain="person" value={person.status} />
            <Button type="button" variant="secondary" size="sm" onClick={openEditDrawer}>
              ویرایش
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              حذف
            </Button>
          </div>
        }
        tabs={[
          {
            id: "overview",
            label: "اطلاعات کلی",
            content: (
              <div className="flex flex-col gap-[var(--semantic-space-sectionGap)]">
                <dl className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)]">
                  <KeyValueRow label="تلفن" value={person.phone} />
                  <KeyValueRow label="ایمیل" value={person.email} />
                  <KeyValueRow
                    label="تاریخ تولد"
                    value={
                      person.birth_date
                        ? formatDateDisplay(person.birth_date)
                        : "ثبت نشده"
                    }
                  />
                  <KeyValueRow
                    label="جنسیت"
                    value={
                      person.gender ? genderLabel(person.gender) : "ثبت نشده"
                    }
                  />
                  <KeyValueRow
                    label="علاقه‌مندی‌ها"
                    value={
                      person.interests && person.interests.length > 0 ? (
                        <span className="flex flex-wrap gap-[var(--primitive-space-2)]">
                          {person.interests.map((interest) => (
                            <Badge key={interest} variant="brand">
                              {interestLabel(interest)}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        "ثبت نشده"
                      )
                    }
                  />
                  <KeyValueRow
                    label="توضیحات علاقه‌مندی"
                    value={person.interests_note ?? "—"}
                  />
                  <KeyValueRow
                    label="منبع آشنایی"
                    value={
                      person.source ? sourceLabel(person.source) : "ثبت نشده"
                    }
                  />
                  <KeyValueRow label="یادداشت" value={person.notes ?? "—"} />
                </dl>

                <div className="flex flex-col gap-[var(--primitive-space-3)]">
                  <h2 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                    مشاوره‌ها
                  </h2>
                  {tabLoading ? (
                    <BlockSkeleton height="120px" width="100%" />
                  ) : personConsultations.length === 0 ? (
                    <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                      مشاوره‌ای ثبت نشده است
                    </p>
                  ) : (
                    <div className="flex flex-col gap-[var(--primitive-space-3)]">
                      {personConsultations.map((consultation) => (
                        <div
                          key={consultation.id}
                          className="flex flex-wrap items-center justify-between gap-[var(--primitive-space-3)] rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]"
                        >
                          <div className="min-w-0">
                            <p className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]">
                              مشاوره #{consultation.id}
                            </p>
                            <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                              {consultation.goal ?? "—"}
                              {consultation.recommended_course_id != null
                                ? ` · ${
                                    coursesById.get(
                                      consultation.recommended_course_id,
                                    )?.title ?? "دوره"
                                  }`
                                : ""}
                            </p>
                          </div>
                          <StatusAction
                            entity="consultation"
                            outcome={consultation.outcome}
                            onAction={() => {
                              if (consultation.outcome === null) {
                                router.push(
                                  `/people/${person.id}/consultations/${consultation.id}`,
                                );
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <AISummaryPanel />
              </div>
            ),
          },
          {
            id: "journeys",
            label: "سفرها",
            content: (
              <DataTable
                columns={[
                  {
                    key: "department_name",
                    header: "دپارتمان",
                    cell: (row) =>
                      departmentNameById.get(row.department_id) ?? "—",
                  },
                  {
                    key: "status",
                    header: "وضعیت",
                    cell: (row) => (
                      <StatusBadge domain="journey" value={row.status} />
                    ),
                  },
                  {
                    key: "created_at",
                    header: "تاریخ ایجاد",
                    align: "end",
                    cell: (row) => formatDateTimeDisplay(row.created_at, "YYYY/MM/DD"),
                  },
                ]}
                data={{
                  ...emptyPage<JourneyRead>(),
                  items: personJourneys,
                  total_count: personJourneys.length,
                }}
                loading={tabLoading}
                emptyMessage="سفری ثبت نشده است"
              />
            ),
          },
          {
            id: "enrollments",
            label: "ثبت‌نام‌ها",
            content: (
              <div className="flex flex-col gap-[var(--primitive-space-4)]">
                {canEnroll ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        router.push(`/enrollments/new?person_id=${person.id}`)
                      }
                    >
                      ثبت‌نام جدید
                    </Button>
                  </div>
                ) : null}
                <DataTable
                columns={[
                  {
                    key: "class_name",
                    header: "کلاس",
                    cell: (row) => classNameById.get(row.class_id) ?? "—",
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
                ]}
                data={{
                  ...emptyPage<EnrollmentRead>(),
                  items: personEnrollments,
                  total_count: personEnrollments.length,
                }}
                loading={tabLoading}
                onRowClick={(row) => router.push(`/enrollments/${row.id}`)}
                emptyMessage="ثبت‌نامی یافت نشد"
              />
              </div>
            ),
          },
          {
            id: "timeline",
            label: "تایم‌لاین",
            content: (
              <Timeline
                personId={person.id}
                orgId={person.org_id}
                useMock={false}
                usersMap={usersMap}
              />
            ),
          },
          {
            id: "tasks",
            label: "وظایف",
            content: (
              <DataTable
                columns={[
                  {
                    key: "type",
                    header: "نوع",
                    cell: (row) => taskTypeLabel(row.type),
                  },
                  { key: "title", header: "عنوان" },
                  {
                    key: "due_date",
                    header: "موعد",
                    align: "end",
                    cell: (row) => formatDateDisplay(row.due_date),
                  },
                  {
                    key: "status",
                    header: "وضعیت",
                    cell: (row) => (
                      <StatusBadge domain="task" value={row.status} />
                    ),
                  },
                ]}
                data={{
                  ...emptyPage<TaskRead>(),
                  items: personTasks,
                  total_count: personTasks.length,
                }}
                loading={tabLoading}
                emptyMessage="وظیفه‌ای یافت نشد"
              />
            ),
          },
        ]}
        secondary={
          <div className="flex flex-col gap-[var(--primitive-space-3)]">
            {currentJourney ? (
              <RelationshipCard
                label="دپارتمان سفر جاری"
                title={
                  departmentNameById.get(currentJourney.department_id) ?? "—"
                }
                subtitle={terminologyLabel(currentJourney.status)}
              />
            ) : (
              <RelationshipCard
                label="دپارتمان سفر جاری"
                title="سفر فعالی ثبت نشده"
              />
            )}
            {latestEnrollment ? (
              <RelationshipCard
                label="آخرین ثبت‌نام"
                title={classNameById.get(latestEnrollment.class_id) ?? "—"}
                subtitle={formatToman(latestEnrollment.final_amount)}
                href={`/enrollments/${latestEnrollment.id}`}
              />
            ) : (
              <RelationshipCard
                label="آخرین ثبت‌نام"
                title="ثبت‌نامی یافت نشد"
              />
            )}
          </div>
        }
      />

      <PersonFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="ویرایش شخص"
        state={formState ?? emptyPersonFormState()}
        onChange={(patch) =>
          setFormState((prev) => (prev ? { ...prev, ...patch } : prev))
        }
        onSubmit={handleUpdate}
        submitLoading={submitting}
        submitDisabled={
          !formState?.fullName.trim() || !formState?.phone.trim()
        }
        fieldError={fieldError}
        formError={formError}
        showStatus
      />

      <ConfirmDialog
        tier={2}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="حذف شخص"
        body={`آیا از حذف «${person.full_name}» مطمئن هستید؟ این عمل برای توسعه است و تمام timeline و داده‌های وابسته را هم پاک می‌کند.`}
        confirmLabel="حذف"
        cancelLabel="انصراف"
        confirmVariant="destructive"
        confirmLoading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
