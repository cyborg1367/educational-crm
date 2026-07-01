#!/usr/bin/env node
/**
 * F07 visual QA script — run: node scripts/qa-f07.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "qa-screenshots", "f07");
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";

mkdirSync(OUT_DIR, { recursive: true });

const results = [];

function record(test, expected, actual, pass) {
  results.push({ test, expected, actual, pass: pass ? "Pass" : "Fail" });
}

async function screenshot(page, name) {
  const path = join(OUT_DIR, name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // ── TEST 1 — Timeline with mock data ──────────────────────────────
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector('[aria-label="تایم‌لاین"]', { timeout: 15000 });
  await screenshot(page, "01-timeline-mock.png");

  const timelineData = await page.evaluate(() => {
    const feed = document.querySelector('[aria-label="تایم‌لاین"]');
    if (!feed) return { error: "no feed" };

    const articles = [...feed.querySelectorAll("article")];
    return articles.map((article) => {
      const svg = article.querySelector("svg");
      const cls = svg?.getAttribute("class") ?? "";
      const icon =
        cls.includes("lucide-zap") ? "Zap" :
        cls.includes("lucide-message-square") ? "MessageSquare" :
        "unknown";
      const time = article.querySelector("time")?.textContent?.trim() ?? "";
      const label = article.querySelector("p")?.textContent?.trim() ?? "";
      const summary = article.querySelectorAll("p")[1]?.textContent?.trim() ?? "";
      return { icon, time, label, summary };
    });
  });

  const hasZap = timelineData.some((e) => e.icon === "Zap");
  const hasMessage = timelineData.some((e) => e.icon === "MessageSquare");
  const jalaliTimestamps = timelineData.every(
    (e) => /[۰-۹]/.test(e.time) && e.time.includes("/"),
  );
  const times = timelineData.map((e) => e.time);

  record(
    "TEST 1 — Zap icon on Activity entries",
    "At least one Zap icon",
    `${timelineData.filter((e) => e.icon === "Zap").length} Zap entries`,
    hasZap,
  );
  record(
    "TEST 1 — MessageSquare on Communication entries",
    "At least one MessageSquare icon",
    `${timelineData.filter((e) => e.icon === "MessageSquare").length} MessageSquare entries`,
    hasMessage,
  );
  record(
    "TEST 1 — Jalali timestamps",
    "All timestamps use Persian digits and /",
    times.slice(0, 3).join("; "),
    jalaliTimestamps && timelineData.length > 0,
  );

  // Verify descending sort (newest first) — compare ISO from datetime attr
  const sortOrder = await page.evaluate(() => {
    const times = [...document.querySelectorAll('[aria-label="تایم‌لاین"] time')].map(
      (el) => new Date(el.getAttribute("datetime") ?? 0).getTime(),
    );
    const sorted = [...times].sort((a, b) => b - a);
    return JSON.stringify(times) === JSON.stringify(sorted);
  });
  record(
    "TEST 1 — Newest first (desc created_at)",
    "Entries sorted descending",
    sortOrder ? "Descending order confirmed" : "Order incorrect",
    sortOrder,
  );

  // ── TEST 1b — Empty timeline ─────────────────────────────────────
  await page.goto(`${BASE_URL}/?emptyTimeline=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=رویدادی ثبت نشده است", { timeout: 15000 });
  await screenshot(page, "01b-timeline-empty.png");

  const emptyState = await page.evaluate(() => {
    const msg = document.body.innerText.includes("رویدادی ثبت نشده است");
    const hasButton = !!document.querySelector('[aria-label="تایم‌لاین"]')?.closest("section")?.querySelector("button");
    const emptySection = document.body.innerText.includes("رویدادی ثبت نشده است");
    const ctaInEmpty = [...document.querySelectorAll("button")].some(
      (b) => b.textContent?.includes("افزودن") || b.textContent?.includes("ایجاد"),
    );
    return { msg: emptySection, noCta: !ctaInEmpty };
  });
  record(
    "TEST 1 — EmptyState message",
    "رویدادی ثبت نشده است",
    emptyState.msg ? "Shown" : "Missing",
    emptyState.msg,
  );
  record(
    "TEST 1 — EmptyState no CTA",
    "No action button in empty state",
    emptyState.noCta ? "No CTA button" : "CTA found",
    emptyState.noCta,
  );

  // ── TEST 2 — Calendar Month mode ────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  const monthSection = page.locator("h2", { hasText: "Calendar — Month" }).locator("..");
  await monthSection.scrollIntoViewIfNeeded();
  await screenshot(page, "02-calendar-month.png");

  const monthData = await page.evaluate(() => {
    const headings = [...document.querySelectorAll("h2")];
    const monthH = headings.find((h) => h.textContent?.includes("Calendar — Month"));
    const container = monthH?.parentElement?.querySelector(".grid.grid-cols-7");
    const monthTitle = monthH?.parentElement?.querySelector("span")?.textContent ?? "";
    const weekdayLabels = [...(container?.querySelectorAll("span") ?? [])]
      .slice(0, 7)
      .map((s) => s.textContent?.trim());
    const dayCells = [...document.querySelectorAll(".grid.grid-cols-7 > div")].filter(
      (d) => d.querySelector("span"),
    );
    const dotsWithColors = dayCells.flatMap((cell) => {
      const day = cell.querySelector("span")?.textContent;
      const dots = [...cell.querySelectorAll("span[style*='background']")].map((d) =>
        d.getAttribute("style"),
      );
      return dots.length ? [{ day, dots, count: dots.length }] : [];
    });
    const jalaliMonth = /[آ-ی]/.test(monthTitle) && /[۰-۹]/.test(monthTitle);
    const jalaliWeekdays = weekdayLabels.every((l) => ["ش", "ی", "د", "س", "چ", "پ", "ج"].includes(l ?? ""));
    const brandColor = "var(--semantic-color-action-primary)";
    const warningColor = "var(--semantic-color-status-warning)";
    const neutralColor = "var(--semantic-color-status-neutral)";
    const hasBrand = dotsWithColors.some((d) => d.dots.some((s) => s?.includes(brandColor)));
    const hasWarning = dotsWithColors.some((d) => d.dots.some((s) => s?.includes(warningColor)));
    const hasNeutral = dotsWithColors.some((d) => d.dots.some((s) => s?.includes(neutralColor)));
    const multiEventDays = dotsWithColors.filter((d) => d.count >= 2);
    return {
      monthTitle,
      weekdayLabels,
      jalaliMonth,
      jalaliWeekdays,
      daysWithEvents: dotsWithColors.length,
      hasBrand,
      hasWarning,
      hasNeutral,
      multiEventDays,
      sampleDots: dotsWithColors.slice(0, 3),
    };
  });

  record(
    "TEST 2 — Jalali month title",
    "Persian digits in month header",
    monthData.monthTitle,
    monthData.jalaliMonth,
  );
  record(
    "TEST 2 — Jalali weekday headers",
    "ش ی د س چ پ ج",
    monthData.weekdayLabels.join(", "),
    monthData.jalaliWeekdays,
  );
  record(
    "TEST 2 — Event dots on days",
    "Dots on days with events",
    `${monthData.daysWithEvents} days with dots`,
    monthData.daysWithEvents > 0,
  );
  record(
    "TEST 2 — Class dot (brand)",
    "brand/purple dot present",
    monthData.hasBrand ? "Found" : "Missing",
    monthData.hasBrand,
  );
  record(
    "TEST 2 — Installment dot (warning)",
    "warning/amber dot present",
    monthData.hasWarning ? "Found" : "Missing",
    monthData.hasWarning,
  );
  record(
    "TEST 2 — Task dot (neutral)",
    "neutral/gray dot present",
    monthData.hasNeutral ? "Found" : "Missing",
    monthData.hasNeutral,
  );

  if (monthData.multiEventDays.length > 0) {
    const cell = page.locator(".grid.grid-cols-7 > div").filter({
      has: page.locator("span[style*='background']"),
    }).nth(0);
    await cell.click();
    await screenshot(page, "02b-calendar-day-multi.png");
    record(
      "TEST 2 — Day with multiple events click",
      "Screenshot after click",
      `${monthData.multiEventDays.length} multi-event days`,
      true,
    );
  } else {
    // Click a day with single event
    const eventCell = page.locator(".grid.grid-cols-7 > div").filter({
      has: page.locator("span[style*='background']"),
    }).first();
    if (await eventCell.count()) {
      await eventCell.click();
      await screenshot(page, "02b-calendar-day-single.png");
    }
    record(
      "TEST 2 — Day with multiple events click",
      "Screenshot of multi-event day",
      "No day has 2+ events in mock data — clicked single-event day instead",
      false,
    );
  }

  // ── TEST 3 — Agenda mode ──────────────────────────────────────────
  const agendaSection = page.locator("h2", { hasText: "Calendar — Agenda" }).locator("..");
  await agendaSection.scrollIntoViewIfNeeded();
  await screenshot(page, "03-calendar-agenda.png");

  const agendaData = await page.evaluate(() => {
    const headings = [...document.querySelectorAll("h2")];
    const agendaH = headings.find((h) => h.textContent?.includes("Calendar — Agenda"));
    const section = agendaH?.parentElement;
    const dateHeaders = [...(section?.querySelectorAll("li > p") ?? [])].map((p) => p.textContent?.trim());
    const links = [...(section?.querySelectorAll("a") ?? [])].map((a) => ({
      text: a.textContent?.trim(),
      href: a.getAttribute("href"),
    }));
    const dots = [...(section?.querySelectorAll("span[style*='background']") ?? [])].map((d) =>
      d.getAttribute("style"),
    );
    const jalaliDates = dateHeaders.every((d) => d && /[۰-۹]/.test(d) && d.includes("/"));
    return { dateHeaders, links, dotCount: dots.length, jalaliDates, itemCount: links.length };
  });

  record(
    "TEST 3 — Agenda grouped by Jalali date",
    "Date headers in Persian/Jalali",
    agendaData.dateHeaders.join("; "),
    agendaData.jalaliDates && agendaData.dateHeaders.length > 0,
  );
  record(
    "TEST 3 — Agenda chronological list",
    "Events with labels and hrefs",
    `${agendaData.itemCount} items, ${agendaData.links.filter((l) => l.href).length} with href`,
    agendaData.itemCount > 0,
  );
  record(
    "TEST 3 — Type color dots in agenda",
    "Colored type dots",
    `${agendaData.dotCount} dots`,
    agendaData.dotCount > 0,
  );

  // ── TEST 4 — Line chart ───────────────────────────────────────────
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await screenshot(page, "04-analytics-line.png");

  const lineChart = page.locator(".recharts-line").first();
  const lineBox = await lineChart.boundingBox().catch(() => null);
  if (lineBox) {
    await page.mouse.move(lineBox.x + lineBox.width / 2, lineBox.y + lineBox.height / 2);
    await page.waitForTimeout(300);
    await screenshot(page, "04b-analytics-line-tooltip.png");
  }

  const lineData = await page.evaluate(() => {
    const lineChart = document.querySelector(".recharts-line");
    const chartRoot = lineChart?.closest(".recharts-wrapper");
    const xTicks = chartRoot
      ? [...chartRoot.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick-value")].map(
          (t) => t.textContent?.trim(),
        )
      : [];
    const yTicks = chartRoot
      ? [...chartRoot.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value")].map(
          (t) => t.textContent?.trim(),
        )
      : [];
    const chartTitles = [...document.querySelectorAll("h3")].map((h) => h.textContent);
    const lineTitle = chartTitles.find((t) => t?.includes("ثبت‌نام")) ?? chartTitles[0];
    const persianX = xTicks.some((t) => t && /[آ-ی]/.test(t));
    const persianY = yTicks.some((t) => t && /[۰-۹]/.test(t));
    const tooltip = document.querySelector(".recharts-tooltip-wrapper")?.textContent ?? "";
    const persianTooltip =
      /[آ-ی]/.test(tooltip) && /[۰-۹]/.test(tooltip) && tooltip.includes(":");
    return { lineTitle, xTicks, yTicks, persianX, persianY, tooltip, persianTooltip };
  });

  record(
    "TEST 4 — Line chart Persian month labels",
    "Persian x-axis labels",
    lineData.xTicks.join(", "),
    lineData.persianX,
  );
  record(
    "TEST 4 — Line chart y-axis formatCount",
    "Persian digits on y-axis (count format for enrollment)",
    lineData.yTicks.slice(0, 4).join(", "),
    lineData.persianY,
  );
  record(
    "TEST 4 — Line chart tooltip",
    "Persian month: value (e.g. تیر: ۲۸)",
    lineData.tooltip || "No tooltip captured",
    lineData.persianTooltip,
  );

  // ── TEST 5 — Bar chart ────────────────────────────────────────────
  await screenshot(page, "05-analytics-bar.png");

  const barData = await page.evaluate(() => {
    const titles = [...document.querySelectorAll("h3")].map((h) => h.textContent?.trim());
    const barTitle = titles.find((t) => t?.includes("درآمد")) ?? "";
    const xTicks = [...document.querySelectorAll(".recharts-bar .recharts-rectangle")];
    const xLabels = [...document.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick-value")].map(
      (t) => t.textContent?.trim(),
    );
    const yTicks = [...document.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value")].map(
      (t) => t.textContent?.trim(),
    );
    const hasCourseNames = xLabels.some((l) => l && /[A-Za-zآ-ی]/.test(l));
    const persianY = yTicks.some((t) => t && /[۰-۹]/.test(t));
    const hasSeparator = yTicks.some((t) => t?.includes("٬"));
    return { barTitle, xLabels, yTicks, hasCourseNames, persianY, hasSeparator, barCount: xTicks.length };
  });

  record(
    "TEST 5 — Bar chart Persian title",
    "درآمد به تفکیک دوره",
    barData.barTitle,
    barData.barTitle.includes("درآمد"),
  );
  record(
    "TEST 5 — Bar chart course names on axis",
    "Course names visible",
    barData.xLabels.join(", "),
    barData.hasCourseNames,
  );
  record(
    "TEST 5 — Bar chart formatToman on y-axis",
    "Persian digits + ٬ separator",
    barData.yTicks.slice(0, 3).join(", "),
    barData.persianY && barData.hasSeparator,
  );

  // ── TEST 6 — Gauge chart ──────────────────────────────────────────
  await screenshot(page, "06-analytics-gauge.png");

  const gaugeData = await page.evaluate(() => {
    const gaugeHeading = [...document.querySelectorAll("h3")].find((h) =>
      h.textContent?.includes("وصول"),
    );
    const gaugeTitle = gaugeHeading?.textContent?.trim() ?? "";
    const gaugeRoot = gaugeHeading?.closest("div") ?? document.body;
    const svgText = gaugeRoot.querySelector("svg text")?.textContent?.trim() ?? "";
    const subtitleLines = [...gaugeRoot.querySelectorAll("p")]
      .map((p) => p.textContent?.trim())
      .filter((t) => t && (t.includes("مانده") || t.includes("وصول") || t.includes("صادر")));
    const paidLine = subtitleLines.find((t) => t.includes("وصول‌شده")) ?? "";
    const invoicedLine = subtitleLines.find((t) => t.includes("صادرشده")) ?? "";
    const pendingLine = subtitleLines.find((t) => t.includes("مانده")) ?? "";
    const persianPercent = /[۰-۹]/.test(svgText) && svgText.includes("٪");
    return {
      gaugeTitle,
      svgText,
      subtitleLines,
      paidLine,
      invoicedLine,
      pendingLine,
      persianPercent,
    };
  });

  record(
    "TEST 6 — Gauge Persian percentage",
    "e.g. ۸۵٪",
    gaugeData.svgText,
    gaugeData.persianPercent,
  );
  record(
    "TEST 6 — Gauge title",
    "نرخ وصول",
    gaugeData.gaugeTitle,
    gaugeData.gaugeTitle.includes("وصول"),
  );
  record(
    "TEST 6 — Gauge subtitle formatToman (pending)",
    "مانده with formatToman",
    gaugeData.pendingLine,
    gaugeData.pendingLine.includes("تومان") && /[۰-۹]/.test(gaugeData.pendingLine),
  );
  record(
    "TEST 6 — total_invoiced and total_paid displayed",
    "Both totals shown on gauge",
    `وصول: ${gaugeData.paidLine}; صادر: ${gaugeData.invoicedLine}`,
    gaugeData.paidLine.length > 0 && gaugeData.invoicedLine.length > 0,
  );

  writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify({ results, timelineData, monthData, agendaData, lineData, barData, gaugeData }, null, 2));

  console.log("\n=== F07 QA Report ===\n");
  console.log("| Test | Expected | Actual | Pass/Fail |");
  console.log("|------|----------|--------|-----------|");
  for (const r of results) {
    const exp = String(r.expected).replace(/\|/g, "\\|").slice(0, 60);
    const act = String(r.actual).replace(/\|/g, "\\|").slice(0, 60);
    console.log(`| ${r.test} | ${exp} | ${act} | ${r.pass} |`);
  }

  const fails = results.filter((r) => r.pass === "Fail").length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  console.log(`Screenshots: ${OUT_DIR}`);

  await browser.close();
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
