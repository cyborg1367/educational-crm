"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { controlVariants } from "@/components/form/control-styles";
import { TextInput } from "@/components/form/text-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDialogPortalContainer } from "@/components/ui/dialog-portal-context";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  id?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  inputSize?: "md" | "lg";
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

function Select({
  id,
  options,
  value,
  onChange,
  placeholder = "انتخاب کنید",
  searchable = false,
  searchPlaceholder = "جستجو…",
  disabled = false,
  error = false,
  inputSize = "md",
  className,
  ...ariaProps
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const listId = React.useId();
  const portalContainer = useDialogPortalContainer();

  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions =
    searchable && normalizedQuery
      ? options.filter((option) =>
          option.label.toLowerCase().includes(normalizedQuery),
        )
      : options;

  const handleSelect = (nextValue: string) => {
    onChange?.(nextValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          className={cn(
            controlVariants({ size: inputSize, error }),
            "inline-flex items-center justify-between gap-[var(--primitive-space-2)] text-start",
            !selected && "text-[var(--semantic-color-text-secondary)]",
            className,
          )}
          {...ariaProps}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="size-[var(--primitive-space-4)] shrink-0 text-[var(--semantic-color-text-secondary)]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        container={portalContainer}
        className="w-[var(--radix-popover-trigger-width)] p-[var(--primitive-space-2)]"
      >
        {searchable ? (
          <div className="mb-[var(--primitive-space-2)]">
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              inputSize="md"
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}

        <ul
          id={listId}
          role="listbox"
          className="max-h-60 overflow-y-auto"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
              موردی یافت نشد
            </li>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={option.disabled}
                    className={cn(
                      "flex w-full items-center justify-between gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-sm)]",
                      "px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] text-start",
                      "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
                      "text-[var(--semantic-color-text-primary)] transition-colors",
                      "hover:bg-[var(--primitive-color-neutral-100)]",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--semantic-color-action-focusRing)]",
                      "disabled:pointer-events-none disabled:text-[var(--semantic-color-text-disabled)]",
                      isSelected && "bg-[var(--primitive-color-brand-50)]",
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <Check className="size-[var(--primitive-space-4)] shrink-0 text-[var(--semantic-color-action-primary)]" />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export { Select };
