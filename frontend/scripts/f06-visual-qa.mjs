/**
 * F06 Navigation & Layout — automated visual QA script.
 * Run: node scripts/f06-visual-qa.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://localhost:3000/test-layout";
const OUT_DIR = path.resolve("qa-screenshots/f06");

const results = [];

function record(test, expected, actual, pass) {
  results.push({ test, expected, actual, pass: pass ? "Pass" : "Fail" });
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function scrollPastHeader(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -72));
  await page.waitForTimeout(150);
}

async function selectRole(page, labelPattern) {
  const trigger = page.locator("#role-switcher");
  await scrollPastHeader(page, trigger);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  await page
    .locator("[data-radix-popper-content-wrapper] button")
    .filter({ hasText: labelPattern })
    .first()
    .click();
  await page.waitForTimeout(400);
}

async function openSelectAndPick(page, triggerLocator, optionText) {
  await triggerLocator.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  await page
    .locator("[data-radix-popper-content-wrapper] button")
    .filter({ hasText: optionText })
    .first()
    .click();
  await page.waitForTimeout(250);
}

async function getSidebarNavLabels(page) {
  const aside = page.locator('aside[aria-label="نوار کناری"]');
  if (await aside.isVisible()) {
    return aside.locator("a").allTextContents();
  }
  const drawer = page.locator("[data-vaul-drawer-wrapper] [data-vaul-drawer] a, [role='dialog'] a");
  if ((await drawer.count()) > 0) {
    return drawer.allTextContents();
  }
  return [];
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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "fa-IR",
  });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await shot(page, "00-initial-render");

  const teacherForbidden = ["فاکتورها", "درآمد", "وصول", "دپارتمان‌ها", "کاربران"];
  const t3t4Forbidden = [
    "سفرها", "مسیرها", "اقساط", "پرداخت‌ها", "بازپرداخت‌ها",
    "حضور و غیاب", "فعالیت‌ها", "ارتباطات",
  ];
  const adminNavExpected = [
    "داشبورد", "افراد", "ثبت‌نام‌ها", "فاکتورها", "کلاس‌ها",
    "دوره‌ها", "نقشه‌های راه", "دپارتمان‌ها", "کاربران",
    "وظایف", "تقویم", "درآمد", "ثبت‌نام", "وصول",
    "سازمان", "پروفایل",
  ];
  const teacherExpected = ["داشبورد", "کلاس‌ها", "افراد", "ثبت‌نام‌ها", "تقویم", "پروفایل"];

  // TEST 1 — Admin (default)
  let navLabels = (await getSidebarNavLabels(page)).map((t) => t.trim()).filter(Boolean);
  await shot(page, "01-admin-role");
  record(
    "TEST 1 — Admin nav items",
    adminNavExpected.join(", "),
    navLabels.join(", "),
    adminNavExpected.every((l) => navLabels.includes(l)),
  );
  record(
    "TEST 1 — No T3/T4 in Admin nav",
    "No T3/T4 entities",
    t3t4Forbidden.filter((l) => navLabels.includes(l)).join(", ") || "None",
    !t3t4Forbidden.some((l) => navLabels.includes(l)),
  );

  // Teacher
  await selectRole(page, /مدرس/);
  navLabels = (await getSidebarNavLabels(page)).map((t) => t.trim()).filter(Boolean);
  await shot(page, "02-teacher-role");
  record(
    "TEST 1 — Teacher nav items",
    teacherExpected.join(", "),
    navLabels.join(", "),
    teacherExpected.every((l) => navLabels.includes(l)),
  );
  record(
    "TEST 1 — Teacher hides invoices/reports/depts/users",
    `Hidden: ${teacherForbidden.join(", ")}`,
    teacherForbidden.filter((l) => navLabels.includes(l)).join(", ") || "All hidden",
    teacherForbidden.every((l) => !navLabels.includes(l)),
  );
  record(
    "TEST 1 — No T3/T4 in Teacher nav",
    "No T3/T4 entities",
    t3t4Forbidden.filter((l) => navLabels.includes(l)).join(", ") || "None",
    !t3t4Forbidden.some((l) => navLabels.includes(l)),
  );

  await selectRole(page, /مدیر/);

  // TEST 2 — Mobile sidebar
  await page.setViewportSize({ width: 800, height: 900 });
  await page.waitForTimeout(400);
  await shot(page, "03-mobile-collapsed");
  const menuBtn = page.getByRole("button", { name: "باز کردن منو" });
  const menuVisible = await menuBtn.isVisible();
  const asideHidden = !(await page.locator('aside[aria-label="نوار کناری"]').isVisible());
  record(
    "TEST 2 — Mobile collapsed + menu button",
    "Sidebar hidden, menu button visible",
    `menu=${menuVisible}, asideHidden=${asideHidden}`,
    menuVisible && asideHidden,
  );

  await menuBtn.click({ force: true });
  await page.waitForTimeout(600);
  await shot(page, "04-mobile-drawer-open");
  const drawer = page.locator("[data-vaul-drawer][data-state='open'], [data-vaul-drawer-wrapper] [data-state='open']");
  const drawerVisible = (await drawer.count()) > 0;
  const drawerBox = await drawer.first().boundingBox().catch(() => null);
  const drawerFromRight = drawerBox ? drawerBox.x > 300 : false;
  record(
    "TEST 2 — Drawer from RIGHT (RTL inline-start)",
    "Overlay drawer from right side",
    drawerBox ? `x=${Math.round(drawerBox.x)}, w=${Math.round(drawerBox.width)}` : `visible=${drawerVisible}`,
    drawerVisible && drawerFromRight,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);

  // TEST 3 — EntityTabs
  const tab1 = page.getByRole("tab", { name: "اطلاعات کلی" });
  const tab2 = page.getByRole("tab", { name: "ثبت‌نام‌ها" });
  const tab3 = page.getByRole("tab", { name: "تایم‌لاین" });

  await scrollPastHeader(page, tab1);
  await tab1.click();
  await shot(page, "05-tab1-overview");
  record("TEST 3 — Tab 1 content", "اطلاعات کلی visible", (await page.getByText("محتوای تب اطلاعات کلی").isVisible()) ? "Visible" : "Hidden", await page.getByText("محتوای تب اطلاعات کلی").isVisible());

  await tab2.click();
  await shot(page, "06-tab2-enrollments");
  record("TEST 3 — Tab 2 content", "ثبت‌نام‌ها visible", (await page.getByText("محتوای تب ثبت‌نام‌ها").isVisible()) ? "Visible" : "Hidden", await page.getByText("محتوای تب ثبت‌نام‌ها").isVisible());

  await tab3.click();
  await shot(page, "07-tab3-timeline");
  record("TEST 3 — Tab 3 content", "تایم‌لاین visible", (await page.getByText("محتوای تب تایم‌لاین").isVisible()) ? "Visible" : "Hidden", await page.getByText("محتوای تب تایم‌لاین").isVisible());

  await tab1.focus();
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(200);
  await shot(page, "08-tabs-keyboard-focus");
  const focusedTab = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
  record(
    "TEST 3 — Keyboard arrow tab switch",
    "Tab focused after arrow key",
    `Focused: ${focusedTab}`,
    ["اطلاعات کلی", "ثبت‌نام‌ها", "تایم‌لاین"].includes(focusedTab),
  );

  // TEST 4 — Breadcrumb
  await scrollPastHeader(page, page.locator("text=۲ خرده"));
  await shot(page, "09-breadcrumb-2-crumb");
  const crumb2Count = await page.locator('nav[aria-label="مسیر ناوبری"]').filter({ hasText: "برنامه‌نویسی" }).count();
  record("TEST 4 — 2-crumb hidden", "<3 crumbs = hidden", crumb2Count === 0 ? "Hidden" : "Visible", crumb2Count === 0);

  await scrollPastHeader(page, page.locator("text=۳ خرده"));
  await shot(page, "10-breadcrumb-3-crumb");
  const crumb3 = page.locator('nav[aria-label="مسیر ناوبری"]').filter({ hasText: "ثبت‌نام علی رضایی" });
  const crumb3Visible = (await crumb3.count()) > 0 && (await crumb3.first().isVisible());
  record("TEST 4 — 3-crumb visible", ">=3 crumbs = visible", crumb3Visible ? "Visible" : "Hidden", crumb3Visible);

  // TEST 5 — CommandPalette
  await scrollPastHeader(page, page.getByRole("button", { name: /باز کردن جستجوی سریع/ }));
  await page.getByRole("button", { name: /باز کردن جستجوی سریع/ }).click({ force: true });
  await page.waitForTimeout(300);
  await shot(page, "11-command-palette-open");
  const paletteOpen = await page.getByRole("dialog").isVisible();
  record("TEST 5 — Palette opens", "Dialog open", paletteOpen ? "Open" : "Closed", paletteOpen);

  await page.getByLabel("جستجو در صفحات").fill("داشبورد");
  await page.waitForTimeout(200);
  await shot(page, "12-command-palette-filtered");
  const firstResult = await page.locator('[role="listbox"] button').first().textContent();
  record("TEST 5 — Filter داشبورد", "داشبورد in results", firstResult?.trim() ?? "", firstResult?.includes("داشبورد") ?? false);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await shot(page, "13-command-palette-closed");
  record("TEST 5 — Escape closes", "Dialog closed", (await page.getByRole("dialog").count()) === 0 ? "Closed" : "Open", (await page.getByRole("dialog").count()) === 0);

  await selectRole(page, /مالی/);
  await scrollPastHeader(page, page.getByRole("button", { name: /باز کردن جستجوی سریع/ }));
  await page.getByRole("button", { name: /باز کردن جستجوی سریع/ }).click({ force: true });
  await page.waitForTimeout(300);
  const financeLabels = await page.locator('[role="listbox"] button').evaluateAll((btns) =>
    btns.map((b) => b.querySelector("span")?.textContent?.trim()).filter(Boolean),
  );
  await page.keyboard.press("Escape");
  record(
    "TEST 5 — Finance role-scoped",
    "No Teacher-only routes (کلاس‌ها)",
    financeLabels.join(", "),
    !financeLabels.includes("کلاس‌ها"),
  );

  await selectRole(page, /مدیر/);

  // TEST 6 — FilterBar
  await scrollPastHeader(page, page.locator("text=۶. FilterBar"));

  const statusTrigger = page.locator('label:has-text("وضعیت")').locator("xpath=..").locator("button").first();
  await openSelectAndPick(page, statusTrigger, "فعال");
  await page.waitForTimeout(300);
  await shot(page, "14-filter-status-active");
  const logText = await page.locator("pre").textContent();
  record(
    "TEST 6 — Status فعال",
    "فعال selected + onChange",
    logText ?? "",
    logText?.includes("active") ?? false,
  );

  const deptTrigger = page.locator('label:has-text("دپارتمان")').locator("xpath=..").locator("button").first();
  await openSelectAndPick(page, deptTrigger, "برنامه‌نویسی");
  await page.waitForTimeout(300);
  await shot(page, "15-filter-department");
  const logText2 = await page.locator("pre").textContent();
  record(
    "TEST 6 — Department filter",
    "programming in state",
    logText2 ?? "",
    logText2?.includes("programming") ?? false,
  );

  await page.getByRole("button", { name: /نمای ذخیره‌شده|وظایف من/ }).click({ force: true });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "وظایف من" }).click({ force: true });
  await page.waitForTimeout(300);
  await shot(page, "16-saved-view-my-tasks");
  const savedBtn = await page.getByRole("button", { name: "وظایف من" }).isVisible();
  const logText3 = await page.locator("pre").textContent();
  record(
    "TEST 6 — Saved view",
    "وظایف من active",
    `btn=${savedBtn}, log=${logText3?.includes("programming")}`,
    savedBtn && (logText3?.includes("programming") ?? false),
  );

  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify({ results }, null, 2));

  console.log("\n=== F06 Visual QA Report ===\n");
  console.log("| Test | Expected | Actual | Pass/Fail |");
  console.log("|------|----------|--------|-----------|");
  for (const r of results) {
    console.log(`| ${r.test} | ${String(r.expected).slice(0, 50)} | ${String(r.actual).slice(0, 50)} | ${r.pass} |`);
  }
  console.log(`\nScreenshots: ${OUT_DIR}`);

  await browser.close();
  process.exit(results.some((r) => r.pass === "Fail") ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
