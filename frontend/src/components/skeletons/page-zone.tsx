import * as React from "react";

import type { PageZoneName } from "@/components/skeletons/types";
import { cn } from "@/lib/utils";

export type PageZoneProps = {
  name: PageZoneName;
  children: React.ReactNode;
  className?: string;
};

function PageZone({ name, children, className }: PageZoneProps) {
  return (
    <section
      data-zone={name}
      className={cn(className)}
      aria-label={name}
    >
      {children}
    </section>
  );
}

export { PageZone };
