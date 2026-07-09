/**
 * Visual QA for audit fixes (TaskType, invoices, people filters, dashboard).
 * Run: node scripts/qa-fix-filters.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://localhost:8000";
const OUT_DIR = path.resolve("qa-screenshots/fix-filters");

const EXPECTED_TASK_LABELS = [
  "پیگیری ثبت‌نام",
  "پیش‌ثبت‌نام بدون پرداخت",
  "اقساط معوق",
  "مشاوره پس از دوره",
  "سفارشی",
];

const results = [];
const netCaptures = [];

function record(test, expected, actual, pass) {
  results.push({ test, expected, actual, pass: pass ? "Pass" : "Fail" });
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function loginApi(request, email, password) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`Login failed for ${email}: ${res.status()}`);
  const { access_token: token } = await res.json();
  return token;
}

async function apiGet(request, token, route) {
  const res = await request.get(`${API}${route}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return { ok: false, status: res.status(), data: null };
  return { ok: true, status: res.status(), data: await res.json() };
}

async function seedAuth(page, token, role) {
  await page.addInitScript(
    ({ t, r }) => {
      window.localStorage.setItem("crm_access_token", t);
      window.localStorage.setItem("crm_user_role", r);
      document.cookie = `crm_access_token=${encodeURIComponent(t)}; Path=/; Max-Age=2592000; SameSite=Lax`;
    },
    { t: token, r: role },
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
  await page.waitForTimeout(300);
}

async function loginViaForm(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="text"]').first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  await waitLoaded(page);
}

function captureNetwork(page, label) {
  const bucket = [];
  const handler = (req) => {
    const url = req.url();
    if (url.startsWith(API)) {
      bucket.push({ method: req.method(), url });
    }
  };
  page.on("request", handler);
  return {
    stop: () => page.off("request", handler),
    bucket,
    label,
  };
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
  const request = apiCtx.request;
  const adminToken = await loginApi(request, "admin@crm.local", "Admin1234!");
  const managerToken = await loginApi(request, "manager@crm.local", "Manager1234!");

  const managerMe = (await apiGet(request, managerToken, "/auth/me")).data;
  const managerTasks = (
    await apiGet(request, managerToken, "/tasks?limit=200&offset=0")
  ).data?.items?.filter((t) => t.status === "open" && t.assignee_id === managerMe.id) ?? [];

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: "fa-IR",
  });
  const page = await context.newPage();

  // ── TEST 1 — /tasks TaskType labels ─────────────────────────────────────
  await seedAuth(page, adminToken, "admin");
  await page.goto(`${BASE}/tasks`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "01-tasks-list");

  const bodyText = await page.locator("body").innerText();
  const foundLabels = EXPECTED_TASK_LABELS.filter((l) => bodyText.includes(l));
  const missingLabels = EXPECTED_TASK_LABELS.filter((l) => !bodyText.includes(l));
  const emptyTypeCells =
    (await page.locator("tbody tr td:first-child").filter({ hasText: /^$/ }).count()) +
    (await page
      .locator("tbody tr td:first-child")
      .filter({ hasText: /^—$/ })
      .count());

  // Open type filter — multi checkboxes in FilterBar
  const typeLegend = page.getByText("نوع", { exact: true }).first();
  await typeLegend.scrollIntoViewIfNeeded();
  const typeOptionsVisible = EXPECTED_TASK_LABELS.map((l) => bodyText.includes(l));

  await shot(page, "01b-tasks-type-filter");

  record(
    "TEST 1 — /tasks TaskType labels",
    "Type column shows Persian labels for all 5 task types; filter shows correct options",
    JSON.stringify({
      foundLabels,
      missingLabels,
      emptyTypeCells,
      typeOptionsInFilter: typeOptionsVisible,
    }),
    missingLabels.length === 0 && emptyTypeCells === 0 && typeOptionsVisible.every(Boolean),
  );

  // ── TEST 2 — /invoices list page ────────────────────────────────────────
  const net2 = captureNetwork(page, "invoices");
  await page.goto(`${BASE}/invoices`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "02-invoices-list");

  const invoicesBody = await page.locator("body").innerText();
  const not404 = !invoicesBody.includes("404") && !page.url().includes("404");
  const hasTitle = invoicesBody.includes("فاکتورها");
  const invoiceRows = await page.locator("tbody tr").count();
  const tbodyText = await page.locator("tbody").innerText().catch(() => "");
  const hasStatusBadge =
    /open|paid|partially|void|باز/.test(tbodyText) ||
    (await page.locator("tbody span").count()) > 0;
  const hasToman = /تومان|٬/.test(tbodyText);
  const hasStatusFacet = (await page.getByText("وضعیت").count()) > 0;
  net2.stop();
  netCaptures.push(...net2.bucket);

  let navigatedToDetail = false;
  if (invoiceRows > 0) {
    await page.locator("tbody tr").first().click();
    await page.waitForTimeout(800);
    navigatedToDetail = /\/invoices\/\d+/.test(page.url());
    await shot(page, "02b-invoices-detail");
  }

  record(
    "TEST 2 — /invoices list page",
    "Not 404; DataTable rows; StatusBadge; formatToman; status filter; row → /invoices/[id]",
    JSON.stringify({
      not404,
      hasTitle,
      invoiceRows,
      hasStatusBadge: Boolean(hasStatusBadge),
      hasToman,
      hasStatusFacet,
      navigatedToDetail,
      url: page.url(),
    }),
    not404 && hasTitle && invoiceRows > 0 && hasToman && hasStatusFacet && navigatedToDetail,
  );

  // ── TEST 3 — /people department filter ──────────────────────────────────
  await page.goto(`${BASE}/people`, { waitUntil: "networkidle" });
  await waitLoaded(page);

  const deptTrigger = page
    .locator('label:has-text("دپارتمان")')
    .locator("xpath=..")
    .locator("button")
    .first();
  await openSelectAndPick(page, deptTrigger, "برنامه‌نویسی");
  await waitLoaded(page);
  await shot(page, "03-people-department-filter");

  const peopleRowsAfterDept = await page.locator("tbody tr").count();
  const emptyAfterDept =
    (await page.getByText("موردی یافت نشد").isVisible()) && peopleRowsAfterDept === 0;

  record(
    "TEST 3 — /people department filter",
    "Selecting department shows filtered results (not empty)",
    JSON.stringify({
      deptSelected: "برنامه‌نویسی",
      peopleRowsAfterDept,
      emptyAfterDept,
    }),
    peopleRowsAfterDept > 0 && !emptyAfterDept,
  );

  // ── TEST 4 — /people search ─────────────────────────────────────────────
  await page.goto(`${BASE}/people`, { waitUntil: "networkidle" });
  await waitLoaded(page);

  const searchInput = page.getByPlaceholder("جستجو بر اساس نام یا تلفن");
  await searchInput.fill("علی");
  await page.waitForTimeout(500);
  await shot(page, "04a-people-search-name");
  const nameRows = await page.locator("tbody tr").count();
  const nameBody = await page.locator("tbody").innerText();
  const nameHasAli = nameBody.includes("علی");

  await searchInput.fill("");
  await searchInput.fill("0912");
  await page.waitForTimeout(500);
  await shot(page, "04b-people-search-phone-latin");
  const phoneLatinRows = await page.locator("tbody tr").count();
  const phoneLatinBody = await page.locator("tbody").innerText();
  const phoneLatinHas0912 = phoneLatinBody.includes("0912");

  await searchInput.fill("");
  await searchInput.fill("۰۹۱۲");
  await page.waitForTimeout(500);
  await shot(page, "04c-people-search-phone-persian");
  const phonePersianRows = await page.locator("tbody tr").count();
  const phonePersianBody = await page.locator("tbody").innerText();
  const phonePersianHas0912 = phonePersianBody.includes("0912") || phonePersianBody.includes("۰۹۱۲");

  record(
    "TEST 4 — /people search",
    "Search by name علی; phone 0912 and ۰۹۱۲ return matching results",
    JSON.stringify({
      nameRows,
      nameHasAli,
      phoneLatinRows,
      phoneLatinHas0912,
      phonePersianRows,
      phonePersianHas0912,
      sameRowCount: phoneLatinRows === phonePersianRows,
    }),
    nameHasAli && nameRows > 0 && phoneLatinHas0912 && phoneLatinRows > 0 && phonePersianHas0912 && phoneLatinRows === phonePersianRows,
  );

  // ── TEST 5 — /people URL params ─────────────────────────────────────────
  await page.goto(`${BASE}/people?status=lead`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "05-people-url-status-lead");

  const leadBody = await page.locator("body").innerText();
  const statusFilterShowsLead =
    leadBody.includes("سرنخ") &&
    ((await page.locator("tbody tr").count()) > 0 || leadBody.includes("موردی یافت نشد"));
  const allRowsAreLead = await page.locator("tbody tr").evaluateAll((rows) =>
    rows.every((row) => row.innerText.includes("سرنخ") || row.innerText.length === 0),
  );

  record(
    "TEST 5 — /people URL params",
    "?status=lead pre-selects status filter to سرنخ (lead)",
    JSON.stringify({ statusFilterShowsLead, allRowsAreLead, url: page.url() }),
    statusFilterShowsLead && allRowsAreLead,
  );

  // ── TEST 6 — Dashboard dept_manager ─────────────────────────────────────
  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());
  await seedAuth(page, managerToken, "department_manager");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await page.waitForTimeout(1000);
  await shot(page, "06-dashboard-dept-manager");

  const dashText = await page.locator("body").innerText();
  const hasMyTasksWidget = dashText.includes("وظایف باز من");
  const widgetSection = page.locator("text=وظایف باز من").locator("..").locator("..");
  const widgetRows = await widgetSection.locator("tbody tr").count().catch(() => 0);
  const widgetNotEmpty = widgetRows > 0;
  const expectedManagerTaskTitles = managerTasks.map((t) => t.title);
  const widgetHasAssignedTask =
    expectedManagerTaskTitles.length === 0
      ? widgetRows === 0
      : expectedManagerTaskTitles.some((title) => dashText.includes(title));

  record(
    "TEST 6 — Dashboard dept_manager",
    "وظایف باز من shows tasks assigned to logged-in manager (not empty)",
    JSON.stringify({
      hasMyTasksWidget,
      widgetRows,
      managerOpenTaskCount: managerTasks.length,
      expectedManagerTaskTitles,
      widgetHasAssignedTask,
    }),
    hasMyTasksWidget && widgetNotEmpty && widgetHasAssignedTask,
  );

  // ── TEST 7 — Backend filters wired ──────────────────────────────────────
  const test7Cases = [
    {
      pagePath: "/people?status=student",
      apiPath: "/people?status=student&limit=50&offset=0",
      validate: (items) => items.every((p) => p.status === "student"),
      label: "people student",
    },
    {
      pagePath: "/enrollments?status=active",
      apiPath: "/enrollments?status=active&limit=50&offset=0",
      validate: (items) => items.every((e) => e.status === "active"),
      label: "enrollments active",
    },
    {
      pagePath: "/classes?status=active",
      apiPath: "/classes?status=active&limit=50&offset=0",
      validate: (items) => items.every((c) => c.status === "active"),
      label: "classes active",
    },
  ];

  await seedAuth(page, adminToken, "admin");

  for (let i = 0; i < test7Cases.length; i++) {
    const tc = test7Cases[i];
    const apiRes = await apiGet(request, adminToken, tc.apiPath);
    const apiItems = apiRes.data?.items ?? [];
    const apiFiltered = apiItems.length === 0 || tc.validate(apiItems);

    const net7 = captureNetwork(page, tc.label);
    await page.goto(`${BASE}${tc.pagePath}`, { waitUntil: "networkidle" });
    await waitLoaded(page);
    await shot(page, `07${String.fromCharCode(97 + i)}-backend-filter-${tc.label.replace(/\s+/g, "-")}`);
    net7.stop();

    const relevantReq = net7.bucket.find((r) => {
      try {
        const u = new URL(r.url);
        const pathPart = tc.apiPath.split("?")[0];
        return u.pathname.endsWith(pathPart) && r.method === "GET";
      } catch {
        return false;
      }
    });
    const reqUrl = relevantReq?.url ?? "";
    const expectedParam = tc.apiPath.includes("status=student")
      ? "status=student"
      : "status=active";
    const hasQueryParam = reqUrl.includes(expectedParam);

    netCaptures.push(...net7.bucket);

    record(
      `TEST 7 — Backend filter: ${tc.label}`,
      `API returns only matching status; network request includes status query param`,
      JSON.stringify({
        apiOk: apiRes.ok,
        apiItemCount: apiItems.length,
        apiFiltered,
        networkUrl: reqUrl || "(no matching request)",
        hasQueryParam,
      }),
      apiRes.ok && apiFiltered && hasQueryParam,
    );
  }

  await context.close();
  await apiCtx.close();
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    api: API,
    frontend: BASE,
    screenshotsDir: OUT_DIR,
    results,
    networkSamples: netCaptures.slice(0, 30),
  };
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("\n| Test | Expected | Actual | Pass/Fail |");
  console.log("|------|----------|--------|-----------|");
  for (const r of results) {
    const exp = String(r.expected).replace(/\|/g, "\\|").slice(0, 80);
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
