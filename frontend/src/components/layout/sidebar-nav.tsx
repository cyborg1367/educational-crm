"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import type { NavTree } from "@/lib/nav/types";
import { cn } from "@/lib/utils";

export type SidebarNavProps = {
  navTree: NavTree;
  currentPath?: string;
  onNavigate?: () => void;
  className?: string;
};

function isNavItemActive(href: string, currentPath: string): boolean {
  if (href === "/dashboard") {
    return currentPath === "/dashboard";
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[var(--primitive-space-10)] items-center gap-[var(--primitive-space-3)]",
        "rounded-[var(--primitive-radius-md)] px-[var(--primitive-space-3)]",
        "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
        "transition-all duration-[var(--primitive-motion-duration-fast)]",
        active
          ? [
              "bg-[var(--primitive-color-brand-500)]/12 font-[var(--primitive-font-weight-medium)] text-[var(--primitive-color-brand-400)]",
              "before:absolute before:inset-y-1.5 before:w-0.5 before:rounded-full before:bg-[var(--primitive-color-brand-500)]",
              "before:start-0",
            ]
          : "text-[var(--primitive-color-neutral-400)] hover:bg-white/5 hover:text-[var(--primitive-color-neutral-200)]",
        focusVisibleStyles,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "size-[var(--primitive-space-5)] shrink-0",
            active ? "text-[var(--primitive-color-brand-400)]" : "opacity-70",
          )}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarNav({
  navTree,
  currentPath = "",
  onNavigate,
  className,
}: SidebarNavProps) {
  return (
    <nav
      aria-label="ناوبری اصلی"
      className={cn("flex flex-col gap-[var(--primitive-space-6)]", className)}
    >
      {navTree.map((group) => (
        <div key={group.id}>
          {group.label ? (
            <p className="mb-[var(--primitive-space-2)] px-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] tracking-wide text-[var(--primitive-color-neutral-600)]">
              {group.label}
            </p>
          ) : null}
          <ul className="flex flex-col gap-[var(--primitive-space-1)]">
            {group.items.map((navItem) => (
              <li key={navItem.id}>
                <NavLink
                  href={navItem.href}
                  label={navItem.label}
                  icon={navItem.icon}
                  active={isNavItemActive(navItem.href, currentPath)}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export { SidebarNav, isNavItemActive };
