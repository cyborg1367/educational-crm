"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Award, BookOpen, CalendarCheck, CalendarDays, Clock } from "lucide-react";

import { formatDateDisplay } from "@/lib/locale/date";
import { currentJalaliMonth } from "@/lib/locale/jalali-month";
import { toPersianDigits } from "@/lib/locale/number";
import type { CertificateData } from "@/lib/pdf/types";

const DARK = "#1A1A1A";
const ORANGE = "#E87722";
const ORANGE_DARK = "#C85F0F";
const GRAY = "#6B6B6B";
const BORDER = "#EBD9C4";
const CREAM = "#FBF7F1";

/** Hardcoded institute-level info — mirrors the same pattern already used
 * for phone/address constants in InvoiceDocument (not per-record data). */
const INSTITUTE = {
  website: "www.kadoos.ac.ir",
  phone: "01391002343 - 01333232323",
  address: "رشت - خیابان لاکانی - ابتدای صندوق عدالت",
  directorName: "مهندس علی شریفی",
  directorTitle: "مدیر موسسه",
  tagline: "دانش، مهارت، آینده با کادوس",
} as const;

/**
 * Layout is deliberately LTR at every structural level (page, frame, flex
 * rows, absolute-positioned corners) so "left"/"right" and DOM child order
 * mean exactly what they say — no RTL flex-reversal to reason about.
 * `direction: rtl` is applied only inside PersianText, scoped to the actual
 * text content, which is the only thing that needs it.
 */
const pageStyle: React.CSSProperties = {
  width: "297mm",
  height: "210mm",
  fontFamily: "'Vazirmatn', Tahoma, sans-serif",
  direction: "ltr",
  background: CREAM,
  color: DARK,
  boxSizing: "border-box",
  padding: "8mm",
  position: "relative",
};

const frameStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  border: `2px solid ${ORANGE}`,
  borderRadius: 6,
  padding: "10mm 14mm",
  boxSizing: "border-box",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  background: CREAM,
  overflow: "hidden",
};

const innerFrameStyle: React.CSSProperties = {
  position: "absolute",
  inset: 6,
  border: `1px solid ${ORANGE}`,
  borderRadius: 4,
  pointerEvents: "none",
};

/** Wraps Persian content: RTL direction + right-aligned by default. */
function PersianText({
  align = "right",
  style,
  children,
}: {
  align?: "right" | "center" | "left";
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div style={{ direction: "rtl", textAlign: align, ...style }}>{children}</div>
  );
}

function genderTitle(gender: CertificateData["person"]["gender"]): string {
  if (gender === "male") return "آقای ";
  if (gender === "female") return "خانم ";
  return "";
}

/** KD-{jalali year}-{course id}-{enrollment id} — a course_code field
 * doesn't exist in the schema, so the course/enrollment ids stand in for it. */
function certificateNumber(courseId: number, enrollmentId: number): string {
  const { year } = currentJalaliMonth();
  return `KD-${year}-${String(courseId).padStart(3, "0")}-${String(
    enrollmentId,
  ).padStart(5, "0")}`;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: `1.5px solid ${ORANGE}`,
          flexShrink: 0,
        }}
      >
        <Icon size={15} color={ORANGE} strokeWidth={2} />
      </div>
      <PersianText align="right">
        <div style={{ fontSize: 9, color: GRAY }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: DARK }}>{value}</div>
      </PersianText>
    </div>
  );
}

function OrnamentDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: ORANGE,
      }}
    >
      <span style={{ width: 36, height: 1, background: ORANGE }} />
      <span style={{ fontSize: 14 }}>❖</span>
      <span style={{ width: 36, height: 1, background: ORANGE }} />
    </div>
  );
}

function DiamondDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <span style={{ width: 90, height: 1, background: BORDER }} />
      <span
        style={{
          width: 6,
          height: 6,
          background: ORANGE,
          transform: "rotate(45deg)",
        }}
      />
      <span style={{ width: 90, height: 1, background: BORDER }} />
    </div>
  );
}

function SignatureBlock({
  name,
  title,
}: {
  name: string;
  title: string;
}) {
  return (
    <div style={{ textAlign: "center", width: 130 }}>
      <div style={{ height: 34 }} />
      <PersianText align="center">
        <div
          style={{
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 4,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 8, color: GRAY }}>{title}</div>
      </PersianText>
    </div>
  );
}

