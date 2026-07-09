"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ReceiptText } from "lucide-react";

import {
  CardListState,
  DataTable,
  EntitySummaryCard,
} from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { StatusBadge } from "@/components/domain";
import { ErrorState } from "@/components/feedback";
import { FilterBar, type FilterValues } from "@/components/layout";
import { ListPageSkeleton } from "@/components/skeletons";
import { toApiError } from "@/lib/api/errors";
import type { ApiError } from "@/lib/api/error";
import {
  listClasses,
  listEnrollments,
  listInvoices,
} from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import type {
  CourseClassRead,
  EnrollmentRead,
  InvoiceRead,
  InvoiceStatus,
  PersonRead,
} from "@/lib/api/types";
import { formatDateTimeDisplay, formatToman } from "@/lib/locale";
import { terminologyLabel } from "@/lib/terminology";

const PAGE_LIMIT = 50;

const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "open", label: terminologyLabel("open") },
  { value: "partially_paid", label: terminologyLabel("partially_paid") },
  { value: "paid", label: terminologyLabel("paid") },
  { value: "void", label: terminologyLabel("void") },
];

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

export default function InvoicesListPage() {
  const router = useRouter();

  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [invoicesPage, setInvoicesPage] =
    React.useState<PaginatedResponse<InvoiceRead>>(emptyPage);
  const [people, setPeople] = React.useState<PersonRead[]>([]);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRead[]>([]);
  const [classes, setClasses] = React.useState<CourseClassRead[]>([]);

  const statusFilter =
    typeof filterValues.status === "string"
      ? (filterValues.status as InvoiceStatus)
      : undefined;

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoiceRes, enrollmentRes, peopleRes, classRes] = await Promise.all([
        listInvoices({ limit: PAGE_LIMIT, offset }),
        listEnrollments({ limit: 500 }),
        listPeople({ limit: 500 }),
        listClasses({ limit: 500 }),
      ]);
      setInvoicesPage(invoiceRes);
      setEnrollments(enrollmentRes.items);
      setPeople(peopleRes.items);
      setClasses(classRes.items);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری فاکتورها"));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const personNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const person of people) {
      map.set(person.id, person.full_name);
    }
    return map;
  }, [people]);

  const enrollmentById = React.useMemo(() => {
    const map = new Map<number, EnrollmentRead>();
    for (const enrollment of enrollments) {
      map.set(enrollment.id, enrollment);
    }
    return map;
  }, [enrollments]);

  const classNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const cls of classes) {
      map.set(cls.id, cls.name);
    }
    return map;
  }, [classes]);

  const filteredItems = React.useMemo(() => {
    return invoicesPage.items.filter((invoice) => {
      if (statusFilter && invoice.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [invoicesPage.items, statusFilter]);

  const tableData: PaginatedResponse<InvoiceRead> = {
    ...invoicesPage,
    items: filteredItems,
    total_count: filteredItems.length,
    has_more: false,
  };

  const facets = React.useMemo(
    () => [
      {
        id: "status",
        type: "select" as const,
        label: "وضعیت",
        placeholder: "همه",
        options: INVOICE_STATUS_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      },
    ],
    [],
  );

  const enrollmentLabel = (enrollmentId: number) => {
    const enrollment = enrollmentById.get(enrollmentId);
    if (!enrollment) return "—";
    const personName = personNameById.get(enrollment.person_id) ?? "—";
    const className = classNameById.get(enrollment.class_id) ?? "—";
    return `${personName} — ${className}`;
  };

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <ListPageSkeleton
      title="فاکتورها"
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
              key: "enrollment",
              header: "ثبت‌نام",
              cell: (row) => enrollmentLabel(row.enrollment_id),
            },
            {
              key: "total_amount",
              header: "مبلغ کل",
              align: "end",
              cell: (row) => formatToman(row.total_amount),
            },
            {
              key: "status",
              header: "وضعیت",
              cell: (row) => (
                <StatusBadge domain="invoice" value={row.status} />
              ),
            },
            {
              key: "created_at",
              header: "تاریخ صدور",
              align: "end",
              cell: (row) =>
                formatDateTimeDisplay(row.created_at, "YYYY/MM/DD"),
            },
          ]}
          data={tableData}
          loading={loading}
          onPageChange={setOffset}
          onRowClick={(row) => router.push(`/invoices/${row.id}`)}
          emptyMessage="فاکتوری یافت نشد"
        />
      }
      cardList={
        <div className="flex flex-col gap-[var(--primitive-space-3)]">
          <CardListState
            loading={loading}
            empty={filteredItems.length === 0}
            emptyIcon={ReceiptText}
            emptyMessage={
              statusFilter
                ? "فاکتوری با این فیلتر یافت نشد."
                : "هنوز فاکتوری صادر نشده است."
            }
            skeletonCount={4}
          >
            {filteredItems.map((invoice) => (
              <EntitySummaryCard
                key={invoice.id}
                title={enrollmentLabel(invoice.enrollment_id)}
                subtitle={formatToman(invoice.total_amount)}
                badges={<StatusBadge domain="invoice" value={invoice.status} />}
                meta={formatDateTimeDisplay(invoice.created_at, "YYYY/MM/DD")}
                onClick={() => router.push(`/invoices/${invoice.id}`)}
              />
            ))}
          </CardListState>
        </div>
      }
    />
  );
}
