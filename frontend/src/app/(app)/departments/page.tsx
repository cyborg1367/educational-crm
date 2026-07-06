"use client";

import * as React from "react";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import {
  departmentFormStateToCreateBody,
  DepartmentFormFields,
  emptyDepartmentFormState,
  type DepartmentFormState,
} from "@/components/domain/department-form-fields";
import { FormDialog } from "@/components/domain/form-dialog";
import { ErrorState, useToast } from "@/components/feedback";
import { ListPageSkeleton } from "@/components/skeletons";
import { Avatar } from "@/components/primitives/avatar";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/ui/button";
import { createDepartment, listDepartments } from "@/lib/api/departments";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import { availableInstituteDepartmentNames } from "@/lib/department/institute-departments";
import type { DepartmentRead, UserRead } from "@/lib/api/types";
import { listUsers } from "@/lib/api/users";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 50;

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant={isActive ? undefined : "neutral"}
      className={cn(
        isActive &&
          "bg-[color-mix(in_srgb,var(--semantic-color-surface-subtle)_88%,var(--semantic-color-surface-border))] text-[var(--semantic-color-status-success)]",
      )}
    >
      {isActive ? "فعال" : "غیرفعال"}
    </Badge>
  );
}

type DepartmentRow = DepartmentRead & { manager_name: string };

export default function DepartmentsListPage() {
  const { toast } = useToast();

  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [departmentsPage, setDepartmentsPage] =
    React.useState<PaginatedResponse<DepartmentRead>>(emptyPage);
  const [users, setUsers] = React.useState<UserRead[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formState, setFormState] = React.useState<DepartmentFormState>(
    emptyDepartmentFormState(),
  );
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, usersRes] = await Promise.all([
        listDepartments({ limit: PAGE_LIMIT, offset }),
        listUsers({ limit: 500 }).catch(() => ({
          items: [],
          total_count: 0,
          limit: 500,
          offset: 0,
          has_more: false,
        })),
      ]);
      setDepartmentsPage(deptRes);
      setUsers(usersRes.items);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری دپارتمان‌ها"));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const usersById = React.useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const managerOptions = React.useMemo(
    () =>
      users.filter(
        (user) =>
          user.is_active &&
          (user.role === "admin" || user.role === "department_manager"),
      ),
    [users],
  );

  const rows: DepartmentRow[] = React.useMemo(
    () =>
      departmentsPage.items.map((dept) => ({
        ...dept,
        manager_name: dept.manager_id
          ? usersById.get(dept.manager_id)?.name ?? "—"
          : "—",
      })),
    [departmentsPage.items, usersById],
  );

  const tableData: PaginatedResponse<DepartmentRow> = {
    ...departmentsPage,
    items: rows,
  };

  const availableDepartmentNames = React.useMemo(
    () => availableInstituteDepartmentNames(rows.map((row) => row.name)),
    [rows],
  );

  const resetForm = () => {
    setFormState({
      ...emptyDepartmentFormState(),
      name: availableDepartmentNames[0] ?? "",
    });
    setFormError(null);
    setFieldError(null);
  };

  const handleCreate = async () => {
    if (!formState.name.trim()) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      await createDepartment(departmentFormStateToCreateBody(formState));
      toast({ variant: "success", title: "دپارتمان جدید ثبت شد" });
      setDialogOpen(false);
      resetForm();
      void loadData();
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        setFormError(toApiError(err, "خطا در ثبت دپارتمان"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !loading && departmentsPage.items.length === 0) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <ListPageSkeleton
        title="دپارتمان‌ها"
        headerAction={
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={availableDepartmentNames.length === 0}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            افزودن دپارتمان
          </Button>
        }
        filterBar={<div />}
        table={
          <DataTable
            columns={[
              { key: "name", header: "نام" },
              {
                key: "manager_name",
                header: "مدیر",
                cell: (row) => (
                  <span className="inline-flex items-center gap-[var(--primitive-space-2)]">
                    {row.manager_id ? (
                      <Avatar name={row.manager_name} size="sm" />
                    ) : null}
                    {row.manager_name}
                  </span>
                ),
              },
              {
                key: "is_active",
                header: "وضعیت",
                cell: (row) => <ActiveBadge isActive={row.is_active} />,
              },
            ]}
            data={tableData}
            loading={loading}
            onPageChange={setOffset}
            emptyMessage="دپارتمانی یافت نشد"
          />
        }
        cardList={
          <div className="flex flex-col gap-[var(--primitive-space-3)]">
            {loading ? (
              <p className="text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                در حال بارگذاری…
              </p>
            ) : rows.length === 0 ? (
              <p className="text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                دپارتمانی یافت نشد
              </p>
            ) : (
              rows.map((row) => (
                <EntitySummaryCard
                  key={row.id}
                  title={row.name}
                  subtitle={row.manager_name}
                  badges={<ActiveBadge isActive={row.is_active} />}
                />
              ))
            )}
          </div>
        }
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="افزودن دپارتمان"
        submitLabel="ثبت"
        onSubmit={() => void handleCreate()}
        submitLoading={submitting}
        submitDisabled={
          !formState.name.trim() || availableDepartmentNames.length === 0
        }
        formError={formError}
      >
        <DepartmentFormFields
          state={formState}
          onChange={(patch) =>
            setFormState((prev) => ({ ...prev, ...patch }))
          }
          managerOptions={managerOptions}
          availableNames={availableDepartmentNames}
          fieldError={fieldError}
        />
      </FormDialog>
    </>
  );
}
