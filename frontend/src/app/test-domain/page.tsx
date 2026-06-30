"use client";

import * as React from "react";

import {
  ConfirmDialog,
  StatusAction,
  StatusBadge,
  Stepper,
  type StatusBadgeDomain,
} from "@/components/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BadgeExample = {
  label: string;
  domain: StatusBadgeDomain;
  value: string;
};

const BADGE_SECTIONS: { title: string; examples: BadgeExample[] }[] = [
  {
    title: "ثبت‌نام",
    examples: [
      { label: "پیش‌ثبت‌نام", domain: "enrollment", value: "pre_enroll" },
      { label: "فعال", domain: "enrollment", value: "active" },
      { label: "تکمیل‌شده", domain: "enrollment", value: "completed" },
      { label: "لغوشده (فوری)", domain: "enrollment", value: "dropped" },
    ],
  },
  {
    title: "فاکتور",
    examples: [
      { label: "در انتظار", domain: "invoice", value: "pending" },
      { label: "پرداخت جزئی", domain: "invoice", value: "partially_paid" },
      { label: "پرداخت‌شده", domain: "invoice", value: "paid" },
    ],
  },
  {
    title: "قسط",
    examples: [
      { label: "در انتظار", domain: "installment", value: "pending" },
      { label: "پرداخت جزئی", domain: "installment", value: "partially_paid" },
      { label: "سررسید گذشته (فوری)", domain: "installment", value: "overdue" },
      { label: "پرداخت‌شده", domain: "installment", value: "paid" },
      { label: "لغوشده", domain: "installment", value: "cancelled" },
    ],
  },
  {
    title: "مشاوره",
    examples: [
      {
        label: "نتیجه: ثبت‌نام (خارج از statusMap — بازگشت خنثی)",
        domain: "consultation",
        value: "pre_enroll",
      },
    ],
  },
  {
    title: "وظیفه",
    examples: [
      { label: "باز", domain: "task", value: "open" },
      { label: "انجام‌شده", domain: "task", value: "done" },
      { label: "لغوشده", domain: "task", value: "cancelled" },
    ],
  },
  {
    title: "شخص (فقط StatusBadge — بدون StatusAction)",
    examples: [
      { label: "پیش‌نمایش", domain: "person", value: "prospect" },
      { label: "سرنخ", domain: "person", value: "lead" },
      { label: "دانشجو", domain: "person", value: "student" },
      { label: "غیرفعال", domain: "person", value: "dormant" },
      { label: "فارغ‌التحصیل", domain: "person", value: "alumni" },
    ],
  },
  {
    title: "نامعتبر (بازگشت خنثی + هشدار کنسول در حالت توسعه)",
    examples: [
      {
        label: "enrollment / not_a_real_status",
        domain: "enrollment",
        value: "not_a_real_status",
      },
    ],
  },
];

const WIZARD_STEPS = [
  { label: "انتخاب کلاس" },
  { label: "بررسی قیمت" },
  { label: "تقسیم اقساط" },
];

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-sectionGap)]",
        "shadow-[var(--primitive-elevation-1)]",
        className,
      )}
    >
      <h2 className="mb-[var(--semantic-space-4)] text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ExampleRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[var(--primitive-space-2)] sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-[var(--semantic-space-inlineGap)]">
        {children}
      </div>
    </div>
  );
}

