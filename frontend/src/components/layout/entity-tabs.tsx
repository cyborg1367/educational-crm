"use client";

import * as React from "react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { cn } from "@/lib/utils";

export type EntityTab = {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
};

export type EntityTabsProps = {
  tabs: EntityTab[];
  activeTabId?: string;
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  /** Accessible label for the tab list (e.g. entity name). */
  "aria-label"?: string;
};

function EntityTabs({
  tabs,
  activeTabId,
  defaultTabId,
  onTabChange,
  className,
  "aria-label": ariaLabel = "بخش‌های جزئیات",
}: EntityTabsProps) {
  const fallbackId = defaultTabId ?? tabs[0]?.id ?? "";
  const [internalActiveId, setInternalActiveId] = React.useState(fallbackId);
  const tabListRef = React.useRef<HTMLDivElement>(null);

  const resolvedActiveId =
    activeTabId !== undefined ? activeTabId : internalActiveId;

  const setActiveTab = (tabId: string) => {
    if (activeTabId === undefined) {
      setInternalActiveId(tabId);
    }
    onTabChange?.(tabId);
  };

  const enabledTabs = tabs.filter((tab) => !tab.disabled);

  const focusTabAt = (index: number) => {
    const tabButtons = tabListRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])',
    );
    const target = tabButtons?.[index];
    target?.focus();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const lastIndex = enabledTabs.length - 1;
    let nextIndex = index;

    switch (event.key) {
      case "ArrowLeft":
        nextIndex = index <= 0 ? lastIndex : index - 1;
        break;
      case "ArrowRight":
        nextIndex = index >= lastIndex ? 0 : index + 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = enabledTabs[nextIndex];
    if (nextTab) {
      setActiveTab(nextTab.id);
      focusTabAt(nextIndex);
    }
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        ref={tabListRef}
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-[var(--primitive-space-1)] overflow-x-auto border-b border-[var(--semantic-color-surface-border)]"
      >
        {tabs.map((tab) => {
          const isSelected = tab.id === resolvedActiveId;
          const enabledIndex = enabledTabs.findIndex((t) => t.id === tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                if (enabledIndex >= 0) {
                  handleKeyDown(event, enabledIndex);
                }
              }}
              className={cn(
                "shrink-0 border-b-2 px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]",
                "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
                "transition-colors",
                isSelected
                  ? "border-[var(--semantic-color-action-primary)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-action-primary)]"
                  : "border-transparent text-[var(--semantic-color-text-secondary)] hover:bg-[var(--primitive-color-neutral-50)] hover:text-[var(--semantic-color-text-primary)]",
                focusVisibleStyles,
                "disabled:pointer-events-none disabled:text-[var(--semantic-color-text-disabled)]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const isSelected = tab.id === resolvedActiveId;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={!isSelected}
            tabIndex={0}
            className="py-[var(--primitive-space-6)] focus:outline-none"
          >
            {isSelected ? tab.content : null}
          </div>
        );
      })}
    </div>
  );
}

export { EntityTabs };
