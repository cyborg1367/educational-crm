"use client";

import * as React from "react";
import Link from "next/link";

import { BlockSkeleton } from "@/components/feedback/skeleton";
import { FormField } from "@/components/form/form-field";
import { Checkbox } from "@/components/form/selection-control";
import { Textarea } from "@/components/form/textarea";
import type { DepartmentRead } from "@/lib/api/types";

export type ReferralFormFieldsProps = {
  departments: DepartmentRead[];
  loading: boolean;
  selectedDepartmentIds: Set<number>;
  onToggleDepartment: (departmentId: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  submitting?: boolean;
  progress?: { current: number; total: number } | null;
};

function ReferralFormFields({
  departments,
  loading,
  selectedDepartmentIds,
  onToggleDepartment,
  notes,
  onNotesChange,
  submitting = false,
  progress = null,
}: ReferralFormFieldsProps) {
  if (loading) {
    return <BlockSkeleton height="160px" width="100%" />;
  }

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          انتخاب دپارتمان
        </h3>

        {departments.length === 0 ? (
          <div className="rounded-[var(--primitive-radius-md)] border border-dashed border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-4)] py-[var(--primitive-space-4)]">
            <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
              دپارتمان فعالی وجود ندارد. برای ارجاع مشاوره، ابتدا یک دپارتمان
              با مدیر تعریف کنید.
            </p>
            <Link
              href="/departments"
              className="mt-[var(--primitive-space-3)] inline-block text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-action-primary)] hover:text-[var(--semantic-color-action-primaryHover)]"
            >
              رفتن به دپارتمان‌ها →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--primitive-space-3)]">
            {departments.map((department) => (
              <Checkbox
                key={department.id}
                label={
                  department.manager_id == null
                    ? `${department.name} (بدون مدیر — غیرفعال برای ارجاع)`
                    : department.name
                }
                checked={selectedDepartmentIds.has(department.id)}
                disabled={department.manager_id == null || submitting}
                onChange={() => onToggleDepartment(department.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          یادداشت
        </h3>

        <FormField label="یادداشت برای مشاور">
          <Textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="یادداشت برای مشاور..."
            rows={4}
            disabled={submitting}
          />
        </FormField>

        {progress ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            در حال ارجاع ({progress.current}/{progress.total})…
          </p>
        ) : null}
      </section>
    </div>
  );
}

export { ReferralFormFields };
