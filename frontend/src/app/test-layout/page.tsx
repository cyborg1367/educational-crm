"use client";

import * as React from "react";

import { Select } from "@/components/form/select";
import {
  AppShell,
  Breadcrumb,
  CommandPalette,
  EntityTabs,
  FilterBar,
  useCommandPaletteShortcut,
  type FilterValues,
  type SavedView,
} from "@/components/layout";
import {
  flattenNavTree,
  getCommandPaletteItemsForRole,
  getNavTreeForRole,
  type UserRole,
} from "@/lib/nav";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "مدیر (Admin)" },
  { value: "admission", label: "پذیرش (Admission)" },
  { value: "finance", label: "مالی (Finance)" },
  { value: "teacher", label: "مدرس (Teacher)" },
  { value: "department_manager", label: "مدیر دپارتمان (Department Manager)" },
];

/** T3/T4 routes/labels that must never appear as sidebar or palette entries. */
const FORBIDDEN_NAV_HREFS = [
  "/journeys",
  "/installments",
  "/payments",
  "/refunds",
  "/activities",
  "/communications",
  "/attendance",
];

const FORBIDDEN_NAV_LABELS = [
  "سفرها",
  "مسیرها",
  "اقساط",
  "پرداخت‌ها",
  "بازپرداخت‌ها",
  "حضور و غیاب",
  "فعالیت‌ها",
  "ارتباطات",
];

const SAMPLE_FACETS = [
  {
    id: "status",
    type: "select" as const,
    label: "وضعیت",
    placeholder: "همه وضعیت‌ها",
    options: [
      { value: "active", label: "فعال" },
      { value: "lead", label: "سرنخ" },
      { value: "student", label: "دانش‌آموز" },
      { value: "dropped", label: "انصراف‌داده" },
    ],
  },
  {
    id: "department",
    type: "select" as const,
    label: "دپارتمان",
    placeholder: "همه دپارتمان‌ها",
    options: [
      { value: "programming", label: "برنامه‌نویسی" },
      { value: "design", label: "طراحی" },
      { value: "marketing", label: "بازاریابی" },
    ],
  },
];

const SAVED_VIEWS: SavedView[] = [
  {
    id: "my-tasks",
    label: "وظایف من",
    values: { status: "active", department: "programming" },
  },
  {
    id: "overdue-installments",
    label: "اقساط معوق من",
    values: { status: "student", department: "design" },
  },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-6)]">
      <h2 className="text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          {description}
        </p>
      ) : null}
      <div className="mt-[var(--primitive-space-4)]">{children}</div>
    </section>
  );
}

