import * as React from "react";

import { cn } from "@/lib/utils";

export type DepartmentIconProps = {
  className?: string;
};

// Simple, branded department icons inspired by the provided set.
// These are intentionally self-contained (multi-color) so they look good on any card tint.

function SvgBase({
  className,
  children,
}: DepartmentIconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-full", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function DepartmentAiIcon({ className }: DepartmentIconProps) {
  return (
    <SvgBase className={className}>
      <defs>
        <radialGradient
          id="aiBg"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(32 22) rotate(90) scale(32)"
        >
          <stop offset="0" stopColor="#A78BFA" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#C4B5FD" stopOpacity="0.16" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0.10" />
        </radialGradient>
        <style>
          {`
            .ai-stroke { stroke: #7C3AED; stroke-width: 2.7; stroke-linecap: round; stroke-linejoin: round; }
            .ai-stroke-light { stroke: #A78BFA; stroke-width: 2.3; stroke-linecap: round; stroke-linejoin: round; opacity: .9; }
          `}
        </style>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#aiBg)" />

      {/* Dots around the brain (like the reference icon) */}
      <g opacity="0.75">
        <circle cx="14.5" cy="22" r="1.6" fill="#7C3AED" opacity="0.55" />
        <circle cx="20" cy="14.5" r="1.6" fill="#7C3AED" opacity="0.55" />
        <circle cx="44" cy="14.5" r="1.6" fill="#7C3AED" opacity="0.55" />
        <circle cx="49.5" cy="22" r="1.6" fill="#7C3AED" opacity="0.55" />
        <circle cx="50.5" cy="40" r="1.6" fill="#7C3AED" opacity="0.55" />
        <circle cx="44" cy="49.5" r="1.6" fill="#7C3AED" opacity="0.55" />
        <circle cx="20" cy="49.5" r="1.6" fill="#7C3AED" opacity="0.55" />
        <circle cx="13.8" cy="40" r="1.6" fill="#7C3AED" opacity="0.55" />
      </g>

      {/* Brain outline */}
      <path
        className="ai-stroke"
        d="M24.7 18.8c2.2-3.1 6.3-4.7 9.7-2.4 2.2 1.4 3.5 3.7 3.4 6.4 0 1.4-.4 2.8-1.2 4 .9.9 1.5 2.2 1.5 3.6 0 2.1-1.1 3.8-2.7 4.7.2 1.1.2 2-.1 3.1-.9 3.3-4.3 5.1-7.6 4.2-1.1-.3-2.2-1-3-1.9-.8.7-1.9 1.1-3.1 1.1-3.3 0-6-2.6-6-5.9 0-1.2.4-2.4 1.1-3.5-1-1.2-1.4-2.7-1.4-4.3 0-3 1.5-5.4 3.9-6.8Z"
      />

      {/* Circuit lines on the brain */}
      <path
        className="ai-stroke-light"
        d="M20.3 27.2l3.3 2.2M43.7 27.2l-3.3 2.2"
      />
      <path className="ai-stroke-light" d="M18.8 33.8h4.8M40.4 33.8h4.8" />

      <path className="ai-stroke" d="M27 27.8v5.1M37 27.8v5.1" opacity="0.65" />

      {/* Side hooks / nodes */}
      <path className="ai-stroke" d="M19 40.2l3.2 1.6" opacity="0.55" />
      <path className="ai-stroke" d="M45 40.2l-3.2 1.6" opacity="0.55" />
      <circle cx="18.6" cy="40.2" r="1.7" fill="#7C3AED" opacity="0.35" />
      <circle cx="45.4" cy="40.2" r="1.7" fill="#7C3AED" opacity="0.35" />

      <text
        x="32"
        y="40.2"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
        fontSize="18"
        fontWeight="900"
        fill="#FFFFFF"
        stroke="#7C3AED"
        strokeWidth="2"
        paintOrder="stroke"
      >
        AI
      </text>

      {/* small top node */}
      <circle cx="32" cy="17.8" r="2" fill="#A78BFA" opacity="0.95" />
    </SvgBase>
  );
}

function DepartmentProgrammingIcon({ className }: DepartmentIconProps) {
  return (
    <SvgBase className={className}>
      <defs>
        <linearGradient id="progBg" x1="10" y1="12" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" stopOpacity="0.24" />
          <stop offset="1" stopColor="#2563EB" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#progBg)" />
      <rect
        x="16"
        y="18"
        width="22"
        height="16"
        rx="3"
        stroke="#1D4ED8"
        strokeWidth="2.5"
      />
      <path
        d="M24 26l-5 6 5 6M40 26l5 6-5 6"
        stroke="#1D4ED8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="38"
        y="22"
        width="14"
        height="22"
        rx="3.5"
        fill="#1D4ED8"
        opacity="0.12"
      />
      <rect
        x="38.5"
        y="22.5"
        width="13"
        height="21"
        rx="3"
        stroke="#1D4ED8"
        strokeWidth="2.5"
      />
      <path
        d="M41 27h7M41 31h7M41 35h7"
        stroke="#1D4ED8"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="45" cy="18" r="9" stroke="#60A5FA" strokeWidth="2.5" opacity="0.95" />
      <path
        d="M36 18c3-2.5 6-3.7 9-3.7S48 15.5 54 18"
        stroke="#60A5FA"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M45 9v18M36 18h18"
        stroke="#60A5FA"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </SvgBase>
  );
}

