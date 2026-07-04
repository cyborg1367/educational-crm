"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import {
  StaleLeadIndicator,
  StatusBadge,
} from "@/components/domain";
import {
  emptyPersonFormState,
  personFormStateToCreateBody,
  type PersonFormState,
} from "@/components/domain/person-form-fields";
import { PersonFormDialog } from "@/components/domain/person-form-dialog";
import { ErrorState, useToast } from "@/components/feedback";
import { FilterBar, type FilterValues } from "@/components/layout";
import { ListPageSkeleton } from "@/components/skeletons";
import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/ui/button";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import {
  createPerson,
  listActivities,
  listCommunications,
  listDepartments,
  listJourneys,
  listPeople,
} from "@/lib/api/people";
import type {
  DepartmentRead,
  JourneyRead,
  PersonRead,
  PersonStatus,
} from "@/lib/api/types";
import { formatDateTimeDisplay } from "@/lib/locale";
import { normalizeDigitsInput } from "@/lib/locale/number";
import {
  buildLastActivityMap,
  isStaleLead,
} from "@/lib/person/stale-lead";
import { PERSON_STATUS_OPTIONS } from "@/lib/terminology";

const PAGE_LIMIT = 50;

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

export default function PeopleListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [filterValues, setFilterValues] = React.useState<FilterValues>(() => {
    const status = searchParams.get("status");
    if (status) {
      return { status };
    }
    return {};
  });
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [peoplePage, setPeoplePage] =
    React.useState<PaginatedResponse<PersonRead>>(emptyPage);
  const [departments, setDepartments] = React.useState<DepartmentRead[]>([]);
  const [journeys, setJourneys] = React.useState<JourneyRead[]>([]);
  const [lastActivityByPerson, setLastActivityByPerson] = React.useState<
    Map<number, string>
  >(new Map());

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formState, setFormState] = React.useState<PersonFormState>(
    emptyPersonFormState,
  );
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const statusFilter =
    typeof filterValues.status === "string" ? filterValues.status : undefined;
  const departmentFilter =
    typeof filterValues.department === "string"
      ? filterValues.department
      : undefined;
  const searchQuery =
    typeof filterValues.search === "string"
      ? filterValues.search.trim()
      : "";

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [people, deptRes, journeyRes, activities, communications] =
        await Promise.all([
          listPeople({
            limit: PAGE_LIMIT,
            offset,
            status: statusFilter as PersonStatus | undefined,
          }),
          listDepartments({ limit: 100 }),
          listJourneys({ limit: 500 }),
          listActivities({ limit: 500 }),
          listCommunications({ limit: 500 }),
        ]);

      setPeoplePage(people);
      setDepartments(deptRes.items);
      setJourneys(journeyRes.items);
      setLastActivityByPerson(
        buildLastActivityMap(activities.items, communications.items),
      );
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری افراد"));
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const departmentByPerson = React.useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const journey of journeys) {
      const existing = map.get(journey.person_id) ?? new Set();
      existing.add(journey.department_id);
      map.set(journey.person_id, existing);
    }
    return map;
  }, [journeys]);

  const filteredItems = React.useMemo(() => {
    const normalizedSearch = searchQuery
      ? normalizeDigitsInput(searchQuery).toLowerCase()
      : "";

    return peoplePage.items.filter((person) => {
      if (departmentFilter) {
        const deptId = Number(departmentFilter);
        const personDepts = departmentByPerson.get(person.id);
        if (!personDepts?.has(deptId)) {
          return false;
        }
      }
      if (normalizedSearch) {
        const nameMatch = person.full_name
          .toLowerCase()
          .includes(normalizedSearch);
        const phoneMatch = person.phone
          ? normalizeDigitsInput(person.phone).includes(normalizedSearch)
          : false;
        if (!nameMatch && !phoneMatch) {
          return false;
        }
      }
      return true;
    });
  }, [
    peoplePage.items,
    departmentFilter,
    departmentByPerson,
    searchQuery,
  ]);

  const tableData: PaginatedResponse<PersonRead> =
    departmentFilter || searchQuery
      ? { ...peoplePage, items: filteredItems }
      : peoplePage;

  const facets = React.useMemo(
    () => [
      {
        id: "search",
        type: "search" as const,
        label: "جستجو",
        placeholder: "جستجو بر اساس نام یا تلفن",
      },
      {
        id: "status",
        type: "select" as const,
        label: "وضعیت",
        placeholder: "همه",
        options: PERSON_STATUS_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      },
      {
        id: "department",
        type: "select" as const,
        label: "دپارتمان",
        placeholder: "همه",
        options: departments.map((dept) => ({
          value: String(dept.id),
          label: dept.name,
        })),
      },
    ],
    [departments],
  );

  const resetForm = () => {
    setFormState(emptyPersonFormState());
    setFormError(null);
    setFieldError(null);
  };

  const handleCreate = async () => {
    if (!formState.fullName.trim() || !formState.phone.trim()) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      const created = await createPerson(personFormStateToCreateBody(formState));
      toast({ variant: "success", title: "شخص جدید ثبت شد" });
      setDrawerOpen(false);
      resetForm();
      router.push(`/people/${created.id}`);
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        setFormError(toApiError(err, "خطا در ثبت شخص"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !loading && peoplePage.items.length === 0) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <ListPageSkeleton
        title="افراد"
        headerAction={
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              resetForm();
              setDrawerOpen(true);
            }}
          >
            افزودن شخص
          </Button>
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
                key: "full_name",
                header: "نام",
                cell: (row) => (
                  <span className="inline-flex items-center gap-[var(--primitive-space-2)]">
                    {row.full_name}
                    {isStaleLead(
                      row.status,
                      lastActivityByPerson.get(row.id),
                    ) ? (
                      <StaleLeadIndicator />
                    ) : null}
                  </span>
                ),
              },
              { key: "phone", header: "تلفن" },
              {
                key: "status",
                header: "وضعیت",
                cell: (row) => (
                  <StatusBadge domain="person" value={row.status} />
                ),
              },
              {
                key: "created_at",
                header: "تاریخ ثبت",
                align: "end",
                cell: (row) => formatDateTimeDisplay(row.created_at, "YYYY/MM/DD"),
              },
            ]}
            data={tableData}
            loading={loading}
            onPageChange={setOffset}
            onRowClick={(row) => router.push(`/people/${row.id}`)}
            emptyMessage="موردی یافت نشد"
          />
        }
        cardList={
          <div className="flex flex-col gap-[var(--primitive-space-3)]">
            {loading ? (
              <p className="text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                در حال بارگذاری…
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                موردی یافت نشد
              </p>
            ) : (
              filteredItems.map((person) => (
                <EntitySummaryCard
                  key={person.id}
                  variant="person"
                  href={`/people/${person.id}`}
                  leading={
                    <Avatar
                      name={person.full_name}
                      size="md"
                    />
                  }
                  title={person.full_name}
                  subtitle={person.phone ?? "—"}
                  badges={
                    <>
                      <StatusBadge domain="person" value={person.status} />
                      {isStaleLead(
                        person.status,
                        lastActivityByPerson.get(person.id),
                      ) ? (
                        <StaleLeadIndicator />
                      ) : null}
                    </>
                  }
                  meta={formatDateTimeDisplay(person.created_at, "YYYY/MM/DD")}
                />
              ))
            )}
          </div>
        }
      />

      <PersonFormDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="افزودن شخص"
        state={formState}
        onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
        onSubmit={handleCreate}
        submitLabel="ثبت"
        submitLoading={submitting}
        submitDisabled={
          !formState.fullName.trim() || !formState.phone.trim()
        }
        fieldError={fieldError}
        formError={formError}
      />
    </>
  );
}