export default function TestLayoutPage() {
  const [role, setRole] = React.useState<UserRole>("admin");
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [activeSavedViewId, setActiveSavedViewId] = React.useState<string | null>(
    null,
  );
  const [filterChangeLog, setFilterChangeLog] = React.useState<string>(
    "هنوز تغییری ثبت نشده",
  );

  const navTree = getNavTreeForRole(role);
  const paletteItems = getCommandPaletteItemsForRole(role);
  const flatNavItems = flattenNavTree(navTree);

  useCommandPaletteShortcut(() => setPaletteOpen(true));

  const handleFilterChange = (next: FilterValues) => {
    setFilterValues(next);
    setFilterChangeLog(
      `آخرین تغییر: ${new Date().toLocaleTimeString("fa-IR")} — ${JSON.stringify(next)}`,
    );
  };

  const handleSavedViewSelect = (viewId: string | null) => {
    setActiveSavedViewId(viewId);
    if (viewId === null) {
      handleFilterChange({});
      return;
    }
    const view = SAVED_VIEWS.find((item) => item.id === viewId);
    if (view) {
      handleFilterChange(view.values);
    }
  };

  const forbiddenHits = flatNavItems.filter(
    (item) =>
      FORBIDDEN_NAV_HREFS.some((href) => item.href.startsWith(href)) ||
      FORBIDDEN_NAV_LABELS.includes(item.label),
  );

  return (
    <AppShell
      navTree={navTree}
      onOpenCommandPalette={() => setPaletteOpen(true)}
      brand={
        <span className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)]">
          آزمایش F06
        </span>
      }
      topbarEnd={
        <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
          نقش فعال: {ROLE_OPTIONS.find((option) => option.value === role)?.label}
        </span>
      }
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-[var(--primitive-space-8)] p-[var(--primitive-space-6)]">
        <header>
          <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
            صفحه آزمایش — ناوبری و چیدمان (F06)
          </h1>
          <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            این صفحه موقت است. عرض مرورگر را زیر ۱۰۲۴px کاهش دهید تا منوی
            همبرگری و کشوی موبایل را ببینید.
          </p>
        </header>

        <Section
          title="۱. نقش و منوی کناری"
          description="نقش را عوض کنید — هر نقش فقط آیتم‌های مخصوص خود را در نوار کناری می‌بیند (نه یک منوی واحد با مخفی‌سازی)."
        >
          <div className="max-w-sm">
            <label
              htmlFor="role-switcher"
              className="mb-[var(--primitive-space-2)] block text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]"
            >
              نقش کاربر
            </label>
            <Select
              id="role-switcher"
              options={ROLE_OPTIONS}
              value={role}
              onChange={(value) => setRole(value as UserRole)}
            />
          </div>

          <div className="mt-[var(--primitive-space-4)]">
            <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
              آیتم‌های منوی این نقش ({flatNavItems.length})
            </h3>
            <ul className="mt-[var(--primitive-space-2)] list-inside list-disc text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
              {flatNavItems.map((item) => (
                <li key={item.id}>
                  {item.label}
                  {item.group ? ` — ${item.group}` : ""}
                  <span className="text-[var(--semantic-color-text-disabled)]">
                    {" "}
                    ({item.href})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {forbiddenHits.length > 0 ? (
            <p
              role="alert"
              className="mt-[var(--primitive-space-3)] rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-status-danger)]/10 px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-status-danger)]"
            >
              خطا: موجودیت T3/T4 در منو یافت شد:{" "}
              {forbiddenHits.map((item) => item.label).join("، ")}
            </p>
          ) : (
            <p className="mt-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-status-success)]">
              ✓ هیچ موجودیت T3/T4 (سفر، قسط، پرداخت، فعالیت، …) در منوی این
              نقش نیست.
            </p>
          )}
        </Section>

        <Section
          title="۲. منوی موبایل"
          description="عرض کمتر از ۱۰۲۴px: دکمه منو (☰) در نوار بالا ظاهر می‌شود و نوار کناری به‌صورت کشوی رویی از سمت inline-start باز می‌شود."
        >
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            ابزارهای توسعه‌دهنده مرورگر را باز کنید و عرض را به ۷۶۸px یا کمتر
            تنظیم کنید، سپس دکمه «باز کردن منو» را بزنید.
          </p>
        </Section>

        <Section
          title="۳. EntityTabs"
          description="کلیدهای جهت‌نما بین تب‌ها جابه‌جا می‌کنند. Tab فوکوس را از فهرست تب به محتوای تب منتقل می‌کند."
        >
          <EntityTabs
            aria-label="تب‌های جزئیات شخص"
            tabs={[
              {
                id: "overview",
                label: "اطلاعات کلی",
                content: (
                  <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                    محتوای تب اطلاعات کلی — نام، تلفن، وضعیت و …
                  </p>
                ),
              },
              {
                id: "enrollments",
                label: "ثبت‌نام‌ها",
                content: (
                  <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                    محتوای تب ثبت‌نام‌ها — لیست ثبت‌نام‌های مرتبط
                  </p>
                ),
              },
              {
                id: "timeline",
                label: "تایم‌لاین",
                content: (
                  <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                    محتوای تب تایم‌لاین — ادغام فعالیت و ارتباطات
                  </p>
                ),
              },
            ]}
          />
        </Section>

        <Section
          title="۴. Breadcrumb"
          description="فقط وقتی عمق بیش از ۲ سطح باشد (۳+ خرده) نمایش داده می‌شود."
        >
          <div className="flex flex-col gap-[var(--primitive-space-6)]">
            <div>
              <h3 className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]">
                ۲ خرده — نباید نمایش داده شود
              </h3>
              <Breadcrumb
                crumbs={[
                  { label: "دپارتمان‌ها", href: "/departments" },
                  { label: "برنامه‌نویسی" },
                ]}
              />
              <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                (خالی — کامپوننت null برمی‌گرداند)
              </p>
            </div>

            <div>
              <h3 className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]">
                ۳ خرده — باید نمایش داده شود
              </h3>
              <Breadcrumb
                crumbs={[
                  { label: "دپارتمان‌ها", href: "/departments" },
                  { label: "کلاس پایتون", href: "/classes/12" },
                  { label: "ثبت‌نام علی رضایی" },
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          title="۵. CommandPalette"
          description="⌘K (یا Ctrl+K) برای باز کردن. تایپ کنید تا نتایج فیلتر شوند. Escape برای بستن."
        >
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-4)] py-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] hover:bg-[var(--primitive-color-neutral-100)]"
          >
            باز کردن جستجوی سریع (⌘K)
          </button>
          <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
            {paletteItems.length} مورد قابل جستجو برای نقش فعلی
          </p>
        </Section>

        <Section
          title="۶. FilterBar"
          description="فیلتر وضعیت + دپارتمان + نمای ذخیره‌شده. تغییر هر فیلتر onChange را فراخوانی می‌کند."
        >
          <FilterBar
            facets={SAMPLE_FACETS}
            values={filterValues}
            onValuesChange={handleFilterChange}
            savedViews={SAVED_VIEWS}
            activeSavedViewId={activeSavedViewId}
            onSavedViewSelect={handleSavedViewSelect}
          />
          <pre
            className="mt-[var(--primitive-space-4)] overflow-x-auto rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-surface-subtle)] p-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]"
            aria-live="polite"
          >
            {filterChangeLog}
          </pre>
        </Section>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={paletteItems}
      />
    </AppShell>
  );
}
