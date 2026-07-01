"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { IconButton } from "@/components/primitives/icon-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { NavTree } from "@/lib/nav/types";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = "260px";
const SHELL_BREAKPOINT = "(max-width: 1023px)";

export type AppShellProps = {
  /** Role-composed nav tree — AppShell does not compute visibility itself. */
  navTree: NavTree;
  children: React.ReactNode;
  /** Brand mark / org name in sidebar header. */
  brand?: React.ReactNode;
  /** Inline-end topbar slot (user menu, notifications, etc.). */
  topbarEnd?: React.ReactNode;
  /** Opens the CommandPalette — caller wires palette state. */
  onOpenCommandPalette?: () => void;
  className?: string;
};

function AppShell({
  navTree,
  children,
  brand,
  topbarEnd,
  onOpenCommandPalette,
  className,
}: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(SHELL_BREAKPOINT);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--semantic-color-surface-border)] px-[var(--primitive-space-4)] py-[var(--primitive-space-4)]">
        {brand ?? (
          <Link
            href="/dashboard"
            className={cn(
              "block text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]",
              focusVisibleStyles,
              "rounded-[var(--primitive-radius-sm)]",
            )}
          >
            Educational CRM
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-[var(--primitive-space-3)] py-[var(--primitive-space-4)]">
        <SidebarNav
          navTree={navTree}
          currentPath={pathname}
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>
    </div>
  );

  return (
    <div className={cn("flex min-h-screen bg-[var(--background)]", className)}>
      {/* Desktop sidebar — fixed at inline-start, 260px */}
      <aside
        className="hidden shrink-0 border-e border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] lg:block"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="نوار کناری"
      >
        {sidebarContent}
      </aside>

      {/* Mobile nav — F05 drawer primitive, inline-start overlay below 1024px */}
      {isMobile ? (
        <Drawer
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          direction="right"
        >
          <DrawerContent
            side="inline-start"
            className="w-[min(100%,260px)] max-w-[260px]"
          >
            <DrawerTitle className="sr-only">منوی ناوبری</DrawerTitle>
            {sidebarContent}
          </DrawerContent>
        </Drawer>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[var(--primitive-zIndex-dropdown)] flex h-[var(--primitive-space-12)] shrink-0 items-center gap-[var(--primitive-space-3)] border-b border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)]">
          <IconButton
            type="button"
            variant="ghost"
            size="md"
            icon={<Menu aria-hidden />}
            aria-label="باز کردن منو"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          />

          {onOpenCommandPalette ? (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={cn(
                "hidden min-h-[var(--primitive-space-10)] flex-1 items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] px-[var(--primitive-space-3)] sm:flex sm:max-w-xs",
                "text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]",
                "hover:bg-[var(--primitive-color-neutral-50)] active:bg-[var(--primitive-color-neutral-100)]",
                focusVisibleStyles,
              )}
            >
              <Search className="size-[var(--primitive-space-4)] shrink-0" aria-hidden />
              <span>جستجو…</span>
              <kbd className="ms-auto hidden rounded-[var(--primitive-radius-sm)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-2)] py-px text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)] md:inline">
                ⌘K
              </kbd>
            </button>
          ) : null}

          <div className="ms-auto flex items-center gap-[var(--primitive-space-2)]">
            {topbarEnd}
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export { AppShell, SIDEBAR_WIDTH };
