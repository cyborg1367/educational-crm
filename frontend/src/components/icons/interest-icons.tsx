import * as React from "react";

import type { PersonInterest } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type InterestIconProps = {
  className?: string;
};

const STROKE = 1.5;

function InterestIconFrame({
  className,
  children,
}: InterestIconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-full", className)}
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="8"
        className="fill-[var(--primitive-color-brand-500)]"
        opacity="0.1"
      />
      {children}
    </svg>
  );
}

/** برنامه‌نویسی */
function ProgrammingInterestIcon({ className }: InterestIconProps) {
  return (
    <InterestIconFrame className={className}>
      <rect
        x="8"
        y="9"
        width="16"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <path
        d="M12.5 15 10.5 17l2 2M19.5 15l2 2-2 2M17 13.5l-1.5 5"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </InterestIconFrame>
  );
}

/** هوش مصنوعی */
function AiInterestIcon({ className }: InterestIconProps) {
  return (
    <InterestIconFrame className={className}>
      <path
        d="M16 7.5v2.5M16 22v2.5M7.5 16h2.5M22 16h2.5"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="16" cy="16" r="3.25" className="fill-current" />
      <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth={STROKE} />
      <circle cx="11" cy="20.5" r="2" stroke="currentColor" strokeWidth={STROKE} />
      <circle cx="21" cy="20.5" r="2" stroke="currentColor" strokeWidth={STROKE} />
      <path
        d="M16 12.25v1.5M14.1 18.8l-1.3-.75M17.9 18.8l1.3-.75"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </InterestIconFrame>
  );
}

/** حسابداری */
function AccountingInterestIcon({ className }: InterestIconProps) {
  return (
    <InterestIconFrame className={className}>
      <path
        d="M9 22V12a1.5 1.5 0 0 1 1.5-1.5H21"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <path
        d="M12 22v-5M16 22v-8.5M20 22v-11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 17h4v5h-4zM16 13.5h4v8.5h-4z"
        className="fill-[var(--primitive-color-brand-500)]"
        opacity="0.28"
      />
      <circle cx="22.5" cy="9.5" r="2.75" stroke="currentColor" strokeWidth={STROKE} />
      <path
        d="M21.4 9.5h2.2M22.5 8.4v2.2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </InterestIconFrame>
  );
}

/** زبان انگلیسی */
function EnglishInterestIcon({ className }: InterestIconProps) {
  return (
    <InterestIconFrame className={className}>
      <path
        d="M9 12.5c0-2.5 3.1-4.5 7-4.5s7 2 7 4.5-3.1 5.5-7 5.5-7-3-7-5.5Z"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <path
        d="M9 12.5c0 2.5 3.1 6 7 6s7-3.5 7-6"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <path
        d="M16 18.5V21"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <rect
        x="10.5"
        y="21"
        width="11"
        height="4.5"
        rx="2"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <path
        d="M13.5 23.1h1.6M17 23.1h1.6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </InterestIconFrame>
  );
}

/** گرافیک */
function GraphicInterestIcon({ className }: InterestIconProps) {
  return (
    <InterestIconFrame className={className}>
      <circle cx="13.5" cy="18.5" r="2" className="fill-[var(--primitive-color-brand-500)]" opacity="0.55" />
      <circle cx="19" cy="13" r="2" className="fill-current" opacity="0.35" />
      <circle cx="21.5" cy="19.5" r="2" className="fill-current" opacity="0.55" />
      <path
        d="m11.5 20.5 7.5-7.5a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8l-7.5 7.5-3.2.8.8-3.2Z"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </InterestIconFrame>
  );
}

/** رباتیک */
function RoboticsInterestIcon({ className }: InterestIconProps) {
  return (
    <InterestIconFrame className={className}>
      <rect
        x="10"
        y="12"
        width="12"
        height="10"
        rx="3"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <path
        d="M16 9.5V12"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <circle cx="16" cy="8.25" r="1.25" className="fill-current" />
      <circle cx="13.25" cy="16.25" r="1.35" className="fill-current" />
      <circle cx="18.75" cy="16.25" r="1.35" className="fill-current" />
      <path
        d="M13.5 19.25h5"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <path
        d="M7.5 16H10M22 16h2.5"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </InterestIconFrame>
  );
}

export const INTEREST_ICONS: Record<
  PersonInterest,
  React.ComponentType<InterestIconProps>
> = {
  programming: ProgrammingInterestIcon,
  ai: AiInterestIcon,
  accounting: AccountingInterestIcon,
  english: EnglishInterestIcon,
  graphic: GraphicInterestIcon,
  robotics: RoboticsInterestIcon,
};

export {
  ProgrammingInterestIcon,
  AiInterestIcon,
  AccountingInterestIcon,
  EnglishInterestIcon,
  GraphicInterestIcon,
  RoboticsInterestIcon,
};
