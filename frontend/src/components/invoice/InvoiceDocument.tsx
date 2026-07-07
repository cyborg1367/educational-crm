"use client";

import * as React from "react";

import type { InstallmentRead } from "@/lib/api/types";
import { formatDateDisplay } from "@/lib/locale/date";
import { formatToman, toPersianDigits } from "@/lib/locale/number";
import { installmentDescription } from "@/lib/pdf/installment-labels";
import type { InvoiceData } from "@/lib/pdf/types";
import { weekdayLabel } from "@/lib/terminology";

const DARK = "#1A1A1A";
const ORANGE = "#E87722";
const GRAY_BG = "#F8F8F8";
const BORDER = "#EBEBEB";
const GREEN = "#2E7D32";
const GREEN_BG = "#E8F5E9";
const ORANGE_WARN = "#E65100";
const ORANGE_BG = "#FFF3E0";
const RED = "#C62828";
const RED_BG = "#FFEBEE";

const FOOTER = {
  phone1: "۰۱۳۹۱۰۰۲۳۴۳",
  phone2: "۰۱۳۳۳۲۳۲۳۲۳",
  website: "www.kadoosedu.ir",
  address1: "رشت - خیابان لاکانی",
  address2: "ابتدای صندوق عدالت",
} as const;

const pageStyle: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  padding: "16mm",
  fontFamily: "'Vazirmatn', Tahoma, sans-serif",
  direction: "rtl",
  background: "white",
  fontSize: 11,
  color: DARK,
  boxSizing: "border-box",
};

function padCode(prefix: string, id: number): string {
  return `${prefix}-${String(id).padStart(4, "0")}`;
}

function paidDateDisplay(inst: InstallmentRead): string {
  if (inst.status !== "paid") return "—";
  return formatDateDisplay(inst.updated_at.slice(0, 10));
}

function installmentBadge(status: InstallmentRead["status"]) {
  switch (status) {
    case "paid":
      return { bg: GREEN_BG, color: GREEN, label: "✓ پرداخت‌شده" };
    case "overdue":
      return { bg: RED_BG, color: RED, label: "✗ معوق" };
    case "cancelled":
      return { bg: "#EEEEEE", color: "#666666", label: "لغو‌شده" };
    default:
      return { bg: ORANGE_BG, color: ORANGE_WARN, label: "⏱ در انتظار" };
  }
}

type InvoiceDocumentProps = {
  data: InvoiceData;
};

