"use client";

import * as React from "react";

import { ErrorState } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { TextInput } from "@/components/form/text-input";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import type { UserRead } from "@/lib/api/types";
import { getMe } from "@/lib/api/users";

export default function SettingsProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [profile, setProfile] = React.useState<Pick<UserRead, "name" | "email">>({
    name: "—",
    email: "—",
  });

  React.useEffect(() => {
    void (async () => {
      try {
        const user = await getMe();
        setProfile({ name: user.name, email: user.email });
      } catch (err) {
        setError(toApiError(err, "خطا در بارگذاری پروفایل"));
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
          پروفایل
        </h2>
        <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          اطلاعات حساب کاربری (فعلاً فقط خواندنی)
        </p>
      </div>
      <FormField label="نام">
        <TextInput
          value={loading ? "…" : profile.name}
          readOnly
          disabled
          onChange={() => undefined}
        />
      </FormField>
      <FormField label="ایمیل">
        <TextInput
          type="email"
          value={loading ? "…" : profile.email}
          readOnly
          disabled
          onChange={() => undefined}
        />
      </FormField>
    </div>
  );
}
