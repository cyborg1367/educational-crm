import { Suspense } from "react";

import { F07Showcase } from "./f07-showcase";

export default function Home() {
  return (
    <Suspense>
      <F07Showcase />
    </Suspense>
  );
}
