"use client";

import * as React from "react";

import { API_BASE_URL } from "@/lib/api/config";
import { formatDateDisplay } from "@/lib/locale/date";
import { currentJalaliMonth } from "@/lib/locale/jalali-month";
import { toPersianDigits } from "@/lib/locale/number";
import type { CertificateData } from "@/lib/pdf/types";

import { Background } from "./Background";
import { Body } from "./Body";
import { Border } from "./Border";
import styles from "./CertificateDocument.module.css";
import { Details, type DetailItem } from "./Details";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Signatures } from "./Signatures";

/** Hardcoded institute-level info — a real, fixed detail about this one
 * institute, not per-record data (same category as the phone/address
 * constants already hardcoded in InvoiceDocument).
 *
 * directorSignatureSrc/sealSrc point at static files the institute drops
 * into frontend/public/images/ once real scans are available; until then
 * the request 404s and Signatures/Seal fall back to their generated
 * placeholders (see the onError handling in those components). */
const INSTITUTE = {
  website: "www.kadoos.ac.ir",
  phone: "۰۱۳۹۱۰۰۲۳۴۳ - ۰۱۳۳۳۲۳۲۳۲۳",
  address: "رشت، خیابان لاکانی، ابتدای صندوق عدالت",
  directorName: "مهندس علی شریفی",
  directorTitle: "مدیر مؤسسه",
  directorSignatureSrc: "/images/director-signature.png",
  sealSrc: "/images/institute-seal.png",
} as const;

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

const CertificateDocument = React.forwardRef<HTMLDivElement, { data: CertificateData }>(
  function CertificateDocument({ data }, ref) {
    const { person, enrollment, courseClass, course, teacher } = data;

    const code = certificateNumber(course.id, enrollment.id);
    const startDate = formatDateDisplay(courseClass.start_date);
    const endDate = courseClass.end_date
      ? formatDateDisplay(courseClass.end_date)
      : startDate;
    const durationLabel =
      course.total_hours != null
        ? `${toPersianDigits(String(course.total_hours))} ساعت`
        : "—";

    const detailItems: DetailItem[] = [
      { label: "شماره گواهینامه", value: code },
      { label: "تاریخ شروع", value: startDate },
      { label: "تاریخ پایان", value: endDate },
      { label: "مدت دوره", value: durationLabel },
      { label: "مدرس", value: teacher?.name ?? "—" },
    ];

    return (
      <div ref={ref} className={styles.page}>
        <div className={styles.frame}>
          <Background />
          <Border />
          <div className={styles.content}>
            <Header />
            <Body
              genderTitle={genderTitle(person.gender)}
              fullName={person.full_name}
              courseTitle={course.title}
              endDate={endDate}
              durationLabel={durationLabel}
            />
            <Details items={detailItems} />
            <Signatures
              directorName={INSTITUTE.directorName}
              directorTitle={INSTITUTE.directorTitle}
              directorSignatureSrc={INSTITUTE.directorSignatureSrc}
              instructorName={teacher?.name ?? "—"}
              instructorTitle="مدرس دوره"
              instructorSignatureSrc={
                teacher?.signature_url
                  ? `${API_BASE_URL}${teacher.signature_url}`
                  : undefined
              }
              sealSrc={INSTITUTE.sealSrc}
            />
            <div className={styles.footerRow}>
              <Footer
                website={INSTITUTE.website}
                phone={INSTITUTE.phone}
                address={INSTITUTE.address}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

CertificateDocument.displayName = "CertificateDocument";

export { CertificateDocument };