function DepartmentFinanceIcon({ className }: DepartmentIconProps) {
  return (
    <SvgBase className={className}>
      <defs>
        <linearGradient id="finBg" x1="8" y1="12" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" stopOpacity="0.20" />
          <stop offset="1" stopColor="#B45309" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#finBg)" />
      <path
        d="M18 22c0-2 1.6-3.5 3.6-3.5h13.5c1 0 2 .4 2.7 1.1l3.2 3.2c.7.7 1.1 1.6 1.1 2.6V43c0 2-1.6 3.5-3.6 3.5H21.6c-2 0-3.6-1.5-3.6-3.5V22Z"
        fill="#F59E0B"
        opacity="0.10"
        stroke="#B45309"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 44V31M30 44V27M36 44V33"
        stroke="#B45309"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M22 30h5l2-3 4 6 2-3 7 10"
        stroke="#B45309"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
      <ellipse cx="43" cy="40" rx="8.5" ry="6.5" fill="#F59E0B" opacity="0.13" />
      <circle cx="44" cy="41" r="7.5" stroke="#B45309" strokeWidth="2.5" />
      <path
        d="M44 37v8M40.5 41H47.5"
        stroke="#B45309"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="23" y="24" width="10" height="6" rx="2" fill="#F59E0B" opacity="0.18" />
      <path d="M26 27h6" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </SvgBase>
  );
}

function DepartmentLanguageKidsIcon({ className }: DepartmentIconProps) {
  return (
    <SvgBase className={className}>
      <defs>
        <linearGradient id="kidsBg" x1="12" y1="12" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F472B6" stopOpacity="0.22" />
          <stop offset="1" stopColor="#A855F7" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#kidsBg)" />
      <path
        d="M20 27c0-5 4.5-9 10-9s10 4 10 9c0 4.2-2.8 7.8-6.8 8.8L27.3 40l2-4.2C22.6 34 20 30.8 20 27Z"
        stroke="#BE185D"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="#F472B6"
        opacity="0.10"
      />
      <text
        x="32"
        y="30.8"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
        fontSize="16"
        fontWeight="900"
        fill="#BE185D"
      >
        A★
      </text>
      <circle cx="22" cy="39" r="7" fill="#F472B6" opacity="0.18" />
      <circle cx="22" cy="38" r="6.2" stroke="#BE185D" strokeWidth="2.5" />
      <circle cx="31" cy="38" r="6.2" stroke="#BE185D" strokeWidth="2.5" fill="#F472B6" opacity="0.12" />
      <path
        d="M18 37c1.2-4.4 3.8-6.6 4.8-6.6 1.2 0 3.6 2.2 4.8 6.6"
        stroke="#BE185D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27.2 37c1.1-4.4 3.7-6.6 4.8-6.6 1.2 0 3.6 2.2 4.8 6.6"
        stroke="#BE185D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <path
        d="M19 47c1.5-3 3.7-4.5 7-4.5s5.5 1.5 7 4.5"
        stroke="#BE185D"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </SvgBase>
  );
}

function DepartmentLanguageAdultIcon({ className }: DepartmentIconProps) {
  return (
    <SvgBase className={className}>
      <defs>
        <linearGradient id="adultBg" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" stopOpacity="0.18" />
          <stop offset="1" stopColor="#22C55E" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#adultBg)" />
      <path
        d="M18.5 22c0-4.2 3.4-7.6 7.6-7.6h9.8c4.2 0 7.6 3.4 7.6 7.6v14.2c0 4.2-3.4 7.6-7.6 7.6h-9.2l-4.6 3.6v-3.6c-1.2 0-3.6-1.8-3.6-4.6V22Z"
        fill="#10B981"
        opacity="0.10"
        stroke="#059669"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="27.5" cy="27" r="1.8" fill="#059669" />
      <circle cx="33" cy="27" r="1.8" fill="#059669" />
      <circle cx="38.5" cy="27" r="1.8" fill="#059669" />
      <circle cx="46.5" cy="28.5" r="11" stroke="#059669" strokeWidth="2.5" opacity="0.95" />
      <path d="M36 28.5h21" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <path
        d="M40.2 20.8c2 1.4 3.8 4 3.8 7.7 0 3.7-1.8 6.3-3.8 7.7"
        stroke="#059669"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path d="M53.3 20.8c-2 1.4-3.8 4-3.8 7.7 0 3.7 1.8 6.3 3.8 7.7" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
      <path
        d="M18 46c4-3 8-3 12 0 4-3 8-3 12 0"
        stroke="#059669"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M20 40c5-3 10-3 15 0" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <path d="M21 42.5c5-2.7 10-2.7 15 0" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" opacity="0.38" />
    </SvgBase>
  );
}

function DepartmentDefaultIcon({ className }: DepartmentIconProps) {
  return (
    <SvgBase className={className}>
      <circle cx="32" cy="32" r="28" fill="#E5E7EB" opacity="0.55" />
      <path
        d="M20 28c0-5 4-9 9-9s9 4 9 9v10c0 5-4 9-9 9s-9-4-9-9V28Z"
        stroke="#6B7280"
        strokeWidth="2.5"
        opacity="0.9"
      />
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
        fontSize="16"
        fontWeight="900"
        fill="#6B7280"
      >
        %
      </text>
    </SvgBase>
  );
}

export {
  DepartmentAiIcon,
  DepartmentDefaultIcon,
  DepartmentFinanceIcon,
  DepartmentLanguageAdultIcon,
  DepartmentLanguageKidsIcon,
  DepartmentProgrammingIcon,
};
