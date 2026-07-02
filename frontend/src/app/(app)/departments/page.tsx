"use client";

import * as React from "react";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { AppDrawer, ErrorState, useToast } from "@/components/feedback";
import { Checkbox } from "@/components/form/selection-control";
import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import { ListPageSkeleton } from "@/components/skeletons";
import { Avatar } from "@/components/primitives/avatar";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/ui/button";
import { createDepartment, listDepartments } from "@/lib/api/departments";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
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

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formManagerId, setFormManagerId] = React.useState("");
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, usersRes] = await Promise.all([
        listDepartments({ limit: PAGE_LIMIT, offset }),
        listUsers({ limit: 500 }).catch(() => ({ items: [], total_count: 0, limit: 500, offset: 0, has_more: false })),
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

  const resetForm = () => {
    setFormName("");
    setFormManagerId("");
    setFormIsActive(true);
    setFormError(null);
    setFieldError(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      await createDepartment({
        name: formName.trim(),
        manager_id: formManagerId ? Number(formManagerId) : null,
        is_active: formIsActive,
      });
      toast({ variant: "success", title: "دپارتمان جدید ثبت شد" });
      setDrawerOpen(false);
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
            onClick={() => {
              resetForm();
              setDrawerOpen(true);
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

      <AppDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="form"
        title="افزودن دپارتمان"
        onSubmit={handleCreate}
        submitLabel="ثبت"
        submitLoading={submitting}
        submitDisabled={!formName.trim()}
      >
        {formError ? (
          <ErrorState error={formError} className="py-[var(--primitive-space-4)]" />
        ) : null}
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <FormField
            label="نام"
            required
            error={fieldError?.field === "name" ? fieldError : null}
          >
            <TextInput
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </FormField>
          <FormField
            label="مدیر"
            error={fieldError?.field === "manager_id" ? fieldError : null}
          >
            <Select
              options={managerOptions.map((user) => ({
                value: String(user.id),
                label: user.name,
              }))}
              value={formManagerId}
              onChange={setFormManagerId}
              placeholder="بدون مدیر"
            />
          </FormField>
          <Checkbox
            label="فعال"
            checked={formIsActive}
            onChange={(e) => setFormIsActive(e.target.checked)}
          />
        </div>
      </AppDrawer>
    </>
  );
}
