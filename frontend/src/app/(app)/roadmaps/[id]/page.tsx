"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { ErrorState } from "@/components/feedback";
import { T2DetailSkeleton } from "@/components/skeletons";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import { getRoadmap } from "@/lib/api/roadmaps";

export default function RoadmapDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const roadmapId = Number(params.id);

  const [error, setError] = React.useState<ApiError | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(roadmapId)) {
      setError({
        detail: "شناسه نقشه راه نامعتبر است",
        error_code: "NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const roadmap = await getRoadmap(roadmapId);
        if (!cancelled) {
          router.replace(`/departments/${roadmap.department_id}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(toApiError(err, "خطا در بارگذاری نقشه راه"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roadmapId, router]);

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <T2DetailSkeleton title="در حال انتقال…">
      <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
        در حال انتقال به صفحه دپارتمان…
      </p>
    </T2DetailSkeleton>
  );
}
