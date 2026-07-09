"use client";

import * as React from "react";
import Image from "next/image";
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

const SIDEBAR_WIDTH = "245px";
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

function KadoosBrand() {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "group flex items-center gap-[var(--primitive-space-3)]",
        focusVisibleStyles,
        "rounded-[var(--primitive-radius-md)]",
      )}
    >
      <Image
        src="/images/kadoos-logo.png"
        alt="موسسه فنی و آموزشی کادوس"
        width={44}
        height={44}
        priority
        className={cn(
          "size-11 shrink-0 object-contain",
          "transition-transform duration-[var(--primitive-motion-duration-base)] group-hover:scale-[1.03]",
        )}
      />
      <span className="flex flex-col gap-px">
        <span className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)] leading-none text-white">
          کادوس
        </span>
        <span className="text-[length:var(--primitive-font-size-xs)] leading-none text-[var(--primitive-color-neutral-500)]">
          موسسه فنی و آموزشی
        </span>
      </span>
    </Link>
  );
}

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
    <div className="flex h-full flex-col bg-[var(--primitive-color-neutral-900)]">
      <div className="shrink-0 px-[var(--primitive-space-5)] py-[var(--primitive-space-5)]">
        {brand ?? <KadoosBrand />}
      </div>
      <div className="flex-1 overflow-y-auto px-[var(--primitive-space-3)] pb-[var(--primitive-space-5)]">
        <SidebarNav
          navTree={navTree}
          currentPath={pathname}
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>
    </div>
  );

  return (
    <div className={cn("flex min-h-screen bg-[var(--semantic-color-surface-page)]", className)}>
      {/* Desktop sidebar — fixed at inline-start */}
      <aside
        className="hidden shrink-0 lg:block"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="نوار کناری"
      >
        {sidebarContent}
      </aside>

      {/* Mobile nav — drawer overlay below 1024px */}
      {isMobile ? (
        <Drawer
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          direction="right"
        >
          <DrawerContent
            side="inline-start"
            className="w-[min(100%,245px)] max-w-[245px] border-0 p-0"
          >
            <DrawerTitle className="sr-only">منوی ناوبری</DrawerTitle>
            {sidebarContent}
          </DrawerContent>
        </Drawer>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-[var(--primitive-zIndex-dropdown)] flex h-14 shrink-0 items-center gap-[var(--primitive-space-3)]",
            "border-b border-[var(--semantic-color-surface-border)]/80",
            "bg-[var(--semantic-color-surface-card)]/90 backdrop-blur-md",
            "px-[var(--semantic-space-pageMargin)]",
          )}
        >
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
                "hidden min-h-[var(--primitive-space-10)] flex-1 items-center gap-[var(--primitive-space-2)] sm:flex sm:max-w-sm",
                "rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)]",
                "bg-[var(--semantic-color-surface-subtle)]/60 px-[var(--primitive-space-4)]",
                "text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]",
                "transition-colors duration-[var(--primitive-motion-duration-fast)]",
                "hover:border-[var(--primitive-color-neutral-300)] hover:bg-[var(--semantic-color-surface-card)]",
                focusVisibleStyles,
              )}
            >
              <Search className="size-[var(--primitive-space-4)] shrink-0 opacity-60" aria-hidden />
              <span>جستجو در کادوس…</span>
              <kbd className="ms-auto hidden rounded-[var(--primitive-radius-sm)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-2)] py-px text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-disabled)] md:inline">
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
