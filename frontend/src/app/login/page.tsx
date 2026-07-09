"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { LoginHeroPanel } from "@/components/auth/login-hero-panel";
import { ErrorState } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { TextInput } from "@/components/form/text-input";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api/config";
import { getAccessToken, setAccessToken } from "@/lib/api/auth-token";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import { getMe } from "@/lib/api/users";
import { setCurrentRole } from "@/lib/auth/role";

type TokenResponse = {
  access_token: string;
  token_type: string;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const nextPathRef = React.useRef<string>("/dashboard");
  const [email, setEmail] = React.useState("admin@example.com");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<ApiError | null>(null);

  React.useEffect(() => {
    const nextPath = new URLSearchParams(window.location.search).get("next");
    if (nextPath) {
      nextPathRef.current = nextPath;
    }
    if (getAccessToken()) {
      router.replace(nextPathRef.current);
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let body: ApiError | null = null;
        try {
          body = (await response.json()) as ApiError;
        } catch {
          body = null;
        }
        throw Object.assign(new Error(body?.detail ?? "Login failed"), { body });
      }

      const data = (await response.json()) as TokenResponse;
      setAccessToken(data.access_token);

      decodeJwtPayload(data.access_token);

      const me = await getMe();
      setCurrentRole(me.role);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("crm_profile_email", email.trim());
      }
      router.push("/dashboard");
    } catch (err) {
      setError(toApiError(err, "ورود ناموفق بود"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-[var(--semantic-space-pageMargin)]">
      <div className="flex w-full max-w-[920px] overflow-hidden rounded-[var(--primitive-radius-xl)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] shadow-[var(--primitive-elevation-3)]">
        <LoginHeroPanel />

        <div className="flex flex-1 flex-col justify-center p-[var(--primitive-space-10)] sm:p-[var(--primitive-space-12)]">
          <div className="mx-auto w-full max-w-[360px]">
            <div className="mb-[var(--semantic-space-sectionGap)] flex items-center gap-[var(--primitive-space-4)]">
              <Image
                src="/images/kadoos-logo.png"
                alt="موسسه فنی و آموزشی کادوس"
                width={52}
                height={52}
                className="size-[52px] shrink-0 object-contain"
                priority
              />
              <div>
                <p className="text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                  کادوس
                </p>
                <p className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                  سیستم مدیریت آموزشی
                </p>
              </div>
            </div>

            <div className="mb-[var(--semantic-space-sectionGap)]">
              <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                ورود به سیستم
              </h1>
              <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                برای ادامه، اطلاعات حساب کاربری خود را وارد کنید.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-[var(--primitive-space-4)]"
            >
              {error ? <ErrorState error={error} className="py-[var(--primitive-space-2)]" /> : null}

              <FormField label="ایمیل" required>
                <TextInput
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </FormField>

              <FormField label="رمز عبور" required>
                <TextInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </FormField>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-[var(--primitive-space-2)] w-full">
                ورود
              </Button>
            </form>

            <p className="mt-[var(--primitive-space-6)] text-center text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
              dev: admin@example.com / changeme123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
