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
import { FormDialog } from "@/components/domain/form-dialog";
import { ReferralFormFields } from "@/components/domain/referral-form-fields";
import { Breadcrumb } from "@/components/layout";
import { Badge } from "@/components/primitives/badge";
import { T1DetailSkeleton } from "@/components/skeletons";
import { BlockSkeleton } from "@/components/feedback/skeleton";
import { Button } from "@/components/ui/button";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { createActivity } from "@/lib/api/activities";
import { createConsultation, listConsultations } from "@/lib/api/consultations";
import { getDepartment, listDepartments } from "@/lib/api/departments";
import {
  deletePerson,
  getPerson,
  listClasses,
  listEnrollments,
  listJourneys,
  listTasks,
  updatePerson,
} from "@/lib/api/people";
import { getMe, listUsers } from "@/lib/api/users";
import {
  canConductConsultation,
  canManageEnrollments,
  canReferToDepartment,
  getCurrentRole,
} from "@/lib/auth/role";
import {
  assessmentStatusLabel,
  isConsultationAssessmentComplete,
} from "@/lib/consultation/assessment";
import {
  matchDepartmentsToInterests,
  sortDepartmentsByInstituteCatalog,
} from "@/lib/department/institute-departments";
import type {
  ConsultationRead,
  CourseClassRead,
  DepartmentRead,
  EnrollmentRead,
  JourneyRead,
  PersonRead,
  TaskRead,
  UserRead,
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
  const canRefer = canReferToDepartment();

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
  const [usersMap, setUsersMap] = React.useState<Record<number, string>>({});
  const [me, setMe] = React.useState<UserRead | null>(null);
  const [tabLoading, setTabLoading] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [formState, setFormState] = React.useState<PersonFormState | null>(null);
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const [referralOpen, setReferralOpen] = React.useState(false);
  const [referralDepartments, setReferralDepartments] = React.useState<
    DepartmentRead[]
  >([]);
  const [referralDepartmentsLoading, setReferralDepartmentsLoading] =
    React.useState(false);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = React.useState<
    Set<number>
  >(new Set());
  const [referralNotes, setReferralNotes] = React.useState("");
  const [referralSubmitting, setReferralSubmitting] = React.useState(false);
  const [referralProgress, setReferralProgress] = React.useState<{
    current: number;
    total: number;
  } | null>(null);

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
      const currentRole = getCurrentRole();
      const [personData, lastActivity, meData] = await Promise.all([
        getPerson(personId),
        fetchLastActivityForPerson(personId),
        getMe(),
      ]);
      setPerson(personData);
      setLastActivityAt(lastActivity);
      setMe(meData);

      let nameByUserId: Record<number, string> = {
        [meData.id]: meData.name,
      };
      if (currentRole === "admin") {
        const usersRes = await listUsers({ limit: 500 });
        nameByUserId = Object.fromEntries(
          usersRes.items.map((user) => [user.id, user.name]),
        );
      }
      setUsersMap(nameByUserId);
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
    } catch {
      // Tab-level errors handled per tab via empty states
    } finally {
      setTabLoading(false);
    }
  }, [person]);

  const refreshConsultations = React.useCallback(async () => {
    try {
      const consultRes = await listConsultations({ limit: 500 });
      setConsultations(consultRes.items);
    } catch {
      // Keep existing list on refresh failure
    }
  }, []);

  const openReferralDrawer = React.useCallback(async () => {
    if (!person) return;
    setReferralOpen(true);
    setReferralNotes("");
    setReferralProgress(null);
    setReferralDepartmentsLoading(true);
    try {
      const deptRes = await listDepartments({ limit: 100 });
      const activeDepartments = sortDepartmentsByInstituteCatalog(
        deptRes.items.filter((dept) => dept.is_active),
      );
      setReferralDepartments(activeDepartments);
      setSelectedDepartmentIds(
        matchDepartmentsToInterests(activeDepartments, person.interests),
      );
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در بارگذاری دپارتمان‌ها").detail,
      });
      setReferralOpen(false);
    } finally {
      setReferralDepartmentsLoading(false);
    }
  }, [person, toast]);

  const toggleDepartmentSelection = (departmentId: number) => {
    setSelectedDepartmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(departmentId)) {
        next.delete(departmentId);
      } else {
        next.add(departmentId);
      }
      return next;
    });
  };

  const handleReferralSubmit = async () => {
    if (!person || selectedDepartmentIds.size === 0) return;

    const selectedIds = [...selectedDepartmentIds];
    setReferralSubmitting(true);
    setReferralProgress({ current: 0, total: selectedIds.length });

    try {
      for (let index = 0; index < selectedIds.length; index += 1) {
        const departmentId = selectedIds[index]!;
        setReferralProgress({ current: index + 1, total: selectedIds.length });

        const department = await getDepartment(departmentId);
        if (department.manager_id == null) {
          throw new Error(`دپارتمان «${department.name}» مدیر ندارد`);
        }

        await createConsultation({
          person_id: person.id,
          department_id: department.id,
          consultant_id: department.manager_id,
          notes: referralNotes.trim() || null,
          current_level: null,
          goal: null,
        });

        await createActivity({
          person_id: person.id,
          action: "consultation_referred",
          payload: {
            department_id: department.id,
            department_name: department.name,
            consultant_id: department.manager_id,
            notes: referralNotes.trim() || null,
          },
        });
      }

      toast({
        variant: "success",
        title: `ارجاع به ${selectedIds.length} دپارتمان با موفقیت انجام شد`,
      });
      await refreshConsultations();
      setReferralOpen(false);
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در ارجاع به دپارتمان").detail,
      });
    } finally {
      setReferralSubmitting(false);
      setReferralProgress(null);
    }
  };

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
                  <div className="flex flex-wrap items-center justify-between gap-[var(--primitive-space-3)]">
                    <h2 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                      مشاوره‌ها
                    </h2>
                    {canRefer ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => void openReferralDrawer()}
                      >
                        ارجاع به دپارتمان
                      </Button>
                    ) : null}
                  </div>
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
                          className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]"
                        >
                          <dl className="flex flex-col gap-[var(--primitive-space-2)]">
                            <KeyValueRow
                              label="دپارتمان"
                              value={
                                departmentNameById.get(consultation.department_id) ??
                                "—"
                              }
                            />
                            <KeyValueRow
                              label="مشاور"
                              value={
                                usersMap[consultation.consultant_id] ?? "—"
                              }
                            />
                            <KeyValueRow
                              label="سطح"
                              value={consultation.current_level ?? "—"}
                            />
                            <KeyValueRow
                              label="هدف"
                              value={consultation.goal ?? "—"}
                            />
                            <KeyValueRow
                              label="ارزیابی"
                              value={assessmentStatusLabel(consultation)}
                            />
                            <KeyValueRow
                              label="تاریخ"
                              value={formatDateTimeDisplay(
                                consultation.created_at,
                                "YYYY/MM/DD",
                              )}
                            />
                            <KeyValueRow
                              label="وضعیت"
                              value={
                                <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
                                  <StatusBadge
                                    domain="consultation"
                                    value={consultation.outcome ?? "pending"}
                                  />
                                  {me &&
                                  canConductConsultation(consultation, me) &&
                                  consultation.outcome === null ? (
                                    <Button
                                      type="button"
                                      variant="primary"
                                      size="sm"
                                      onClick={() =>
                                        router.push(
                                          `/people/${person.id}/consultations/${consultation.id}?step=${
                                            isConsultationAssessmentComplete(
                                              consultation,
                                            )
                                              ? "outcome"
                                              : "assessment"
                                          }`,
                                        )
                                      }
                                    >
                                      {isConsultationAssessmentComplete(
                                        consultation,
                                      )
                                        ? "تعیین نتیجه"
                                        : "ادامه مشاوره"}
                                    </Button>
                                  ) : null}
                                </div>
                              }
                            />
                          </dl>
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

      <FormDialog
        open={referralOpen}
        onOpenChange={setReferralOpen}
        title="ارجاع به دپارتمان جهت مشاوره"
        cancelLabel="لغو"
        submitLabel="ارجاع"
        onSubmit={() => void handleReferralSubmit()}
        submitLoading={referralSubmitting}
        submitDisabled={
          selectedDepartmentIds.size === 0 || referralDepartments.length === 0
        }
      >
        <ReferralFormFields
          departments={referralDepartments}
          loading={referralDepartmentsLoading}
          selectedDepartmentIds={selectedDepartmentIds}
          onToggleDepartment={toggleDepartmentSelection}
          notes={referralNotes}
          onNotesChange={setReferralNotes}
          submitting={referralSubmitting}
          progress={referralProgress}
        />
      </FormDialog>
    </>
  );
}
