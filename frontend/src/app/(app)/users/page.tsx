"use client";

import * as React from "react";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { PermissionBanner } from "@/components/domain/permission-banner";
import { AppDrawer, ErrorState, useToast } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import { FilterBar, type FilterValues } from "@/components/layout";
import { Badge } from "@/components/primitives/badge";
import { ListPageSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { listDepartments } from "@/lib/api/departments";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { DepartmentRead, UserRead, UserRole } from "@/lib/api/types";
import { createUser, listUsers } from "@/lib/api/users";
import { getDevUserRole } from "@/lib/auth/role";
import { USER_ROLE_OPTIONS } from "@/lib/terminology";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 50;

function roleLabel(role: UserRole): string {
  return USER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant="neutral">{roleLabel(role)}</Badge>;
}

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

const DEPARTMENT_REQUIRED_ROLES: UserRole[] = ["teacher", "department_manager"];

export default function UsersListPage() {
  const { toast } = useToast();
  const isAdmin = getDevUserRole() === "admin";

  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [usersPage, setUsersPage] =
    React.useState<PaginatedResponse<UserRead>>(emptyPage);
  const [departments, setDepartments] = React.useState<DepartmentRead[]>([]);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPassword, setFormPassword] = React.useState("");
  const [formRole, setFormRole] = React.useState<UserRole>("teacher");
  const [formDepartmentId, setFormDepartmentId] = React.useState("");
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const roleFilter =
    typeof filterValues.role === "string" ? filterValues.role : undefined;

  const loadData = React.useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [users, deptRes] = await Promise.all([
        listUsers({ limit: PAGE_LIMIT, offset }),
        listDepartments({ limit: 100 }),
      ]);
      setUsersPage(users);
      setDepartments(deptRes.items);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری کاربران"));
    } finally {
      setLoading(false);
    }
  }, [offset, isAdmin]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = React.useMemo(() => {
    return usersPage.items.filter((user) => {
      if (roleFilter && user.role !== roleFilter) {
        return false;
      }
      return true;
    });
  }, [usersPage.items, roleFilter]);

  const tableData: PaginatedResponse<UserRead> = {
    ...usersPage,
    items: filteredItems,
    total_count: roleFilter ? filteredItems.length : usersPage.total_count,
  };

  const facets = React.useMemo(
    () => [
      {
        id: "role",
        type: "select" as const,
        label: "نقش",
        placeholder: "همه",
        options: USER_ROLE_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      },
    ],
    [],
  );

  const departmentRequired = DEPARTMENT_REQUIRED_ROLES.includes(formRole);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("teacher");
    setFormDepartmentId("");
    setFormError(null);
    setFieldError(null);
  };

  const handleCreate = async () => {
    if (
      !formName.trim() ||
      !formEmail.trim() ||
      !formPassword.trim() ||
      (departmentRequired && !formDepartmentId)
    ) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      await createUser({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
        department_id: formDepartmentId ? Number(formDepartmentId) : null,
      });
      toast({ variant: "success", title: "کاربر جدید ثبت شد" });
      setDrawerOpen(false);
      resetForm();
      void loadData();
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        setFormError(toApiError(err, "خطا در ثبت کاربر"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[var(--semantic-space-sectionGap)]">
        <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          کاربران
        </h1>
        <PermissionBanner message="فقط مدیر سیستم به این صفحه دسترسی دارد" />
      </div>
    );
  }

  if (error && !loading && usersPage.items.length === 0) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <ListPageSkeleton
        title="کاربران"
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
            افزودن کاربر
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
              { key: "name", header: "نام" },
              { key: "email", header: "ایمیل" },
              {
                key: "role",
                header: "نقش",
                cell: (row) => <RoleBadge role={row.role} />,
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
            emptyMessage="کاربری یافت نشد"
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
                کاربری یافت نشد
              </p>
            ) : (
              filteredItems.map((user) => (
                <EntitySummaryCard
                  key={user.id}
                  title={user.name}
                  subtitle={user.email}
                  badges={
                    <>
                      <RoleBadge role={user.role} />
                      <ActiveBadge isActive={user.is_active} />
                    </>
                  }
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
        title="افزودن کاربر"
        onSubmit={handleCreate}
        submitLabel="ثبت"
        submitLoading={submitting}
        submitDisabled={
          !formName.trim() ||
          !formEmail.trim() ||
          !formPassword.trim() ||
          (departmentRequired && !formDepartmentId)
        }
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
            label="ایمیل"
            required
            error={fieldError?.field === "email" ? fieldError : null}
          >
            <TextInput
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </FormField>
          <FormField
            label="رمز عبور"
            required
            error={fieldError?.field === "password" ? fieldError : null}
          >
            <TextInput
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
            />
          </FormField>
          <FormField
            label="نقش"
            required
            error={fieldError?.field === "role" ? fieldError : null}
          >
            <Select
              options={USER_ROLE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={formRole}
              onChange={(value) => setFormRole(value as UserRole)}
            />
          </FormField>
          <FormField
            label="دپارتمان"
            required={departmentRequired}
            error={fieldError?.field === "department_id" ? fieldError : null}
          >
            <Select
              options={departments.map((dept) => ({
                value: String(dept.id),
                label: dept.name,
              }))}
              value={formDepartmentId}
              onChange={setFormDepartmentId}
              placeholder="انتخاب دپارتمان"
            />
          </FormField>
        </div>
      </AppDrawer>
    </>
  );
}
