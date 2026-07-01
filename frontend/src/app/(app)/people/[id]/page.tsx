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
  StaleLeadIndicator,
  StatusBadge,
} from "@/components/domain";
import { AppDrawer, ErrorState, useToast } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import { Breadcrumb } from "@/components/layout";
import { T1DetailSkeleton } from "@/components/skeletons";
import { BlockSkeleton } from "@/components/feedback/skeleton";
import { Button } from "@/components/ui/button";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import {
  getPerson,
  listClasses,
  listDepartments,
  listEnrollments,
  listJourneys,
  listTasks,
  updatePerson,
} from "@/lib/api/people";
import type {
  CourseClassRead,
  DepartmentRead,
  EnrollmentRead,
  JourneyRead,
  PersonRead,
  TaskRead,
} from "@/lib/api/types";
import { formatDateDisplay, formatToman } from "@/lib/locale";
import {
  fetchLastActivityForPerson,
  isStaleLead,
} from "@/lib/person/stale-lead";
import { PERSON_STATUS_OPTIONS, taskTypeLabel, terminologyLabel } from "@/lib/terminology";

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
  const [tabLoading, setTabLoading] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formFullName, setFormFullName] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formStatus, setFormStatus] = React.useState<PersonRead["status"]>("prospect");
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
      const [personData, lastActivity] = await Promise.all([
        getPerson(personId),
        fetchLastActivityForPerson(personId),
      ]);
      setPerson(personData);
      setLastActivityAt(lastActivity);
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
      const [journeyRes, enrollmentRes, taskRes, deptRes, classRes] =
        await Promise.all([
          listJourneys({ limit: 500 }),
          listEnrollments({ limit: 500 }),
          listTasks({ limit: 500 }),
          listDepartments({ limit: 100 }),
          listClasses({ limit: 500 }),
        ]);
      setJourneys(journeyRes.items);
      setEnrollments(enrollmentRes.items);
      setTasks(taskRes.items);
      setDepartments(deptRes.items);
      setClasses(classRes.items);
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
    setFormFullName(person.full_name);
    setFormPhone(person.phone ?? "");
    setFormEmail(person.email ?? "");
    setFormStatus(person.status);
    setFormError(null);
    setFieldError(null);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!person || !formFullName.trim()) return;
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      const updated = await updatePerson(person.id, {
        full_name: formFullName.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        status: formStatus,
      });
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
                </dl>
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
                    cell: (row) => formatDateDisplay(row.created_at),
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

      <AppDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="form"
        title="ویرایش شخص"
        onSubmit={handleUpdate}
        submitLoading={submitting}
        submitDisabled={!formFullName.trim()}
      >
        {formError ? (
          <ErrorState error={formError} className="py-[var(--primitive-space-4)]" />
        ) : null}
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <FormField
            label="نام کامل"
            required
            error={fieldError?.field === "full_name" ? fieldError : null}
          >
            <TextInput
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
            />
          </FormField>
          <FormField
            label="تلفن"
            error={fieldError?.field === "phone" ? fieldError : null}
          >
            <TextInput
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
          </FormField>
          <FormField
            label="ایمیل"
            error={fieldError?.field === "email" ? fieldError : null}
          >
            <TextInput
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </FormField>
          <FormField
            label="وضعیت"
            error={fieldError?.field === "status" ? fieldError : null}
          >
            <Select
              options={PERSON_STATUS_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={formStatus}
              onChange={(value) =>
                setFormStatus(value as PersonRead["status"])
              }
            />
          </FormField>
        </div>
      </AppDrawer>
    </>
  );
}
