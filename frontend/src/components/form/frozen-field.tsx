import { Info } from "lucide-react";

import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { IconButton } from "@/components/primitives/icon-button";
import { TooltipInfo } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type FrozenFieldBaseProps = {
  label: string;
  lockReason: string;
  htmlFor?: string;
  className?: string;
};

export type FrozenMoneyFieldProps = FrozenFieldBaseProps & {
  variant: "money";
  value: number;
};

export type FrozenTextFieldProps = FrozenFieldBaseProps & {
  variant: "text";
  value: string;
};

export type FrozenFieldProps = FrozenMoneyFieldProps | FrozenTextFieldProps;

function FrozenField(props: FrozenFieldProps) {
  const { label, lockReason, htmlFor, className } = props;
  const fieldId = htmlFor ?? `frozen-${label}`;

  return (
    <FormField label={label} htmlFor={fieldId} className={className}>
      <div className="flex items-stretch gap-[var(--primitive-space-1)]">
        <div className="min-w-0 flex-1">
          {props.variant === "money" ? (
            <MoneyInput
              id={fieldId}
              frozen
              value={props.value}
              readOnly
              aria-label={label}
            />
          ) : (
            <div
              id={fieldId}
              role="textbox"
              aria-readonly
              tabIndex={-1}
              className={cn(
                "flex h-[var(--primitive-space-10)] w-full items-center rounded-[var(--primitive-radius-md)]",
                "border border-transparent bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-3)]",
                "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
                "text-[var(--semantic-color-text-disabled)]",
              )}
            >
              {props.value}
            </div>
          )}
        </div>

        <TooltipInfo content={lockReason}>
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            icon={<Info className="size-[var(--primitive-space-4)]" />}
            aria-label={`دلیل قفل بودن ${label}`}
            className="shrink-0 self-center text-[var(--semantic-color-text-secondary)]"
          />
        </TooltipInfo>
      </div>
    </FormField>
  );
}

export { FrozenField };
