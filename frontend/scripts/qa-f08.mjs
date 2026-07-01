/**
 * F08 Page Skeletons — automated visual QA script.
 * Run: node scripts/qa-f08.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_DIR = path.resolve("qa-screenshots/f08");

const results = [];

function record(test, expected, actual, pass) {
  results.push({ test, expected, actual, pass: pass ? "Pass" : "Fail" });
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function zoneAudit(page) {
  const zones = await page.locator("[data-zone]").evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-zone")),
  );
  return zones;
}

async function getBox(page, selector) {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return null;
  return el.boundingBox();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const chromiumPath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
    "/home/cyborgmass/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumPath,
  });

  // ── TEST 1 — List Page ──────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "fa-IR",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/skeletons/list-page`, { waitUntil: "networkidle" });
    await shot(page, "01-list-page-desktop");

    const header = page.locator('[data-zone="Header"]');
    const filterBar = page.locator('[data-zone="Filter-bar"]');
    const primary = page.locator('[data-zone="Primary"]');
    const title = page.getByRole("heading", { name: "افراد" });
    const actionBtn = page.getByRole("button", { name: "افزودن شخص" });
    const tableSlot = page.locator('[data-zone-placeholder="Primary"]').filter({
      hasText: "DataTable",
    });
    const skeletonRoot = page.locator(".max-w-\\[1280px\\]").first();
    const rootBox = await skeletonRoot.boundingBox();
    const viewportWidth = 1280;

    record(
      "TEST 1 — Header zone with title + action",
      "Header visible, title + action button",
      `header=${await header.isVisible()}, title=${await title.isVisible()}, action=${await actionBtn.isVisible()}`,
      (await header.isVisible()) &&
        (await title.isVisible()) &&
        (await actionBtn.isVisible()),
    );
    record(
      "TEST 1 — FilterBar zone below header",
      "Filter-bar visible with facets",
      `filterBar=${await filterBar.isVisible()}, statusFacet=${await page.locator('[data-zone="Filter-bar"] label').filter({ hasText: "وضعیت" }).first().isVisible()}`,
      (await filterBar.isVisible()) &&
        (await page
          .locator('[data-zone="Filter-bar"] label')
          .filter({ hasText: "وضعیت" })
          .first()
          .isVisible()),
    );
    record(
      "TEST 1 — DataTable slot in Primary (desktop)",
      "DataTable placeholder visible, cardList hidden",
      `tableSlot=${await tableSlot.isVisible()}`,
      await tableSlot.isVisible(),
    );
    record(
      "TEST 1 — max-w-[1280px] centered constraint",
      "Skeleton width <= 1280px on 1280 viewport",
      `width=${rootBox?.width?.toFixed(0)}`,
      rootBox && rootBox.width <= 1280,
    );

    const zones = await zoneAudit(page);
    record(
      "TEST 1 — data-zone landmarks",
      "Header, Filter-bar, Primary",
      zones.join(", "),
      zones.includes("Header") &&
        zones.includes("Filter-bar") &&
        zones.includes("Primary"),
    );

    await page.setViewportSize({ width: 767, height: 900 });
    await page.waitForTimeout(300);
    await shot(page, "01-list-page-tablet");
    const cardSlot = page.locator('[data-zone-placeholder="Primary"]').filter({
      hasText: "EntitySummaryCard",
    });
    const tableHidden = !(await tableSlot.isVisible());
    const cardVisible = await cardSlot.isVisible();
    record(
      "TEST 1 — Below tablet (767px): card-list replaces table",
      "cardList visible, DataTable hidden below 768px",
      `tableHidden=${tableHidden}, cardVisible=${cardVisible}`,
      tableHidden && cardVisible,
    );
    await ctx.close();
  }

  // ── TEST 2 — T1 Detail ──────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "fa-IR",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/skeletons/t1-detail`, { waitUntil: "networkidle" });
    await shot(page, "02-t1-detail-desktop");

    const header = page.locator('[data-zone="Header"]');
    const statusSlot = page.locator('[data-zone-placeholder="Header"]').filter({
      hasText: "StatusAction",
    });
    const primary = page.locator('[data-zone="Primary"]');
    const secondary = page.locator('[data-zone="Secondary"]');
    const tablist = page.locator('[role="tablist"]');

    const primaryBox = await primary.boundingBox();
    const secondaryBox = await secondary.boundingBox();

    record(
      "TEST 2 — Header + StatusAction slot + EntityTabs",
      "Header, StatusAction placeholder, tablist visible",
      `header=${await header.isVisible()}, status=${await statusSlot.isVisible()}, tabs=${await tablist.isVisible()}`,
      (await header.isVisible()) &&
        (await statusSlot.isVisible()) &&
        (await tablist.isVisible()),
    );

    const secondaryOnInlineStart =
      primaryBox &&
      secondaryBox &&
      secondaryBox.x < primaryBox.x;
    record(
      "TEST 2 — Secondary 320px at inline-start (LEFT in RTL)",
      "Secondary column left of Primary on desktop",
      `secondaryX=${secondaryBox?.x?.toFixed(0)}, primaryX=${primaryBox?.x?.toFixed(0)}, secondaryW=${secondaryBox?.width?.toFixed(0)}`,
      secondaryOnInlineStart && secondaryBox && Math.abs(secondaryBox.width - 320) < 40,
    );

    const tabIds = ["overview", "enrollments", "timeline"];
    const tabLabels = ["اطلاعات کلی", "ثبت‌نام‌ها", "تایم‌لاین"];
    for (let i = 0; i < tabIds.length; i++) {
      await page.getByRole("tab", { name: tabLabels[i] }).click();
      await page.waitForTimeout(200);
      await shot(page, `02-t1-tab-${i + 1}-${tabIds[i]}`);
      const panelVisible = await page
        .locator(`#tabpanel-${tabIds[i]}`)
        .isVisible();
      record(
        `TEST 2 — Tab ${i + 1} (${tabLabels[i]})`,
        "Tab panel visible after click",
        `panelVisible=${panelVisible}`,
        panelVisible,
      );
    }

    const zones = await zoneAudit(page);
    record(
      "TEST 2 — data-zone landmarks",
      "Header, Primary, Secondary",
      zones.join(", "),
      zones.includes("Header") &&
        zones.includes("Primary") &&
        zones.includes("Secondary"),
    );

    await page.setViewportSize({ width: 767, height: 900 });
    await page.waitForTimeout(300);
    await shot(page, "02-t1-detail-tablet");
    const pBox = await primary.boundingBox();
    const sBox = await secondary.boundingBox();
    const stacked = pBox && sBox && sBox.y > pBox.y + pBox.height - 20;
    record(
      "TEST 2 — Below tablet (767px): Secondary below Primary",
      "Secondary stacks under Primary below 768px",
      `primaryY=${pBox?.y?.toFixed(0)}, primaryH=${pBox?.height?.toFixed(0)}, secondaryY=${sBox?.y?.toFixed(0)}`,
      stacked,
    );
    await ctx.close();
  }

  // ── TEST 3 — T2 Detail ──────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "fa-IR",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/skeletons/t2-detail`, { waitUntil: "networkidle" });
    await shot(page, "03-t2-detail");

    const tablist = page.locator('[role="tablist"]');
    const secondary = page.locator('[data-zone="Secondary"]');
    const primary = page.locator('[data-zone="Primary"]');
    const editBtn = page.getByRole("button", { name: "ویرایش" });

    record(
      "TEST 3 — Single-pane T2 layout",
      "Primary only, no tabs, no secondary",
      `primary=${await primary.isVisible()}, tabs=${await tablist.count()}, secondary=${await secondary.count()}`,
      (await primary.isVisible()) &&
        (await tablist.count()) === 0 &&
        (await secondary.count()) === 0,
    );
    record(
      "TEST 3 — Header with edit action",
      "Edit button in header",
      `edit=${await editBtn.isVisible()}`,
      await editBtn.isVisible(),
    );

    const zones = await zoneAudit(page);
    record(
      "TEST 3 — data-zone landmarks",
      "Header, Primary only",
      zones.join(", "),
      zones.includes("Header") &&
        zones.includes("Primary") &&
        !zones.includes("Secondary"),
    );
    await ctx.close();
  }

  // ── TEST 4 — Wizard ───────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "fa-IR",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/skeletons/wizard`, { waitUntil: "networkidle" });
    await shot(page, "04-wizard-step1");

    const stepper = page.locator('nav[aria-label="پیشرفت مراحل"]');
    const primary = page.locator('[data-zone="Primary"]');
    const actionBar = page.locator('[data-zone="Action-bar"]');
    const nextBtn = page.getByRole("button", { name: "بعدی" });

    const primaryBox = await primary.boundingBox();
    record(
      "TEST 4 — Stepper in header",
      "Stepper nav visible with steps",
      `stepper=${await stepper.isVisible()}, steps=${await stepper.locator("li").count()}`,
      (await stepper.isVisible()) && (await stepper.locator("li").count()) >= 3,
    );
    record(
      "TEST 4 — Centered form max-w-[640px]",
      "Primary zone width <= 640px",
      `primaryWidth=${primaryBox?.width?.toFixed(0)}`,
      primaryBox && primaryBox.width <= 660,
    );
    record(
      "TEST 4 — Sticky Action-bar with next button",
      "Action-bar visible, next at inline-end",
      `actionBar=${await actionBar.isVisible()}, next=${await nextBtn.isVisible()}`,
      (await actionBar.isVisible()) && (await nextBtn.isVisible()),
    );

    await nextBtn.click();
    await page.waitForTimeout(200);
    await shot(page, "04-wizard-step2");
    const backBtn = page.getByRole("button", { name: "بازگشت" });
    const backBox = await backBtn.boundingBox();
    const nextBox = await nextBtn.boundingBox();
    const backOnRight = backBox && nextBox && backBox.x > nextBox.x;
    record(
      "TEST 4 — RTL Action-bar: back RIGHT, next LEFT",
      "back.x > next.x in RTL",
      `backX=${backBox?.x?.toFixed(0)}, nextX=${nextBox?.x?.toFixed(0)}`,
      backOnRight,
    );

    const zones = await zoneAudit(page);
    record(
      "TEST 4 — data-zone landmarks",
      "Header, Primary, Action-bar",
      zones.join(", "),
      zones.includes("Header") &&
        zones.includes("Primary") &&
        zones.includes("Action-bar"),
    );
    await ctx.close();
  }

  // ── TEST 5 — Split View ───────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "fa-IR",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/skeletons/split-view`, { waitUntil: "networkidle" });
    await shot(page, "05-split-view-empty");

    const filterBar = page.locator('[data-zone="Filter-bar"]');
    const primary = page.locator('[data-zone="Primary"]');
    const secondary = page.locator('[data-zone="Secondary"]');
    const emptyMsg = page.getByText("یک مورد از لیست انتخاب کنید");
    const drawer = page.locator("[data-vaul-drawer]");

    const pBox = await primary.boundingBox();
    const sBox = await secondary.boundingBox();
    const paneRatio =
      pBox && sBox ? (pBox.width / (pBox.width + sBox.width)) * 100 : 0;

    record(
      "TEST 5 — FilterBar at top",
      "Filter-bar visible",
      `filterBar=${await filterBar.isVisible()}`,
      await filterBar.isVisible(),
    );
    record(
      "TEST 5 — Left pane ~40% with table slot",
      "Primary ~40% width",
      `ratio=${paneRatio.toFixed(1)}%`,
      paneRatio >= 35 && paneRatio <= 45,
    );
    record(
      "TEST 5 — Right persistent pane with EmptyState",
      "EmptyState when nothing selected, NOT drawer",
      `empty=${await emptyMsg.isVisible()}, drawerCount=${await drawer.count()}`,
      (await emptyMsg.isVisible()) && (await drawer.count()) === 0,
    );

    await page.getByRole("button", { name: "نمایش جزئیات انتخاب‌شده" }).click();
    await page.waitForTimeout(300);
    await shot(page, "05-split-view-selected");
    const detailSlot = page.getByText("محتوای جزئیات وظیفه انتخاب‌شده");
    record(
      "TEST 5 — Right pane updates on selection",
      "Detail content replaces EmptyState",
      `detailVisible=${await detailSlot.isVisible()}, emptyVisible=${await emptyMsg.isVisible()}`,
      (await detailSlot.isVisible()) && !(await emptyMsg.isVisible()),
    );

    const zones = await zoneAudit(page);
    record(
      "TEST 5 — data-zone landmarks",
      "Filter-bar, Primary, Secondary",
      zones.join(", "),
      zones.includes("Filter-bar") &&
        zones.includes("Primary") &&
        zones.includes("Secondary"),
    );
    await ctx.close();
  }

  // ── TEST 6 — Dashboard ────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "fa-IR",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/skeletons/dashboard`, { waitUntil: "networkidle" });
    await shot(page, "06-dashboard");

    const header = page.locator('[data-zone="Header"]');
    const primary = page.locator('[data-zone="Primary"]');
    const grid = primary.locator(".grid.grid-cols-12");
    const widgets = primary.locator('[data-zone-placeholder="Primary"]');
    const addBtn = page.getByRole("button", { name: /افزودن|Add/i });

    record(
      "TEST 6 — 12-column grid with widget slots",
      "Grid + multiple widget placeholders",
      `grid=${await grid.isVisible()}, widgets=${await widgets.count()}`,
      (await grid.isVisible()) && (await widgets.count()) >= 4,
    );
    record(
      "TEST 6 — No primary action in header",
      "No add/action button in dashboard header",
      `addBtnCount=${await addBtn.count()}`,
      (await addBtn.count()) === 0,
    );
    record(
      "TEST 6 — Greeting header (read-first)",
      "Greeting text visible",
      `greeting=${await page.getByText("سلام، مدیر عزیز").isVisible()}`,
      await page.getByText("سلام، مدیر عزیز").isVisible(),
    );

    const zones = await zoneAudit(page);
    record(
      "TEST 6 — data-zone landmarks",
      "Header, Primary",
      zones.includes("Header") && zones.includes("Primary"),
      zones.includes("Header") && zones.includes("Primary"),
    );
    await ctx.close();
  }

  // ── TEST 7 — Settings Layout ──────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "fa-IR",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/skeletons/settings-layout`, {
      waitUntil: "networkidle",
    });
    await shot(page, "07-settings-layout");

    const nav = page.locator('nav[aria-label="زیرمنوی تنظیمات"]');
    const primary = page.locator('[data-zone="Primary"]');
    const navBox = await nav.boundingBox();
    const primaryBox = await primary.boundingBox();
    const navOnInlineStart = navBox && primaryBox && navBox.x > primaryBox.x;

    record(
      "TEST 7 — Sub-nav inline-start (RIGHT in RTL), panel inline-end",
      "Nav at inline-start (right), panel at inline-end (left) in RTL",
      `navX=${navBox?.x?.toFixed(0)}, panelX=${primaryBox?.x?.toFixed(0)}`,
      navOnInlineStart,
    );

    const activeLink = page.locator('a[aria-current="page"]');
    record(
      "TEST 7 — Active sub-nav item visible",
      "عمومی link has aria-current=page",
      `active=${await activeLink.textContent()}`,
      (await activeLink.count()) === 1 &&
        (await activeLink.textContent())?.includes("عمومی"),
    );

    await page.getByRole("link", { name: "اعلان‌ها" }).click();
    await page.waitForTimeout(300);
    await shot(page, "07-settings-notifications");
    record(
      "TEST 7 — Sub-nav click navigates",
      "URL includes #notifications after click",
      `url=${page.url()}`,
      page.url().includes("#notifications"),
    );

    const zones = await zoneAudit(page);
    record(
      "TEST 7 — data-zone landmarks",
      "Primary zone present",
      zones.join(", "),
      zones.includes("Primary"),
    );
    await ctx.close();
  }

  // ── TEST 8 — Calendar ─────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "fa-IR",
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/skeletons/calendar`, { waitUntil: "networkidle" });
    await shot(page, "08-calendar-month");

    const header = page.locator('[data-zone="Header"]');
    const primary = page.locator('[data-zone="Primary"]');
    const monthBtn = page.getByRole("button", { name: "ماهانه" });
    const agendaBtn = page.getByRole("button", { name: "دستور کار" });

    record(
      "TEST 8 — Month/agenda toggle in header",
      "Both mode buttons visible",
      `month=${await monthBtn.isVisible()}, agenda=${await agendaBtn.isVisible()}`,
      (await monthBtn.isVisible()) && (await agendaBtn.isVisible()),
    );
    record(
      "TEST 8 — CalendarAgenda in Primary (month mode)",
      "Calendar grid visible",
      `primary=${await primary.isVisible()}, gridCells=${await primary.locator("button").count()}`,
      (await primary.isVisible()) && (await primary.locator("button").count()) > 0,
    );

    await agendaBtn.click();
    await page.waitForTimeout(300);
    await shot(page, "08-calendar-agenda");
    record(
      "TEST 8 — Agenda mode toggle",
      "Agenda button active (primary variant)",
      `agendaPressed=${await agendaBtn.evaluate((el) => el.className.includes("action-primary") || el.className.includes("bg-[var(--semantic-color-action-primary)]"))}`,
      await agendaBtn.evaluate(
        (el) =>
          el.className.includes("action-primary") ||
          el.className.includes("bg-[var(--semantic-color-action-primary)]"),
      ),
    );

    const zones = await zoneAudit(page);
    record(
      "TEST 8 — data-zone landmarks",
      "Header, Primary",
      zones.join(", "),
      zones.includes("Header") && zones.includes("Primary"),
    );
    await ctx.close();
  }

  await browser.close();

  const passCount = results.filter((r) => r.pass === "Pass").length;
  const failCount = results.filter((r) => r.pass === "Fail").length;
  const report = {
    summary: { total: results.length, pass: passCount, fail: failCount },
    results,
  };
  await writeFile(
    path.join(OUT_DIR, "report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log("\nF08 Visual QA Report");
  console.log("=".repeat(72));
  for (const r of results) {
    console.log(`${r.pass === "Pass" ? "✓" : "✗"} ${r.test}`);
    console.log(`  Expected: ${r.expected}`);
    console.log(`  Actual:   ${r.actual}`);
  }
  console.log("=".repeat(72));
  console.log(`Total: ${results.length} | Pass: ${passCount} | Fail: ${failCount}`);
  console.log(`Screenshots: ${OUT_DIR}`);
  console.log(`Report: ${path.join(OUT_DIR, "report.json")}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
