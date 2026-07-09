"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

import {
  AnalyticsChart,
  CalendarAgenda,
  DataTable,
  enrollmentByCourseChart,
  enrollmentTrendChart,
  mapClassStartDates,
  revenueByCourseChart,
  revenueTrendChart,
  StatCard,
} from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { ErrorState } from "@/components/feedback";
import { DashboardSkeleton } from "@/components/skeletons";
import { getCollectionReport, getEnrollmentReport, getRevenueReport } from "@/lib/api/reports";
import { listConsultations } from "@/lib/api/consultations";
import { listClasses, listInstallments, listInvoices } from "@/lib/api/finance";
import { listEnrollments, listPeople } from "@/lib/api/people";
import { listTasks } from "@/lib/api/tasks";
import { getMe } from "@/lib/api/users";
import type {
  CollectionRate,
  ConsultationRead,
  CourseClassRead,
  EnrollmentRead,
  EnrollmentTrends,
  InstallmentRead,
  PersonRead,
  RevenueSummary,
  TaskRead,
} from "@/lib/api/types";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import { getCurrentRole } from "@/lib/auth/role";
import {
  assessmentStatusLabel,
  isConsultationAssessmentComplete,
} from "@/lib/consultation/assessment";
import type { UserRole } from "@/lib/nav/types";
import { isConsultationIntakeTask } from "@/lib/task/consultation-task";
import { formatCount, formatDateDisplay, formatToman, todayDisplay, todayStorage } from "@/lib/locale";
import { STALE_LEAD_DAYS } from "@/lib/person/stale-lead";
import { TASK_TYPE_LABELS, terminologyLabel } from "@/lib/terminology";

const YEAR = dayjs().year();
const TODAY = todayStorage();

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: 50,
  offset: 0,
  has_more: false,
});

function consultationWizardHref(consultation: ConsultationRead): string {
  const step = isConsultationAssessmentComplete(consultation)
    ? "outcome"
    : "assessment";
  return `/people/${consultation.person_id}/consultations/${consultation.id}?step=${step}`;
}

