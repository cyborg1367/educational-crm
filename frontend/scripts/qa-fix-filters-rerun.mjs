/**
 * Re-run QA for FIX A (StatusBadge Persian) and FIX B (server-side filters).
 * Run: node scripts/qa-fix-filters-rerun.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://localhost:8000";
const OUT_DIR = path.resolve("qa-screenshots/fix-filters-rerun");

const results = [];

function record(test, expected, actual, pass) {
  results.push({ test, expected, actual, pass: pass ? "Pass" : "Fail" });
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function loginApi(request) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: "admin@crm.local", password: "Admin1234!" },
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
  const { access_token: token } = await res.json();
  return token;
}

async function seedAuth(page, token) {
  await page.addInitScript(
    (t) => {
      window.localStorage.setItem("crm_access_token", t);
      window.localStorage.setItem("crm_user_role", "admin");
      document.cookie = `crm_access_token=${encodeURIComponent(t)}; Path=/; Max-Age=2592000; SameSite=Lax`;
    },
    token,
  );
}

async function waitLoaded(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
}

async function scrollPastHeader(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -80));
  await page.waitForTimeout(150);
}

async function openSelectAndPick(page, triggerLocator, optionText) {
  await scrollPastHeader(page, triggerLocator);
  await triggerLocator.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  await page
    .locator("[data-radix-popper-content-wrapper] button")
    .filter({ hasText: optionText })
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);
}

function capturePeopleRequests(page) {
  const urls = [];
  const handler = (req) => {
    if (req.url().includes("/people?")) urls.push(req.url());
  };
  page.on("request", handler);
  return { urls, stop: () => page.off("request", handler) };
}

function captureRequests(page, pathFragment) {
  const urls = [];
  const handler = (req) => {
    const url = req.url();
    if (url.startsWith(API) && url.includes(pathFragment)) urls.push(url);
  };
  page.on("request", handler);
  return { urls, stop: () => page.off("request", handler) };
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

  const apiCtx = await browser.newContext();
  const token = await loginApi(apiCtx.request);

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: "fa-IR",
  });
  const page = await context.newPage();
  await seedAuth(page, token);

  // ── TEST A — StatusBadge Persian labels ─────────────────────────────────
  await page.goto(`${BASE}/people`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "A1-people-list");
  const peopleText = await page.locator("tbody").innerText();
  record(
    "TEST A — /people StatusBadge",
    'Persian labels: "سرنخ" not "lead", "دانش‌آموز" not "student"',
    JSON.stringify({
      hasSarNakh: peopleText.includes("سرنخ"),
      hasDaneshAmooz: peopleText.includes("دانش‌آموز"),
      hasEnglishLead: /\blead\b/i.test(peopleText),
      hasEnglishStudent: /\bstudent\b/i.test(peopleText),
    }),
    peopleText.includes("سرنخ") &&
      peopleText.includes("دانش‌آموز") &&
      !/\blead\b/i.test(peopleText) &&
      !/\bstudent\b/i.test(peopleText),
  );

  await page.goto(`${BASE}/enrollments`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "A2-enrollments-list");
  const enrollText = await page.locator("tbody").innerText();
  record(
    "TEST A — /enrollments StatusBadge",
    '"فعال" not "active"',
    JSON.stringify({
      hasFaal: enrollText.includes("فعال"),
      hasEnglishActive: /\bactive\b/i.test(enrollText),
    }),
    enrollText.includes("فعال") && !/\bactive\b/i.test(enrollText),
  );

  await page.goto(`${BASE}/invoices`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "A3-invoices-list");
  const invoiceText = await page.locator("tbody").innerText();
  record(
    "TEST A — /invoices StatusBadge",
    '"باز" not "open"',
    JSON.stringify({
      hasBaz: invoiceText.includes("باز"),
      hasEnglishOpen: /\bopen\b/i.test(invoiceText),
    }),
    invoiceText.includes("باز") && !/\bopen\b/i.test(invoiceText),
  );

  await page.goto(`${BASE}/tasks`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "A4-tasks-list");
  const tasksText = await page.locator("tbody").innerText();
  record(
    "TEST A — /tasks StatusBadge",
    '"باز" not "open" for task status',
    JSON.stringify({
      hasBaz: tasksText.includes("باز"),
      hasEnglishOpen: /\bopen\b/i.test(tasksText),
    }),
    tasksText.includes("باز") && !/\bopen\b/i.test(tasksText),
  );

  // ── TEST B — Server-side filter params ──────────────────────────────────
  const peopleNet = captureRequests(page, "/people?");
  await page.goto(`${BASE}/people`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  const peopleStatusTrigger = page
    .locator('label:has-text("وضعیت")')
    .locator("xpath=..")
    .locator("button")
    .first();
  peopleNet.urls.length = 0;
  await openSelectAndPick(page, peopleStatusTrigger, "دانش‌آموز");
  await waitLoaded(page);
  await shot(page, "B1-people-filter-student");
  peopleNet.stop();
  const peopleReq = peopleNet.urls.find((u) => u.includes("/people?")) ?? "";
  record(
    "TEST B — /people ?status=student",
    "API request includes ?status=student",
    JSON.stringify({ requestUrl: peopleReq || "(none)", hasParam: peopleReq.includes("status=student") }),
    peopleReq.includes("status=student"),
  );

  const enrollNet = captureRequests(page, "/enrollments?");
  await page.goto(`${BASE}/enrollments`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  const enrollStatusTrigger = page
    .locator('label:has-text("وضعیت")')
    .locator("xpath=..")
    .locator("button")
    .first();
  enrollNet.urls.length = 0;
  await openSelectAndPick(page, enrollStatusTrigger, "فعال");
  await waitLoaded(page);
  await shot(page, "B2-enrollments-filter-active");
  enrollNet.stop();
  const enrollReq = enrollNet.urls.find((u) => u.includes("/enrollments?")) ?? "";
  record(
    "TEST B — /enrollments ?status=active",
    "API request includes ?status=active",
    JSON.stringify({ requestUrl: enrollReq || "(none)", hasParam: enrollReq.includes("status=active") }),
    enrollReq.includes("status=active"),
  );

  const classNet = captureRequests(page, "/classes?");
  await page.goto(`${BASE}/classes`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  const classStatusTrigger = page
    .locator('label:has-text("وضعیت")')
    .locator("xpath=..")
    .locator("button")
    .first();
  classNet.urls.length = 0;
  await openSelectAndPick(page, classStatusTrigger, "فعال");
  await waitLoaded(page);
  await shot(page, "B3-classes-filter-active");
  classNet.stop();
  const classReq = classNet.urls.find((u) => u.includes("/classes?")) ?? "";
  record(
    "TEST B — /classes ?status=active",
    "API request includes ?status=active",
    JSON.stringify({ requestUrl: classReq || "(none)", hasParam: classReq.includes("status=active") }),
    classReq.includes("status=active"),
  );

  const courseNet = captureRequests(page, "/courses?");
  await page.goto(`${BASE}/courses`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  courseNet.urls.length = 0;
  const activeCheckbox = page.getByLabel("فقط فعال");
  await scrollPastHeader(page, activeCheckbox);
  await activeCheckbox.check();
  await waitLoaded(page);
  await shot(page, "B4-courses-active-only");
  courseNet.stop();
  const courseReq = courseNet.urls.find((u) => u.includes("/courses?")) ?? "";
  record(
    "TEST B — /courses ?is_active=true",
    "API request includes ?is_active=true",
    JSON.stringify({ requestUrl: courseReq || "(none)", hasParam: courseReq.includes("is_active=true") }),
    courseReq.includes("is_active=true"),
  );

  await context.close();
  await apiCtx.close();
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    api: API,
    frontend: BASE,
    screenshotsDir: OUT_DIR,
    results,
  };
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("\n| Test | Expected | Actual | Pass/Fail |");
  console.log("|------|----------|--------|-----------|");
  for (const r of results) {
    const exp = String(r.expected).replace(/\|/g, "\\|").slice(0, 70);
    const act = String(r.actual).replace(/\|/g, "\\|").slice(0, 100);
    console.log(`| ${r.test} | ${exp} | ${act} | ${r.pass} |`);
  }

  const failed = results.filter((r) => r.pass === "Fail").length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
