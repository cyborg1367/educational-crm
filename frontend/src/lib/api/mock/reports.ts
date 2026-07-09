import type {
  CollectionRate,
  EnrollmentTrends,
  RevenueSummary,
} from "@/lib/api/types";

export function mockRevenueSummary(year: number): RevenueSummary {
  return {
    total_revenue: 185_000_000,
    by_month: [
      { month: `${year}-01`, amount: 12_000_000 },
      { month: `${year}-02`, amount: 15_500_000 },
      { month: `${year}-03`, amount: 18_200_000 },
      { month: `${year}-04`, amount: 14_800_000 },
      { month: `${year}-05`, amount: 16_300_000 },
      { month: `${year}-06`, amount: 19_100_000 },
    ],
    by_course: [
      { course_id: 1, course_name: "IELTS Preparation", amount: 72_000_000 },
      { course_id: 2, course_name: "Python Basics", amount: 48_500_000 },
      { course_id: 3, course_name: "English Conversation", amount: 35_200_000 },
      { course_id: 4, course_name: "TOEFL Intensive", amount: 29_300_000 },
    ],
  };
}

export function mockEnrollmentTrends(year: number): EnrollmentTrends {
  return {
    total_enrollments: 142,
    by_month: [
      { month: `${year}-01`, count: 18 },
      { month: `${year}-02`, count: 22 },
      { month: `${year}-03`, count: 28 },
      { month: `${year}-04`, count: 24 },
      { month: `${year}-05`, count: 26 },
      { month: `${year}-06`, count: 24 },
    ],
    by_course: [
      { course_id: 1, course_name: "IELTS Preparation", count: 52 },
      { course_id: 2, course_name: "Python Basics", count: 38 },
      { course_id: 3, course_name: "English Conversation", count: 31 },
      { course_id: 4, course_name: "TOEFL Intensive", count: 21 },
    ],
  };
}

export function mockCollectionRate(): CollectionRate {
  return {
    total_invoiced: 220_000_000,
    total_paid: 187_000_000,
    collection_rate_percent: 85.0,
    pending_amount: 33_000_000,
  };
}
