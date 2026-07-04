"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { StatusBadge } from "@/components/domain";
import { AppDrawer, ErrorState } from "@/components/feedback";
import { Select } from "@/components/form/select";
import { FormField } from "@/components/form/form-field";
import { FilterBar, type FilterValues } from "@/components/layout";
import { ListPageSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api/errors";
import type { ApiError } from "@/lib/api/error";
import { listClasses, listEnrollments } from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import type {
  CourseClassRead,
  EnrollmentRead,
  EnrollmentStatus,
  PersonRead,
} from "@/lib/api/types";
import { canManageEnrollments } from "@/lib/auth/role";
import { formatToman } from "@/lib/locale";
import { statusDisplayLabel } from "@/lib/terminology";

const PAGE_LIMIT = 50;

const ENROLLMENT_STATUS_OPTIONS: { value: EnrollmentStatus; label: string }[] =
  (["pre_enroll", "active", "completed", "dropped"] as const).map((value) => ({
    value,
    label: statusDisplayLabel("enrollment", value),
  }));

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

export default function EnrollmentsListPage() {
  const router = useRouter();
  const canCreate = canManageEnrollments();

  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [enrollmentsPage, setEnrollmentsPage] =
    React.useState<PaginatedResponse<EnrollmentRead>>(emptyPage);
  const [people, setPeople] = React.useState<PersonRead[]>([]);
  const [classes, setClasses] = React.useState<CourseClassRead[]>([]);

  const [personPickerOpen, setPersonPickerOpen] = React.useState(false);
  const [selectedPersonId, setSelectedPersonId] = React.useState("");

  const statusFilter =
    typeof filterValues.status === "string" ? filterValues.status : undefined;
  const classFilter =
    typeof filterValues.class_id === "string" ? filterValues.class_id : undefined;

  const personNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const person of people) {
      map.set(person.id, person.full_name);
    }
    return map;
  }, [people]);

  const classNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const cls of classes) {
      map.set(cls.id, cls.name);
    }
    return map;
  }, [classes]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [enrollmentRes, peopleRes, classRes] = await Promise.all([
        listEnrollments({
          limit: PAGE_LIMIT,
          offset,
          status: statusFilter as EnrollmentStatus | undefined,
          class_id: classFilter ? Number(classFilter) : undefined,
        }),
        listPeople({ limit: 500 }),
        listClasses({ limit: 500 }),
      ]);
      setEnrollmentsPage(enrollmentRes);
      setPeople(peopleRes.items);
      setClasses(classRes.items);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری ثبت‌نام‌ها"));
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter, classFilter]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const facets = React.useMemo(
    () => [
      {
        id: "status",
        type: "select" as const,
        label: "وضعیت",
        placeholder: "همه",
        options: ENROLLMENT_STATUS_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      },
      {
        id: "class_id",
        type: "select" as const,
        label: "کلاس",
        placeholder: "همه",
        searchable: true,
        options: classes.map((cls) => ({
          value: String(cls.id),
          label: cls.name,
        })),
      },
    ],
    [classes],
  );

  const startNewEnrollment = () => {
    if (!selectedPersonId) return;
    router.push(`/enrollments/new?person_id=${selectedPersonId}`);
  };

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <ListPageSkeleton
        title="ثبت‌نام‌ها"
        headerAction={
          canCreate ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setSelectedPersonId("");
                setPersonPickerOpen(true);
              }}
            >
              ثبت‌نام جدید
            </Button>
          ) : null
        }
        filterBar={
          <FilterBar
            facets={facets}
            values={filterValues}
            onValuesChange={(values) => {
              setFilterValues(values);
              setOffset(0);
            }}
          />
        }
        table={
          <DataTable
            columns={[
              {
                key: "person_name",
                header: "شخص",
                cell: (row) => personNameById.get(row.person_id) ?? "—",
              },
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
            data={enrollmentsPage}
            loading={loading}
            onPageChange={setOffset}
            onRowClick={(row) => router.push(`/enrollments/${row.id}`)}
            emptyMessage="ثبت‌نامی یافت نشد"
          />
        }
        cardList={
          <div className="flex flex-col gap-[var(--primitive-space-3)]">
            {enrollmentsPage.items.map((row) => (
              <EntitySummaryCard
                key={row.id}
                title={personNameById.get(row.person_id) ?? "—"}
                subtitle={classNameById.get(row.class_id) ?? "—"}
                meta={formatToman(row.final_amount)}
                onClick={() => router.push(`/enrollments/${row.id}`)}
              />
            ))}
          </div>
        }
      />

      <AppDrawer
        open={personPickerOpen}
        onOpenChange={setPersonPickerOpen}
        mode="form"
        title="انتخاب شخص"
        submitLabel="ادامه"
        onSubmit={startNewEnrollment}
        submitDisabled={!selectedPersonId}
      >
        <FormField label="شخص" required>
          <Select
            searchable
            options={people.map((person) => ({
              value: String(person.id),
              label: person.full_name,
            }))}
            value={selectedPersonId}
            onChange={setSelectedPersonId}
            placeholder="جستجو و انتخاب شخص"
          />
        </FormField>
      </AppDrawer>
    </>
  );
}