const InvoiceDocument = React.forwardRef<HTMLDivElement, InvoiceDocumentProps>(
  function InvoiceDocument({ data }, ref) {
    const {
      invoice,
      installments,
      enrollment,
      person,
      courseClass,
      course,
      teacher,
    } = data;

    const sorted = [...installments].sort((a, b) => a.sequence - b.sequence);
    const totalPaid = sorted.reduce((sum, inst) => sum + inst.paid_amount, 0);
    const remaining = Math.max(0, enrollment.final_amount - totalPaid);
    const pct =
      enrollment.final_amount > 0
        ? Math.round((totalPaid / enrollment.final_amount) * 100)
        : 0;
    const hasPayment = totalPaid > 0;
    const weekdays =
      courseClass.weekdays?.map((d) => weekdayLabel(d)).join("، ") ?? "—";

    return (
      <div ref={ref} style={pageStyle}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <img
              src="/images/kadoos-logo.png"
              alt="کادوس"
              width={72}
              height={72}
              style={{ display: "block", margin: "0 auto 4px", objectFit: "contain" }}
            />
            <div style={{ color: "#888", fontSize: 9 }}>موسسه فنی و آموزشی</div>
            <div style={{ color: ORANGE, fontSize: 18, fontWeight: 700 }}>کادوس</div>
            <div style={{ color: "#888", fontSize: 8 }}>آموزش امروز، مهارت فردا</div>
          </div>

          <div style={{ flex: 1, textAlign: "center", paddingTop: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: DARK }}>فاکتور رسمی</div>
            <div style={{ color: "#888", fontSize: 10, marginTop: 4 }}>
              ثبت‌نام در دوره آموزشی
            </div>
          </div>

          <div style={{ textAlign: "center", flexShrink: 0, minWidth: 110 }}>
            <div style={{ color: "#888", fontSize: 8 }}>شماره فاکتور</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              {toPersianDigits(padCode("INV", invoice.id))}
            </div>
            <div style={{ color: "#888", fontSize: 8 }}>تاریخ صدور</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {formatDateDisplay(invoice.created_at.slice(0, 10))}
            </div>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 8,
                fontWeight: 700,
                backgroundColor: hasPayment ? GREEN_BG : ORANGE_BG,
                color: hasPayment ? GREEN : ORANGE_WARN,
              }}
            >
              ● {hasPayment ? "فعال" : "در انتظار"}
            </span>
          </div>
        </div>

        <div
          style={{
            height: 2,
            backgroundColor: ORANGE,
            margin: "12px 0",
            width: "100%",
          }}
        />

        {/* INFO CARDS */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              flex: 1,
              background: GRAY_BG,
              borderRadius: 8,
              padding: 12,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                color: ORANGE,
                fontWeight: 700,
                fontSize: 10,
                borderBottom: `1px solid ${BORDER}`,
                paddingBottom: 6,
                marginBottom: 8,
              }}
            >
              👤 اطلاعات دانش‌پذیر
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {person.full_name}
            </div>
            <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>
              📞 {person.phone ? toPersianDigits(person.phone) : "—"}
            </div>
            <div style={{ fontSize: 10, color: "#444" }}>
              🎓 {toPersianDigits(padCode("STU", person.id))}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: GRAY_BG,
              borderRadius: 8,
              padding: 12,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                color: ORANGE,
                fontWeight: 700,
                fontSize: 10,
                borderBottom: `1px solid ${BORDER}`,
                paddingBottom: 6,
                marginBottom: 8,
              }}
            >
              📚 اطلاعات دوره
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              {course.title}
            </div>
            {[
              ["مدرس", teacher?.name ?? "—"],
              ["نام کلاس", courseClass.name],
              ["تاریخ شروع", formatDateDisplay(courseClass.start_date)],
              [
                "تاریخ پایان",
                courseClass.end_date
                  ? formatDateDisplay(courseClass.end_date)
                  : "—",
              ],
              ["روزهای برگزاری", weekdays],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                  fontSize: 9,
                }}
              >
                <span style={{ fontWeight: 500 }}>{value}</span>
                <span style={{ color: "#888" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FINANCIAL SUMMARY */}
        <div
          style={{
            background: DARK,
            borderRadius: 8,
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          {[
            {
              label: "مبلغ دوره",
              value: `${formatToman(enrollment.price_snapshot)} تومان`,
              color: "white",
              size: 13,
            },
            {
              label: "تخفیف",
              value: `${formatToman(enrollment.discount_snapshot)} تومان`,
              color: ORANGE,
              size: 13,
            },
            {
              label: "پرداخت‌شده",
              value: `${formatToman(totalPaid)} تومان`,
              color: GREEN,
              size: 13,
            },
            {
              label: "مانده قابل پرداخت",
              value: `${formatToman(remaining)} تومان`,
              color: ORANGE,
              size: 18,
              sub: "مانده",
            },
          ].map((col, i) => (
            <div
              key={col.label}
              style={{
                flex: 1,
                textAlign: "center",
                borderRight: i < 3 ? "1px solid #333" : undefined,
                padding: "0 8px",
              }}
            >
              <div style={{ color: "#888", fontSize: 8, marginBottom: 4 }}>
                {col.label}
              </div>
              <div style={{ color: col.color, fontSize: col.size, fontWeight: 700 }}>
                {col.value}
              </div>
              {col.sub ? (
                <div style={{ color: "#aaa", fontSize: 7, marginTop: 2 }}>{col.sub}</div>
              ) : null}
            </div>
          ))}
        </div>

        {/* PROGRESS + TABLE */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 10,
                marginBottom: 8,
              }}
            >
              📅 جدول اقساط
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: `1px solid ${BORDER}`,
              }}
            >
              <thead>
                <tr style={{ background: DARK, color: "white" }}>
                  {[
                    "ردیف",
                    "شرح",
                    "مبلغ (تومان)",
                    "تاریخ سررسید",
                    "تاریخ پرداخت",
                    "وضعیت",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 8px",
                        fontSize: 8,
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((inst, index) => {
                  const badge = installmentBadge(inst.status);
                  const isUpfront = inst.sequence === 1;
                  return (
                    <tr
                      key={inst.id}
                      style={{
                        background: index % 2 === 1 ? GRAY_BG : "white",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      <td style={{ padding: "5px 8px", fontSize: 8, textAlign: "center" }}>
                        {toPersianDigits(String(inst.sequence))}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          fontSize: 8,
                          textAlign: "center",
                          fontWeight: isUpfront ? 700 : 400,
                        }}
                      >
                        {installmentDescription(inst.sequence)}
                      </td>
                      <td style={{ padding: "5px 8px", fontSize: 8, textAlign: "center" }}>
                        {formatToman(inst.amount)}
                      </td>
                      <td style={{ padding: "5px 8px", fontSize: 8, textAlign: "center" }}>
                        {formatDateDisplay(inst.due_date)}
                      </td>
                      <td style={{ padding: "5px 8px", fontSize: 8, textAlign: "center" }}>
                        {paidDateDisplay(inst)}
                      </td>
                      <td style={{ padding: "5px 8px", fontSize: 8, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 7,
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: GRAY_BG, fontWeight: 700 }}>
                  <td
                    colSpan={5}
                    style={{
                      padding: "5px 8px",
                      fontSize: 8,
                      textAlign: "right",
                    }}
                  >
                    جمع کل
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      fontSize: 9,
                      textAlign: "center",
                      color: ORANGE,
                      fontWeight: 700,
                    }}
                  >
                    {formatToman(enrollment.final_amount)} تومان
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div
            style={{
              width: 160,
              flexShrink: 0,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 8 }}>
              وضعیت پرداخت
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke={BORDER}
                  strokeWidth="6"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke={ORANGE}
                  strokeWidth="6"
                  strokeDasharray={`${pct * 2.01} 201`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
                <text
                  x="40"
                  y="45"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="700"
                  fontFamily="Vazirmatn, Tahoma, sans-serif"
                >
                  {toPersianDigits(String(pct))}٪
                </text>
              </svg>
            </div>
            <div
              style={{
                fontSize: 8,
                color: "#888",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              از {formatToman(enrollment.final_amount)} تومان{" "}
              {toPersianDigits(String(pct))}٪ پرداخت‌شده
            </div>
            <div
              style={{
                borderTop: `1px solid ${BORDER}`,
                paddingTop: 8,
              }}
            >
              {[
                ["مبلغ کل", `${formatToman(enrollment.final_amount)} تومان`, DARK],
                ["پرداخت‌شده", `${formatToman(totalPaid)} تومان`, GREEN],
                ["مانده", `${formatToman(remaining)} تومان`, ORANGE],
              ].map(([label, value, color]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 8,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                  <span style={{ color: "#888" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIGNATURE ROW */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {[
            {
              labelTop: "امضای مسئول",
              labelBottom: "مدیر مالی",
              align: "right" as const,
            },
            { labelTop: "مهر موسسه", align: "center" as const },
            { labelTop: "تایید دیجیتال", align: "left" as const },
          ].map((box) => (
            <div
              key={box.labelTop}
              style={{
                flex: 1,
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                height: 70,
                padding: 8,
                position: "relative",
                background: "white",
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: "#888",
                  textAlign: box.align,
                }}
              >
                {box.labelTop}
              </div>
              {box.labelBottom ? (
                <div
                  style={{
                    fontSize: 7,
                    color: "#888",
                    textAlign: box.align,
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  {box.labelBottom}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div
          style={{
            background: DARK,
            borderRadius: 8,
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {[
            {
              title: "📞 تلفن",
              lines: [FOOTER.phone1, FOOTER.phone2],
            },
            {
              title: "🌐 وبسایت",
              lines: [FOOTER.website],
            },
            {
              title: "📍 آدرس",
              lines: [FOOTER.address1, FOOTER.address2],
            },
          ].map((col) => (
            <div key={col.title} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  color: ORANGE,
                  fontSize: 8,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {col.title}
              </div>
              {col.lines.map((line) => (
                <div
                  key={line}
                  style={{ color: "white", fontSize: 8, lineHeight: 1.5 }}
                >
                  {line}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

InvoiceDocument.displayName = "InvoiceDocument";

export { InvoiceDocument };