const CertificateDocument = React.forwardRef<HTMLDivElement, { data: CertificateData }>(
  function CertificateDocument({ data }, ref) {
    const { person, enrollment, courseClass, course, teacher } = data;
    const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

    const code = certificateNumber(course.id, enrollment.id);
    const startDate = formatDateDisplay(courseClass.start_date);
    const endDate = courseClass.end_date
      ? formatDateDisplay(courseClass.end_date)
      : startDate;
    const durationHours =
      course.total_hours != null
        ? `${toPersianDigits(String(course.total_hours))} ساعت`
        : "—";

    React.useEffect(() => {
      let cancelled = false;
      const payload = [
        "گواهینامه پایان دوره",
        `شماره: ${code}`,
        `دانش‌پذیر: ${person.full_name}`,
        `دوره: ${course.title}`,
        "مؤسسه فنی و آموزشی کادوس",
      ].join("\n");
      void QRCode.toDataURL(payload, {
        width: 200,
        margin: 0,
        color: { dark: DARK, light: "#00000000" },
      }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
      return () => {
        cancelled = true;
      };
    }, [code, person.full_name, course.title]);

    return (
      <div ref={ref} style={pageStyle}>
        <div style={frameStyle}>
          <div style={innerFrameStyle} aria-hidden />

          {/* decorative bottom-right wave — plain LTR positioning, right:0
              really means the right edge now. Kept short so it never
              reaches the signature row above it. */}
          <svg
            width="220"
            height="60"
            viewBox="0 0 220 60"
            style={{ position: "absolute", bottom: 0, right: 0, pointerEvents: "none" }}
            aria-hidden
          >
            <path
              d="M220,60 L220,38 C170,15 120,45 70,25 C45,15 20,20 0,8 L0,60 Z"
              fill={DARK}
              opacity={0.92}
            />
            <path
              d="M220,60 L220,48 C160,30 110,55 55,35 C30,25 12,28 0,20 L0,60 Z"
              fill={ORANGE}
            />
          </svg>

          {/* HEADER — plain LTR flex row: first child is visually left. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              zIndex: 1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/kadoos-logo.png"
              alt="کادوس"
              width={110}
              height={110}
              style={{ display: "block", objectFit: "contain" }}
            />

            <div style={{ flex: 1, textAlign: "center", paddingTop: 8 }}>
              <OrnamentDivider />
              <PersianText align="center" style={{ marginTop: 6 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: DARK }}>
                  گواهینامه پایان دوره
                </div>
              </PersianText>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: ORANGE,
                  letterSpacing: 3,
                  marginTop: 4,
                }}
              >
                CERTIFICATE OF COMPLETION
              </div>
            </div>

            <div style={{ width: 110 }} aria-hidden />
          </div>

          {/* BODY — text column (left) + info panel (right), both plain LTR. */}
          <div style={{ flex: 1, display: "flex", marginTop: 14, zIndex: 1 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <DiamondDivider />
              <PersianText align="center">
                <div style={{ fontSize: 12, color: GRAY }}>
                  بدین‌وسیله گواهی می‌شود که
                </div>
              </PersianText>
              <PersianText align="center">
                <div style={{ fontSize: 27, fontWeight: 700, color: DARK }}>
                  {genderTitle(person.gender)}
                  {person.full_name}
                </div>
              </PersianText>
              <DiamondDivider />
              <PersianText align="center">
                <div style={{ fontSize: 12, color: GRAY }}>
                  با موفقیت دوره آموزشی
                </div>
              </PersianText>
              <PersianText align="center">
                <div style={{ fontSize: 22, fontWeight: 700, color: ORANGE_DARK }}>
                  ‹ {course.title}
                </div>
              </PersianText>
              <PersianText align="center" style={{ maxWidth: 460 }}>
                <div style={{ fontSize: 12, lineHeight: 1.9 }}>
                  را در تاریخ {endDate} به مدت {durationHours} آموزشی با کسب حد
                  نصاب مورد نظر به پایان رسانده است.
                </div>
              </PersianText>
              <PersianText align="center">
                <div style={{ fontSize: 10, color: GRAY }}>
                  امیدواریم در مسیر یادگیری و پیشرفت، همواره موفق و سربلند باشید.
                </div>
              </PersianText>
            </div>

            <div
              style={{
                width: 190,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                paddingLeft: 14,
                marginLeft: 14,
                borderLeft: `1px solid ${BORDER}`,
                justifyContent: "center",
              }}
            >
              <InfoRow icon={CalendarDays} label="تاریخ شروع" value={startDate} />
              <InfoRow icon={CalendarCheck} label="تاریخ پایان" value={endDate} />
              <InfoRow icon={Clock} label="مدت دوره" value={durationHours} />
              <InfoRow icon={BookOpen} label="عنوان دوره" value={course.title} />
              <InfoRow icon={Award} label="شماره گواهینامه" value={code} />
            </div>
          </div>

          {/* FOOTER — QR+contact (left) then signatures (right), plain LTR. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: 10,
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="کد رهگیری گواهینامه"
                  width={56}
                  height={56}
                  style={{ display: "block" }}
                />
              ) : (
                <div style={{ width: 56, height: 56 }} aria-hidden />
              )}
              <PersianText align="left">
                <div style={{ fontSize: 8, color: GRAY, lineHeight: 1.7 }}>
                  <div>{INSTITUTE.website}</div>
                  <div>{INSTITUTE.address}</div>
                  <div>{INSTITUTE.phone}</div>
                </div>
              </PersianText>
            </div>

            {/* director (left) — decorative badge (middle) — teacher
                (right, nearest the wave), matching the reference. */}
            <div style={{ display: "flex", gap: 28, marginRight: 40 }}>
              <SignatureBlock
                name={INSTITUTE.directorName}
                title={INSTITUTE.directorTitle}
              />

              <div
                style={{
                  textAlign: "center",
                  width: 130,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <Award size={22} color={ORANGE} strokeWidth={1.75} />
                <PersianText align="center" style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 8, color: GRAY, lineHeight: 1.5 }}>
                    {INSTITUTE.tagline}
                  </div>
                </PersianText>
              </div>

              <SignatureBlock name={teacher?.name ?? "—"} title="مدرس دوره" />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

CertificateDocument.displayName = "CertificateDocument";

export { CertificateDocument };