function WidgetTable<T>({
  title,
  columns,
  items,
  emptyMessage,
  viewAllHref,
  onRowClick,
}: {
  title: string;
  columns: Parameters<typeof DataTable<T>>[0]["columns"];
  items: T[];
  emptyMessage: string;
  viewAllHref: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)] shadow-[var(--primitive-elevation-1)]">
      <h3 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
        {title}
      </h3>
      <DataTable
        columns={columns}
        data={{ ...emptyPage<T>(), items, total_count: items.length }}
        widgetMode={{ rowCap: 5, viewAllHref }}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
      />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>("admin");
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [people, setPeople] = React.useState<PersonRead[]>([]);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRead[]>([]);
  const [consultations, setConsultations] = React.useState<ConsultationRead[]>([]);
  const [tasks, setTasks] = React.useState<TaskRead[]>([]);
  const [classes, setClasses] = React.useState<CourseClassRead[]>([]);
  const [installments, setInstallments] = React.useState<InstallmentRead[]>([]);
  const [revenue, setRevenue] = React.useState<RevenueSummary | null>(null);
  const [enrollmentReport, setEnrollmentReport] = React.useState<EnrollmentTrends | null>(null);
  const [collection, setCollection] = React.useState<CollectionRate | null>(null);

  React.useEffect(() => {
    setRole(getCurrentRole());
  }, []);

  React.useEffect(() => {
    if (role !== "department_manager") {
      setCurrentUserId(null);
      return;
    }
    void getMe()
      .then((me) => setCurrentUserId(me.id))
      .catch(() => setCurrentUserId(null));
  }, [role]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        peopleRes,
        enrollmentRes,
        consultationRes,
        taskRes,
        classRes,
        invoiceRes,
        revenueRes,
        enrollmentTrendRes,
        collectionRes,
      ] = await Promise.all([
        listPeople({ limit: 1000 }),
        listEnrollments({ limit: 1000 }),
        listConsultations({ limit: 1000 }),
        listTasks({ limit: 1000 }),
        listClasses({ limit: 1000 }),
        listInvoices({ limit: 1000 }),
        getRevenueReport(YEAR),
        getEnrollmentReport(YEAR),
        getCollectionReport(),
      ]);

      const installmentPages = await Promise.all(
        invoiceRes.items.map((invoice) => listInstallments(invoice.id, { limit: 200 })),
      );

      setPeople(peopleRes.items);
      setEnrollments(enrollmentRes.items);
      setConsultations(consultationRes.items);
      setTasks(taskRes.items);
      setClasses(classRes.items);
      setInstallments(installmentPages.flatMap((page) => page.items));
      setRevenue(revenueRes);
      setEnrollmentReport(enrollmentTrendRes);
      setCollection(collectionRes);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری داشبورد"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const students = people.filter((person) => person.status === "student");
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "active");
  const currentMonth = dayjs().format("YYYY-MM");
  const mtdRevenue = revenue?.by_month.find((item) => item.month === currentMonth)?.amount ?? 0;
  const staleCutoff = dayjs().subtract(STALE_LEAD_DAYS, "day");
  const staleLeads = people.filter(
    (person) => person.status === "lead" && dayjs(person.created_at).isBefore(staleCutoff),
  );
  const newLeadsThisWeek = people.filter(
    (person) => person.status === "lead" && dayjs(person.created_at).isAfter(dayjs().subtract(7, "day")),
  );
  const pendingConsultations = consultations.filter((consultation) => consultation.outcome === null);
  const myPendingConsultations =
    currentUserId != null
      ? pendingConsultations.filter((consultation) => consultation.consultant_id === currentUserId)
      : [];
  const peopleById = React.useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );
  const overdueInstallments = installments.filter((installment) => installment.status === "overdue");
  const todaysClasses = classes.filter(
    (cls) => cls.start_date === TODAY || cls.status === "active",
  );
  const openTasks = tasks.filter((task) => task.status === "open");
  const openTasksAssignedToMe =
    currentUserId != null
      ? openTasks
          .filter((task) => task.assignee_id === currentUserId)
          .filter((task) => !isConsultationIntakeTask(task))
      : [];

  if (error) return <ErrorState error={error} />;

  const header = (
    <div>
      <p className="text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
        داشبورد
      </p>
      <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
        {todayDisplay()}
      </p>
    </div>
  );

  const widgets =
    role === "admin"
      ? [
          { colSpan: 3, content: <StatCard label="کل دانش‌آموزان" value={students.length} /> },
          { colSpan: 3, content: <StatCard label="ثبت‌نام فعال" value={activeEnrollments.length} /> },
          { colSpan: 3, content: <StatCard label="درآمد ماه جاری" value={mtdRevenue} valueFormat="toman" /> },
          {
            colSpan: 3,
            content: (
              <StatCard
                label="نرخ وصول"
                value={`${formatCount(Math.round(collection?.collection_rate_percent ?? 0))}٪`}
                valueFormat="text"
              />
            ),
          },
          {
            colSpan: 6,
            content: revenue ? <AnalyticsChart data={revenueTrendChart(revenue, YEAR)} /> : null,
          },
          {
            colSpan: 6,
            content:
              enrollmentReport ? <AnalyticsChart data={enrollmentByCourseChart(enrollmentReport)} /> : null,
          },
        ]
      : role === "admission"
        ? [
            { colSpan: 3, content: <StatCard label="سرنخ‌های جدید هفته" value={newLeadsThisWeek.length} /> },
            {
              colSpan: 9,
              content:
                enrollmentReport ? <AnalyticsChart data={enrollmentTrendChart(enrollmentReport, YEAR)} /> : null,
            },
            {
              colSpan: 12,
              content: (
                <WidgetTable<ConsultationRead>
                  title="مشاوره‌های در انتظار"
                  columns={[
                    { key: "id", header: "شناسه", cell: (row) => `#${row.id}` },
                    { key: "goal", header: "هدف", cell: (row) => row.goal ?? "—" },
                    {
                      key: "created_at",
                      header: "تاریخ",
                      align: "end",
                      cell: (row) => formatDateDisplay(row.created_at.slice(0, 10)),
                    },
                  ]}
                  items={pendingConsultations}
                  emptyMessage="موردی یافت نشد"
                  viewAllHref="/people"
                />
              ),
            },
            {
              colSpan: 12,
              content: (
                <WidgetTable<PersonRead>
                  title="سرنخ‌های راکد"
                  columns={[
                    { key: "full_name", header: "نام" },
                    { key: "phone", header: "تلفن", cell: (row) => row.phone ?? "—" },
                    {
                      key: "created_at",
                      header: "ایجاد",
                      align: "end",
                      cell: (row) => formatDateDisplay(row.created_at.slice(0, 10)),
                    },
                  ]}
                  items={staleLeads}
                  emptyMessage="سرنخ راکدی وجود ندارد"
                  viewAllHref="/people?status=lead"
                />
              ),
            },
          ]
        : role === "finance"
          ? [
              {
                colSpan: 4,
                content: (
                  <AnalyticsChart
                    data={{
                      variant: "gauge",
                      title: "نرخ وصول",
                      percent: collection?.collection_rate_percent ?? 0,
                      subtitles: [
                        `وصول‌شده: ${formatToman(collection?.total_paid ?? 0, { suffix: true })}`,
                      ],
                    }}
                  />
                ),
              },
              {
                colSpan: 8,
                content: (
                  <WidgetTable<InstallmentRead>
                    title="اقساط معوق"
                    columns={[
                      { key: "invoice_id", header: "فاکتور", cell: (row) => `#${row.invoice_id}` },
                      { key: "sequence", header: "قسط", cell: (row) => formatCount(row.sequence) },
                      { key: "amount", header: "مبلغ", align: "end", cell: (row) => formatToman(row.amount) },
                      { key: "due_date", header: "سررسید", align: "end", cell: (row) => formatDateDisplay(row.due_date) },
                    ]}
                    items={overdueInstallments}
                    emptyMessage="قسط معوقی وجود ندارد"
                    viewAllHref="/invoices"
                  />
                ),
              },
              {
                colSpan: 12,
                content: revenue ? <AnalyticsChart data={revenueByCourseChart(revenue)} /> : null,
              },
            ]
          : role === "teacher"
            ? [
                {
                  colSpan: 12,
                  content: (
                    <WidgetTable<CourseClassRead>
                      title="کلاس‌های امروز"
                      columns={[
                        { key: "name", header: "کلاس" },
                        { key: "status", header: "وضعیت", cell: (row) => terminologyLabel(row.status) },
                        { key: "start_date", header: "شروع", align: "end", cell: (row) => formatDateDisplay(row.start_date) },
                      ]}
                      items={todaysClasses}
                      emptyMessage="کلاسی برای امروز یافت نشد"
                      viewAllHref="/classes"
                    />
                  ),
                },
                {
                  colSpan: 12,
                  content: (
                    <div className="rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)] shadow-[var(--primitive-elevation-1)]">
                      <h3 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
                        دستور کار کلاس‌ها
                      </h3>
                      <CalendarAgenda events={mapClassStartDates(classes)} mode="agenda" />
                    </div>
                  ),
                },
              ]
            : [
                {
                  colSpan: 12,
                  content: (
                    <WidgetTable<ConsultationRead>
                      title="مشاوره‌های در انتظار من"
                      columns={[
                        {
                          key: "person",
                          header: "شخص",
                          cell: (row) => peopleById.get(row.person_id)?.full_name ?? `#${row.person_id}`,
                        },
                        { key: "goal", header: "هدف", cell: (row) => row.goal ?? "—" },
                        {
                          key: "assessment",
                          header: "ارزیابی",
                          cell: (row) => assessmentStatusLabel(row),
                        },
                        {
                          key: "created_at",
                          header: "تاریخ",
                          align: "end",
                          cell: (row) => formatDateDisplay(row.created_at.slice(0, 10)),
                        },
                      ]}
                      items={myPendingConsultations}
                      emptyMessage="مشاوره‌ای در انتظار نیست"
                      viewAllHref="/tasks"
                      onRowClick={(row) => router.push(consultationWizardHref(row))}
                    />
                  ),
                },
                {
                  colSpan: 12,
                  content: (
                    <WidgetTable<TaskRead>
                      title="وظایف باز من"
                      columns={[
                        { key: "type", header: "نوع", cell: (row) => TASK_TYPE_LABELS[row.type] },
                        { key: "title", header: "عنوان" },
                        { key: "due_date", header: "موعد", align: "end", cell: (row) => formatDateDisplay(row.due_date) },
                      ]}
                      items={openTasksAssignedToMe}
                      emptyMessage="وظیفه بازی وجود ندارد"
                      viewAllHref="/tasks"
                    />
                  ),
                },
                {
                  colSpan: 12,
                  content:
                    enrollmentReport ? <AnalyticsChart data={enrollmentByCourseChart(enrollmentReport)} /> : null,
                },
              ];

  return (
    <div className={loading ? "pointer-events-none opacity-70" : undefined}>
      <DashboardSkeleton header={header} widgets={widgets.filter((widget) => widget.content != null)} />
    </div>
  );
}
