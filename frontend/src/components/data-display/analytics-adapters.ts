import type {
  CollectionRate,
  EnrollmentTrends,
  RevenueSummary,
} from "@/lib/api/types";
import { formatYearMonthLabel } from "@/lib/locale/month-label";
import { formatToman } from "@/lib/locale/number";

import type { AnalyticsChartData } from "./analytics-chart";

export function revenueTrendChart(
  data: RevenueSummary,
  year: number,
): AnalyticsChartData {
  return {
    variant: "line",
    title: `روند درآمد ${year}`,
    valueFormat: "toman",
    points: data.by_month.map((item) => ({
      label: formatYearMonthLabel(item.month),
      value: item.amount,
    })),
  };
}

export function enrollmentTrendChart(
  data: EnrollmentTrends,
  year: number,
): AnalyticsChartData {
  return {
    variant: "line",
    title: `روند ثبت‌نام ${year}`,
    valueFormat: "count",
    points: data.by_month.map((item) => ({
      label: formatYearMonthLabel(item.month),
      value: item.count,
    })),
  };
}

export function revenueByCourseChart(data: RevenueSummary): AnalyticsChartData {
  return {
    variant: "bar",
    title: "درآمد به تفکیک دوره",
    valueFormat: "toman",
    items: data.by_course.map((item) => ({
      label: item.course_name,
      value: item.amount,
    })),
  };
}

export function enrollmentByCourseChart(
  data: EnrollmentTrends,
): AnalyticsChartData {
  return {
    variant: "bar",
    title: "ثبت‌نام به تفکیک دوره",
    valueFormat: "count",
    items: data.by_course.map((item) => ({
      label: item.course_name,
      value: item.count,
    })),
  };
}

export function collectionGaugeChart(data: CollectionRate): AnalyticsChartData {
  return {
    variant: "gauge",
    title: "نرخ وصول",
    percent: data.collection_rate_percent,
    subtitles: [
      `وصول‌شده: ${formatToman(data.total_paid, { suffix: true })}`,
      `صادرشده: ${formatToman(data.total_invoiced, { suffix: true })}`,
      `مانده: ${formatToman(data.pending_amount, { suffix: true })}`,
    ],
  };
}
