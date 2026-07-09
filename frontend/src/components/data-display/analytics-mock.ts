import {
  mockCollectionRate,
  mockEnrollmentTrends,
  mockRevenueSummary,
} from "@/lib/api/mock/reports";

import {
  collectionGaugeChart,
  enrollmentByCourseChart,
  enrollmentTrendChart,
  revenueByCourseChart,
  revenueTrendChart,
} from "./analytics-adapters";

const MOCK_YEAR = 2026;

export const mockRevenueTrendChart = revenueTrendChart(
  mockRevenueSummary(MOCK_YEAR),
  MOCK_YEAR,
);

export const mockEnrollmentTrendChart = enrollmentTrendChart(
  mockEnrollmentTrends(MOCK_YEAR),
  MOCK_YEAR,
);

export const mockRevenueByCourseChart = revenueByCourseChart(
  mockRevenueSummary(MOCK_YEAR),
);

export const mockEnrollmentByCourseChart = enrollmentByCourseChart(
  mockEnrollmentTrends(MOCK_YEAR),
);

export const mockCollectionGaugeChart = collectionGaugeChart(mockCollectionRate());
