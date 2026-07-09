"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { DataTable } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import {
  StaleLeadIndicator,
  StatusBadge,
} from "@/components/domain";
import { PersonCardGrid } from "@/components/domain/person-card";
import {
  emptyPersonFormState,
  personFormStateToCreateBody,
  type PersonFormState,
} from "@/components/domain/person-form-fields";
import { PersonFormDialog } from "@/components/domain/person-form-dialog";
import { ErrorState, useToast } from "@/components/feedback";
import { focusVisibleStyles } from "@/components/form/control-styles";
import { PeopleListToolbar, type PeopleListViewMode } from "@/components/layout";
import { ListPageSkeleton } from "@/components/skeletons";
import { Avatar } from "@/components/primitives/avatar";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import {
  createPerson,
  listActivities,
  listCommunications,
  listPeople,
} from "@/lib/api/people";
import type { PersonRead, PersonStatus } from "@/lib/api/types";
import { formatDateTimeDisplay } from "@/lib/locale";
import { formatPhoneDisplay, normalizeDigitsInput } from "@/lib/locale/number";
import {
  buildLastActivityMap,
  isStaleLead,
} from "@/lib/person/stale-lead";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 50;
const PEOPLE_VIEW_STORAGE_KEY = "people-list-view";

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

  const [filterValues, setFilterValues] = React.useState<{
    status?: PersonStatus;
    search?: string;
  }>(() => {
    const status = searchParams.get("status");
    if (status) {
      return { status: status as PersonStatus };
    }
    return {};
  });
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [peoplePage, setPeoplePage] =
    React.useState<PaginatedResponse<PersonRead>>(emptyPage);
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
  const [viewMode, setViewMode] = React.useState<PeopleListViewMode>("cards");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(PEOPLE_VIEW_STORAGE_KEY);
    if (stored === "cards" || stored === "table") {
      setViewMode(stored);
    }
  }, []);

  const handleViewModeChange = (mode: PeopleListViewMode) => {
    setViewMode(mode);
    window.localStorage.setItem(PEOPLE_VIEW_STORAGE_KEY, mode);
  };

  const statusFilter = filterValues.status;
  const searchQuery = filterValues.search?.trim() ?? "";

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [people, activities, communications] = await Promise.all([
        listPeople({
          limit: PAGE_LIMIT,
          offset,
          status: statusFilter,
        }),
        listActivities({ limit: 500 }),
        listCommunications({ limit: 500 }),
      ]);

      setPeoplePage(people);
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

  const filteredItems = React.useMemo(() => {
    const normalizedSearch = searchQuery
      ? normalizeDigitsInput(searchQuery).toLowerCase()
      : "";

    if (!normalizedSearch) {
      return peoplePage.items;
    }

    return peoplePage.items.filter((person) => {
      const nameMatch = person.full_name
        .toLowerCase()
        .includes(normalizedSearch);
      const phoneMatch = person.phone
        ? normalizeDigitsInput(person.phone).includes(normalizedSearch)
        : false;
      return nameMatch || phoneMatch;
    });
  }, [peoplePage.items, searchQuery]);

  const tableData: PaginatedResponse<PersonRead> = searchQuery
    ? { ...peoplePage, items: filteredItems, total_count: filteredItems.length }
    : peoplePage;

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
        filterBar={
          <PeopleListToolbar
            searchQuery={searchQuery}
            onSearchChange={(search) => {
              setFilterValues((prev) => ({ ...prev, search }));
              setOffset(0);
            }}
            statusFilter={statusFilter}
            onStatusChange={(status) => {
              setFilterValues((prev) => ({ ...prev, status }));
              setOffset(0);
            }}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onAddPerson={() => {
              resetForm();
              setDrawerOpen(true);
            }}
          />
        }
        primaryView={viewMode === "table" ? "table" : "cards"}
        table={
          <DataTable
            columns={[
              {
                key: "full_name",
                header: "نام",
                cell: (row) => (
                  <div className="flex items-center gap-[var(--primitive-space-3)]">
                    <Avatar name={row.full_name} size="sm" />
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-[var(--primitive-space-2)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                        <span className="truncate">{row.full_name}</span>
                        {isStaleLead(
                          row.status,
                          lastActivityByPerson.get(row.id),
                        ) ? (
                          <StaleLeadIndicator />
                        ) : null}
                      </p>
                      <p className="truncate text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                        {row.email ??
                          (row.phone ? formatPhoneDisplay(row.phone) : "—")}
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                key: "phone",
                header: "شماره تماس",
                cell: (row) =>
                  row.phone ? formatPhoneDisplay(row.phone) : "—",
              },
              {
                key: "status",
                header: "وضعیت",
                cell: (row) => (
                  <StatusBadge domain="person" value={row.status} />
                ),
              },
              {
                key: "last_activity",
                header: "آخرین فعالیت",
                align: "end",
                cell: (row) => {
                  const lastActivity = lastActivityByPerson.get(row.id);
                  return lastActivity
                    ? formatDateTimeDisplay(lastActivity, "YYYY/MM/DD")
                    : "—";
                },
              },
              {
                key: "action",
                header: "",
                align: "end",
                cell: (row) => (
                  <Link
                    href={`/people/${row.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className={cn(
                      "inline-flex items-center gap-[var(--primitive-space-1)] rounded-[var(--primitive-radius-full)]",
                      "border border-[var(--primitive-color-brand-200)] bg-[var(--primitive-color-brand-50)]",
                      "px-[var(--primitive-space-3)] py-[var(--primitive-space-1)]",
                      "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-semibold)]",
                      "text-[var(--primitive-color-brand-700)]",
                      "transition-colors hover:border-[var(--primitive-color-brand-300)] hover:bg-[var(--primitive-color-brand-100)]",
                      focusVisibleStyles,
                    )}
                  >
                    مشاهده
                    <ChevronLeft
                      className="icon-mirror-rtl size-[var(--primitive-space-3)]"
                      aria-hidden
                    />
                  </Link>
                ),
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
          <PersonCardGrid
            people={filteredItems}
            data={tableData}
            loading={loading}
            lastActivityByPerson={lastActivityByPerson}
            formatLastActivity={(value) =>
              formatDateTimeDisplay(value, "YYYY/MM/DD")
            }
            isStaleLead={isStaleLead}
            onPageChange={setOffset}
            emptyMessage="موردی یافت نشد"
          />
        }
      />

      <PersonFormDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="فرد جدید"
        state={formState}
        onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
        onSubmit={handleCreate}
        submitLabel="ثبت فرد"
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
