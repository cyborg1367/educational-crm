import Link from "next/link";

const SKELETON_DEMOS = [
  { href: "/skeletons/list-page", label: "List Page", zones: "Header · Filter-bar · Primary" },
  { href: "/skeletons/t1-detail", label: "T1 Detail (Tabbed)", zones: "Header · Primary · Secondary" },
  { href: "/skeletons/t2-detail", label: "T2 Detail (Single-Pane)", zones: "Header · Primary" },
  { href: "/skeletons/wizard", label: "Wizard", zones: "Header · Primary · Action-bar" },
  { href: "/skeletons/split-view", label: "Split View", zones: "Filter-bar · Primary · Secondary" },
  { href: "/skeletons/dashboard", label: "Dashboard", zones: "Header · Primary" },
  { href: "/skeletons/settings-layout", label: "Settings Layout", zones: "Sub-nav · Primary" },
  { href: "/skeletons/calendar", label: "Calendar", zones: "Header · Primary" },
] as const;

export default function SkeletonsIndexPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[var(--semantic-space-sectionGap)] p-[var(--semantic-space-pageMargin)]">
      <header>
        <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          F08 — اسکلت‌های صفحه
        </h1>
        <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          هشت چیدمان ساختاری برای تأیید بصری. هر صفحه مناطق نام‌گذاری‌شده را
          نمایش می‌دهد.
        </p>
      </header>

      <ul className="grid gap-[var(--primitive-space-4)] sm:grid-cols-2">
        {SKELETON_DEMOS.map((demo) => (
          <li key={demo.href}>
            <Link
              href={demo.href}
              className="block rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)] transition-colors hover:bg-[var(--primitive-color-neutral-50)]"
            >
              <span className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                {demo.label}
              </span>
              <span className="mt-[var(--primitive-space-1)] block text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                {demo.zones}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
