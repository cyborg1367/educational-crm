import { Button } from "@/components/ui/button";
import {
  formatDateDisplay,
  formatToman,
  todayStorage,
  toPersianDigits,
} from "@/lib/locale";

export default function Home() {
  const today = todayStorage();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-[length:var(--primitive-font-size-2xl)] font-semibold leading-[var(--primitive-font-lineHeight-2xl)]">
        Educational CRM
      </h1>
      <p className="text-muted-foreground">
        {toPersianDigits(formatDateDisplay(today))} —{" "}
        {formatToman(2_500_000, { suffix: true })}
      </p>
      <Button>شروع</Button>
    </main>
  );
}
