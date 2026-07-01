"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { TextInput } from "@/components/form/text-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CommandPaletteItem } from "@/lib/nav/types";
import { normalizeDigitsInput } from "@/lib/locale/number";
import { cn } from "@/lib/utils";

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Pre-filtered navigable items for the current role.
   * Caller supplies role-scoped list — this component does not infer permissions.
   */
  items: CommandPaletteItem[];
  className?: string;
};

function matchesQuery(item: CommandPaletteItem, rawQuery: string): boolean {
  const query = normalizeDigitsInput(rawQuery.trim().toLowerCase());
  if (!query) {
    return true;
  }

  const haystack = [item.label, item.group, ...(item.keywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return normalizeDigitsInput(haystack).includes(query);
}

function CommandPalette({
  open,
  onOpenChange,
  items,
  className,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredItems = React.useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  );

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  React.useEffect(() => {
    if (activeIndex >= filteredItems.length) {
      setActiveIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [activeIndex, filteredItems.length]);

  const selectItem = (item: CommandPaletteItem) => {
    onOpenChange(false);
    router.push(item.href);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (filteredItems.length === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) =>
          index >= filteredItems.length - 1 ? 0 : index + 1,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) =>
          index <= 0 ? filteredItems.length - 1 : index - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (filteredItems[activeIndex]) {
          selectItem(filteredItems[activeIndex]!);
        }
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    const list = listRef.current;
    const activeElement = list?.querySelector<HTMLElement>(
      `[data-active="true"]`,
    );
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filteredItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-lg gap-0 overflow-hidden p-0 sm:rounded-[var(--primitive-radius-lg)]",
          "[&>button]:hidden",
          className,
        )}
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">جستجوی سریع</DialogTitle>
        <DialogDescription className="sr-only">
          جستجو در صفحات قابل دسترس و پرش به مقصد
        </DialogDescription>

        <div className="flex items-center gap-[var(--primitive-space-2)] border-b border-[var(--semantic-color-surface-border)] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]">
          <Search
            className="size-[var(--primitive-space-5)] shrink-0 text-[var(--semantic-color-text-secondary)]"
            aria-hidden
          />
          <TextInput
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو در صفحات…"
            inputSize="md"
            className="border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus-visible:outline-none"
            aria-label="جستجو در صفحات"
          />
        </div>

        <ul
          ref={listRef}
          role="listbox"
          aria-label="نتایج جستجو"
          className="max-h-80 overflow-y-auto p-[var(--primitive-space-2)]"
        >
          {filteredItems.length === 0 ? (
            <li className="px-[var(--primitive-space-3)] py-[var(--primitive-space-4)] text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
              موردی یافت نشد
            </li>
          ) : (
            filteredItems.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <li key={item.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    data-active={isActive}
                    className={cn(
                      "flex w-full flex-col gap-[var(--primitive-space-1)] rounded-[var(--primitive-radius-sm)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] text-start",
                      "text-[length:var(--primitive-font-size-sm)] transition-colors",
                      isActive
                        ? "bg-[var(--primitive-color-brand-50)] text-[var(--semantic-color-text-primary)]"
                        : "text-[var(--semantic-color-text-primary)] hover:bg-[var(--primitive-color-neutral-100)]",
                      focusVisibleStyles,
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(item)}
                  >
                    <span className="font-[var(--primitive-font-weight-medium)]">
                      {item.label}
                    </span>
                    {item.group ? (
                      <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                        {item.group}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/** Register global ⌘K / Ctrl+K shortcut for a controlled palette. */
function useCommandPaletteShortcut(
  onOpen: () => void,
  enabled = true,
): void {
  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isModKey = event.metaKey || event.ctrlKey;
      if (isModKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onOpen]);
}

export { CommandPalette, useCommandPaletteShortcut };
