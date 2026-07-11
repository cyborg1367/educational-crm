"use client";

import * as React from "react";

import { formatDateDisplay } from "@/lib/locale/date";
import { toPersianDigits } from "@/lib/locale/number";
import type { CertificateData } from "@/lib/pdf/types";

const DARK = "#1A1A1A";
const ORANGE = "#E87722";
const GOLD = "#B8860B";
const GRAY = "#888888";
const BORDER = "#EBEBEB";

const INSTITUTE = {
  name: "کادوس",
  kind: "موسسه فنی و آموزشی",
  tagline: "آموزش امروز، مهارت فردا",
  website: "www.kadoosedu.ir",
} as const;

const pageStyle: React.CSSProperties = {
  width: "297mm",
  height: "210mm",
  fontFamily: "'Vazirmatn', Tahoma, sans-serif",
  direction: "rtl",
  background: "white",
  color: DARK,
  boxSizing: "border-box",
  padding: "10mm",
  position: "relative",
};

const frameStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  border: `3px solid ${ORANGE}`,
  borderRadius: 4,
  padding: "10mm 16mm",
  boxSizing: "border-box",
  position: "relative",
  display: "flex",
  flexDirection: "column",
};

const innerFrameStyle: React.CSSProperties = {
  position: "absolute",
  inset: 8,
  border: `1px solid ${GOLD}`,
  borderRadius: 2,
  pointerEvents: "none",
};

function padCode(prefix: string, id: number): string {
  return `${prefix}-${String(id).padStart(4, "0")}`;
}

function courseDurationLabel(course: CertificateData["course"]): string | null {
  if (course.total_hours == null) return null;
  return `${toPersianDigits(String(course.total_hours))} ساعت آموزشی`;
}

const CertificateDocument = React.forwardRef<HTMLDivElement, { data: CertificateData }>(
  function CertificateDocument({ data }, ref) {
    const { person, enrollment, courseClass, course, teacher } = data;
    const durationLabel = courseDurationLabel(course);
    const issueDate = formatDateDisplay(new Date().toISOString().slice(0, 10));
    const startDate = formatDateDisplay(courseClass.start_date);
    const endDate = courseClass.end_date
      ? formatDateDisplay(courseClass.end_date)
      : issueDate;

    return (
      <div ref={ref} style={pageStyle}>
        <div style={frameStyle}>
          <div style={innerFrameStyle} aria-hidden />

          {/* HEADER */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/kadoos-logo.png"
                alt={INSTITUTE.name}
                width={56}
                height={56}
                style={{ display: "block", margin: "0 auto 2px", objectFit: "contain" }}
              />
              <div style={{ color: GRAY, fontSize: 8 }}>{INSTITUTE.kind}</div>
              <div style={{ color: ORANGE, fontSize: 15, fontWeight: 700 }}>
                {INSTITUTE.name}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ color: GRAY, fontSize: 8 }}>شماره گواهی</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                {toPersianDigits(padCode("CERT", enrollment.id))}
              </div>
            </div>
          </div>

          {/* TITLE */}
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <div
              style={{
                display: "inline-block",
                fontSize: 30,
                fontWeight: 700,
                color: DARK,
                letterSpacing: 1,
              }}
            >
              گواهی پایان دوره
            </div>
            <div
              style={{
                width: 120,
                height: 3,
                background: ORANGE,
                margin: "8px auto 0",
                borderRadius: 999,
              }}
            />
          </div>

          {/* BODY */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, color: GRAY }}>بدین‌وسیله گواهی می‌شود</div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: ORANGE,
                paddingBottom: 6,
                borderBottom: `1px solid ${BORDER}`,
                minWidth: 320,
              }}
            >
              {person.full_name}
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.9, maxWidth: 640 }}>
              دوره{" "}
              <span style={{ fontWeight: 700, color: DARK }}>{course.title}</span>
              {" "}را در کلاس{" "}
              <span style={{ fontWeight: 700, color: DARK }}>{courseClass.name}</span>
              {durationLabel ? (
                <>
                  {" "}به مدت{" "}
                  <span style={{ fontWeight: 700, color: DARK }}>{durationLabel}</span>
                </>
              ) : null}
              {" "}با موفقیت به پایان رسانده است.
            </div>

            <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>
              مدت برگزاری: {startDate} تا {endDate}
              {teacher ? <> — مدرس: {teacher.name}</> : null}
            </div>
          </div>

          {/* SIGNATURES */}
          <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 40 }} />
              <div
                style={{
                  borderTop: `1px solid ${BORDER}`,
                  paddingTop: 4,
                  fontSize: 9,
                  color: GRAY,
                }}
              >
                امضای مدرس
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 40 }} />
              <div
                style={{
                  borderTop: `1px solid ${BORDER}`,
                  paddingTop: 4,
                  fontSize: 9,
                  color: GRAY,
                }}
              >
                مهر موسسه
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 40 }} />
              <div
                style={{
                  borderTop: `1px solid ${BORDER}`,
                  paddingTop: 4,
                  fontSize: 9,
                  color: GRAY,
                }}
              >
                امضای مدیر آموزش
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: 8,
              color: GRAY,
            }}
          >
            <span>{INSTITUTE.website}</span>
            <span>تاریخ صدور: {issueDate}</span>
          </div>
        </div>
      </div>
    );
  },
);

CertificateDocument.displayName = "CertificateDocument";

export { CertificateDocument };
