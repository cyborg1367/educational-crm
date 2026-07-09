"use client";

import * as React from "react";

import { ErrorState } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { TextInput } from "@/components/form/text-input";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import { getMyOrg } from "@/lib/api/organizations";

export default function SettingsOrgPage() {
  const [loading, setLoading] = React.useState(true);
  const [orgName, setOrgName] = React.useState("…");
  const [error, setError] = React.useState<ApiError | null>(null);

  React.useEffect(() => {
    void (async () => {
      try {
        const org = await getMyOrg();
        setOrgName(org.name);
      } catch (err) {
        setError(toApiError(err, "خطا در بارگذاری اطلاعات سازمان"));
        setOrgName("—");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error && !loading) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="flex flex-col gap-[var(--primitive-space-6)]">
      <div>
        <h2 className="text-[length:var(--primitive-font-size-xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          سازمان
        </h2>
        <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          اطلاعات سازمان (فعلاً فقط خواندنی)
        </p>
      </div>
      <FormField label="نام سازمان">
        <TextInput
          value={loading ? "…" : orgName}
          readOnly
          disabled
          onChange={() => undefined}
        />
      </FormField>
    </div>
  );
}