export default function TestDomainPage() {
  const [tier2Open, setTier2Open] = React.useState(false);
  const [tier3Open, setTier3Open] = React.useState(false);

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-[var(--semantic-space-sectionGap)] p-[var(--semantic-space-pageMargin)]">
      <header className="flex flex-col gap-[var(--primitive-space-2)]">
        <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-bold)]">
          پیش‌نمایش اجزای دامنه (F04)
        </h1>
        <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          صفحه موقت برای بررسی StatusBadge، StatusAction، ConfirmDialog و Stepper.
        </p>
      </header>

      <Section title="۱. نشان وضعیت (StatusBadge)">
        <div className="flex flex-col gap-[var(--semantic-space-sectionGap)]">
          {BADGE_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)]">
                {section.title}
              </h3>
              <div className="flex flex-wrap gap-[var(--primitive-space-3)]">
                {section.examples.map((example) => (
                  <div
                    key={`${example.domain}-${example.value}`}
                    className="flex flex-col items-start gap-[var(--primitive-space-1)]"
                  >
                    <StatusBadge domain={example.domain} value={example.value} />
                    <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                      {example.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="۲. وضعیت + اقدام (StatusAction)">
        <div className="flex flex-col gap-[var(--semantic-space-4)]">
          <ExampleRow label="ثبت‌نام فعال — باید دکمه «لغو ثبت‌نام» نمایش داده شود">
            <StatusAction
              entity="enrollment"
              status="active"
              onAction={() => console.log("drop enrollment")}
            />
          </ExampleRow>

          <ExampleRow label="ثبت‌نام لغوشده — بدون دکمه (وضعیت پایانی)">
            <StatusAction
              entity="enrollment"
              status="dropped"
              onAction={() => console.log("drop enrollment")}
            />
          </ExampleRow>

          <ExampleRow label="قسط سررسید گذشته — باید دکمه «ثبت پرداخت» نمایش داده شود">
            <StatusAction
              entity="installment"
              status="overdue"
              onAction={() => console.log("record payment")}
            />
          </ExampleRow>

          <ExampleRow label="مشاوره بدون نتیجه — باید دکمه «تعیین نتیجه» نمایش داده شود">
            <StatusAction
              entity="consultation"
              outcome={null}
              onAction={() => console.log("set outcome")}
            />
          </ExampleRow>

          <ExampleRow label="وظیفه باز — باید دکمه «تکمیل» نمایش داده شود">
            <StatusAction
              entity="task"
              status="open"
              onAction={() => console.log("mark complete")}
            />
          </ExampleRow>

          <ExampleRow label="وظیفه انجام‌شده — بدون دکمه (وضعیت پایانی)">
            <StatusAction
              entity="task"
              status="done"
              onAction={() => console.log("mark complete")}
            />
          </ExampleRow>
        </div>
      </Section>

      <Section title="۳. دیالوگ تأیید (ConfirmDialog)">
        <p className="mb-[var(--semantic-space-4)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          دو سطح را کنار هم باز کنید تا عرض، رنگ و سایه را مقایسه کنید.
        </p>
        <div className="flex flex-wrap gap-[var(--semantic-space-inlineGap)]">
          <Button type="button" variant="secondary" onClick={() => setTier2Open(true)}>
            باز کردن سطح ۲ (۴۸۰px)
          </Button>
          <Button type="button" variant="destructive" onClick={() => setTier3Open(true)}>
            باز کردن سطح ۳ (۵۶۰px)
          </Button>
        </div>

        <ConfirmDialog
          tier={2}
          open={tier2Open}
          onOpenChange={setTier2Open}
          title="لغو وظیفه؟"
          body="این وظیفه لغو می‌شود و قابل بازگشت نیست."
          confirmLabel="لغو وظیفه"
          onConfirm={() => setTier2Open(false)}
          onCancel={() => setTier2Open(false)}
        />

        <ConfirmDialog
          tier={3}
          open={tier3Open}
          onOpenChange={setTier3Open}
          title="لغو ثبت‌نام؟"
          body="این عمل پیامدهای مالی و عملیاتی دارد."
          consequences={[
            "۲ قسط لغو می‌شود",
            "۱٬۵۰۰٬۰۰۰ تومان بازپرداخت می‌شود",
            "۱ وظیفه لغو می‌شود",
          ]}
          confirmLabel="لغو ثبت‌نام"
          onConfirm={() => setTier3Open(false)}
          onCancel={() => setTier3Open(false)}
        />
      </Section>

      <Section title="۴. گام‌نما (Stepper)">
        <div className="flex flex-col gap-[var(--semantic-space-sectionGap)]">
          <div>
            <h3 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)]">
              حالت افقی (دسکتاپ / عرض ≥ ۷۶۸px)
            </h3>
            <Stepper steps={WIZARD_STEPS} currentStep={1} />
          </div>

          <div>
            <h3 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)]">
              حالت فشرده (نقطه‌ای — شبیه‌سازی عرض زیر ۷۶۸px)
            </h3>
            <div
              className={cn(
                "mx-auto w-full max-w-[320px] rounded-[var(--primitive-radius-md)]",
                "border border-dashed border-[var(--semantic-color-surface-border)]",
                "bg-[var(--semantic-color-surface-subtle)] p-[var(--semantic-space-4)]",
              )}
            >
              <Stepper steps={WIZARD_STEPS} currentStep={1} compact />
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
