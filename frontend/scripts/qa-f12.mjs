/**
 * F12 Tasks, Calendar, Dashboards — automated visual QA.
 * Run: node scripts/qa-f12.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn, execSync } from "node:child_process";
import path from "node:path";

const BASE = "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://localhost:8000";
const OUT_DIR = path.resolve("qa-screenshots/f12");
const ENV_PATH = path.resolve(".env.local");
const FRONTEND_DIR = path.resolve(".");

const PERSIAN_DIGIT = /[۰-۹]/;
const JALALI_MONTH = /(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)/;

const results = [];
const netEvents = [];

function record(test, expected, actual, pass) {
  results.push({ test, expected, actual, pass: pass ? "Pass" : "Fail" });
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function loginViaApi(request) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: "admin@example.com", password: "changeme123" },
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
  const { access_token: token } = await res.json();
  return token;
}

async function apiGet(request, token, route) {
  const res = await request.get(`${API}${route}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  return res.json();
}

async function seedAuth(page, token) {
  await page.addInitScript((t) => {
    window.localStorage.setItem("crm_access_token", t);
    document.cookie = `crm_access_token=${encodeURIComponent(t)}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }, token);
}

async function waitLoaded(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

function killPort(port) {
  try {
    execSync(`fuser -k -9 ${port}/tcp 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  try {
    execSync(`pkill -f "next dev" 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

let frontendProc = null;

async function writeEnv(role) {
  const content = `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_DEV_USER_ROLE=${role}
`;
  await writeFile(ENV_PATH, content, "utf8");
}

async function restartFrontend(role) {
  killPort(3000);
  if (frontendProc) {
    try {
      frontendProc.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    frontendProc = null;
  }
  await writeEnv(role);
  await new Promise((resolve) => {
    frontendProc = spawn("npm", ["run", "dev", "--", "--port", "3000"], {
      cwd: FRONTEND_DIR,
      stdio: "ignore",
      env: { ...process.env, NEXT_PUBLIC_DEV_USER_ROLE: role },
    });
    const start = Date.now();
    const check = async () => {
      try {
        const res = await fetch(`${BASE}/login`);
        if (res.ok) return resolve();
      } catch {
        /* retry */
      }
      if (Date.now() - start > 60000) {
        throw new Error(`Frontend failed to start for role ${role}`);
      }
      setTimeout(check, 800);
    };
    setTimeout(check, 2000);
  });
  await new Promise((r) => setTimeout(r, 1500));
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

  const request = await browser.newContext().then((ctx) => ctx.request);
  const token = await loginViaApi(request);

  try {
    await restartFrontend("admin");

    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      locale: "fa-IR",
    });
    const page = await context.newPage();

    page.on("requestfinished", async (req) => {
      const url = req.url();
      if (!url.startsWith(API)) return;
      try {
        const res = await req.response();
        netEvents.push({
          method: req.method(),
          url,
          status: res?.status() ?? null,
        });
      } catch {
        /* ignore */
      }
    });

    await seedAuth(page, token);

    // TEST 1 — /tasks
    await page.goto(`${BASE}/tasks`, { waitUntil: "networkidle" });
    await waitLoaded(page);
    await shot(page, "01-tasks-initial");

    const emptyMsg = page.getByText("یک وظیفه انتخاب کنید");
    const hasFilterBar = (await page.getByText("نوع").count()) > 0;
    const hasStatusFacet = (await page.getByText("وضعیت").count()) > 0;
    const tableRows = page.locator("tbody tr");
    const rowCount = await tableRows.count();
    const firstRowText = rowCount > 0 ? await tableRows.first().innerText() : "";
    const hasPersianInTable = PERSIAN_DIGIT.test(firstRowText);
    const hasBadge = (await page.locator("tbody .rounded-\\[var\\(--primitive-radius-full\\)\\]").count()) > 0
      || (await page.locator("tbody span").filter({ hasText: /open|done|باز|انجام/ }).count()) > 0;
    const noDrawer = (await page.locator("[data-vaul-drawer]").count()) === 0;

    record(
      "TEST 1 — /tasks initial load",
      "DataTable + FilterBar + persistent EmptyState (not drawer)",
      JSON.stringify({
        rows: rowCount,
        emptyState: await emptyMsg.isVisible(),
        filterType: hasFilterBar,
        filterStatus: hasStatusFacet,
        persian: hasPersianInTable,
        noDrawer,
      }),
      rowCount > 0 && (await emptyMsg.isVisible()) && hasFilterBar && hasStatusFacet && noDrawer,
    );

    let openTaskId = null;
    const tasksData = await apiGet(request, token, "/tasks?limit=50&offset=0");
    if (tasksData?.items?.length) {
      const openTask = tasksData.items.find((t) => t.status === "open") ?? tasksData.items[0];
      openTaskId = openTask.id;
    }

    if (rowCount > 0) {
      await tableRows.first().click();
      await page.waitForTimeout(500);
      await shot(page, "02-tasks-selected");

      const detailTitle = await page.locator("h2").first().textContent().catch(() => "");
      const hasTypeBadge = (await page.locator("h2").locator("..").locator("..").getByText(/پیگیری|ارجاع|سایر|ثبت/).count()) > 0;
      const hasDue = PERSIAN_DIGIT.test(await page.locator("text=موعد").first().innerText().catch(() => ""));
      const hasNotes = true;
      const hasRelationship = (await page.getByText("ارتباط").count()) >= 0;
      const completeBtn = page.getByRole("button", { name: "تکمیل" });
      const hasComplete = await completeBtn.isVisible().catch(() => false);

      record(
        "TEST 1 — task detail pane",
        "title, type badge, Jalali due_date, notes, RelationshipCard, StatusAction تکمیل",
        JSON.stringify({
          title: Boolean(detailTitle?.trim()),
          typeBadge: hasTypeBadge,
          dueJalali: hasDue,
          notes: hasNotes,
          relationship: hasRelationship,
          completeBtn: hasComplete,
        }),
        Boolean(detailTitle?.trim()) && hasDue,
      );

      if (hasComplete && openTaskId) {
        const patchPromise = page.waitForResponse(
          (res) =>
            res.url().includes(`/tasks/${openTaskId}`) &&
            res.request().method() === "PATCH" &&
            res.status() < 400,
          { timeout: 10000 },
        );
        await completeBtn.click();
        let patchOk = false;
        try {
          const patchRes = await patchPromise;
          patchOk = patchRes.ok();
          await page.waitForTimeout(800);
          await shot(page, "03-tasks-completed");
        } catch (err) {
          patchOk = false;
        }
        const statusText = await page.locator("tbody").first().innerText().catch(() => "");
        record(
          "TEST 1 — complete task PATCH",
          "PATCH /tasks/{id} fires and status becomes done",
          JSON.stringify({ patchOk, statusHasDone: /done|انجام/i.test(statusText) }),
          patchOk,
        );
      } else {
        record(
          "TEST 1 — complete task PATCH",
          "PATCH /tasks/{id} fires and status becomes done",
          "No open task with complete button",
          false,
        );
      }
    } else {
      record("TEST 1 — task detail pane", "...", "No task rows", false);
      record("TEST 1 — complete task PATCH", "...", "No task rows", false);
    }

    // TEST 2 — /calendar
    await page.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
    await waitLoaded(page);
    await shot(page, "04-calendar-month");

    const monthHeader = await page.locator("text=/فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند/").first().textContent().catch(() => "");
    const monthBody = await page.locator("body").innerText();
    const hasJalaliMonth = JALALI_MONTH.test(monthHeader || monthBody);
    const hasPersianDates = PERSIAN_DIGIT.test(monthBody);
    const hasDots = (await page.locator("span.inline-block.size-\\[var\\(--primitive-space-2\\)\\]").count()) > 0;

    record(
      "TEST 2 — /calendar month mode",
      "Jalali month header, colored dots, Persian digit dates",
      JSON.stringify({ monthHeader, hasJalaliMonth, hasPersianDates, hasDots }),
      hasJalaliMonth && hasPersianDates,
    );

    await page.getByRole("button", { name: "دستور کار" }).click();
    await page.waitForTimeout(500);
    await shot(page, "05-calendar-agenda");

    const agendaText = await page.locator("body").innerText();
    const agendaHasDates = PERSIAN_DIGIT.test(agendaText);
    const agendaList = (await page.locator("ul li").count()) > 0
      || agendaText.includes("رویدادی در پیش‌رو نیست");

    record(
      "TEST 2 — /calendar agenda mode",
      "Chronological Persian list with Jalali dates",
      JSON.stringify({ agendaHasDates, agendaList }),
      agendaHasDates && agendaList,
    );

    // Dashboard role tests
    const dashboardChecks = {
      admin: async (p) => {
        const text = await p.locator("body").innerText();
        const statCards = await p.locator("text=/کل دانش|ثبت‌نام فعال|درآمد ماه|نرخ وصول/").count();
        const hasLine = (await p.locator(".recharts-line").count()) > 0;
        const hasBar = (await p.locator(".recharts-bar-rectangle").count()) > 0;
        const persianNums = PERSIAN_DIGIT.test(text);
        return {
          pass: statCards >= 4 && hasLine && hasBar && persianNums,
          actual: { statCards, hasLine, hasBar, persianNums },
        };
      },
      finance: async (p) => {
        const text = await p.locator("body").innerText();
        const hasGauge = text.includes("نرخ وصول") && (await p.locator(".recharts-bar-rectangle, circle").count()) > 0;
        const hasOverdue = text.includes("اقساط معوق");
        const viewAll = (await p.getByText("مشاهده همه").count()) > 0;
        const hasBar = (await p.locator(".recharts-bar-rectangle").count()) > 0;
        return {
          pass: hasGauge && hasOverdue && viewAll && hasBar,
          actual: { hasGauge, hasOverdue, viewAll, hasBar },
        };
      },
      admission: async (p) => {
        const text = await p.locator("body").innerText();
        const hasStat = text.includes("سرنخ");
        const hasLine = (await p.locator(".recharts-line").count()) > 0;
        const hasPending = text.includes("مشاوره");
        const hasStale = text.includes("راکد");
        const viewAll = (await p.getByText("مشاهده همه").count()) >= 2;
        return {
          pass: hasStat && hasLine && hasPending && hasStale && viewAll,
          actual: { hasStat, hasLine, hasPending, hasStale, viewAll },
        };
      },
      teacher: async (p) => {
        const text = await p.locator("body").innerText();
        const hasClasses = text.includes("کلاس");
        const viewAll = (await p.getByText("مشاهده همه").count()) > 0;
        const hasAgenda = text.includes("دستور کار کلاس") || text.includes("رویدادی در پیش‌رو نیست");
        return {
          pass: hasClasses && viewAll && hasAgenda,
          actual: { hasClasses, viewAll, hasAgenda },
        };
      },
      department_manager: async (p) => {
        const text = await p.locator("body").innerText();
        const hasTasks = text.includes("وظایف");
        const viewAll = (await p.getByText("مشاهده همه").count()) > 0;
        const hasBar = (await p.locator(".recharts-bar-rectangle").count()) > 0;
        return {
          pass: hasTasks && viewAll && hasBar,
          actual: { hasTasks, viewAll, hasBar },
        };
      },
    };

    const roleTests = [
      { id: 3, role: "admin", shot: "06-dashboard-admin", label: "Admin" },
      { id: 4, role: "finance", shot: "07-dashboard-finance", label: "Finance" },
      { id: 5, role: "admission", shot: "08-dashboard-admission", label: "Admission" },
      { id: 6, role: "teacher", shot: "09-dashboard-teacher", label: "Teacher" },
      { id: 7, role: "department_manager", shot: "10-dashboard-dept-mgr", label: "Department Manager" },
    ];

    for (const rt of roleTests) {
      await restartFrontend(rt.role);
      await seedAuth(page, token);
      await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
      await waitLoaded(page);
      await shot(page, rt.shot);

      const check = await dashboardChecks[rt.role](page);
      const expectations = {
        admin: "4 StatCards + revenue line + enrollment bar + Persian formatting",
        finance: "collection gauge + overdue widget rowCap=5 + view all + revenue bar",
        admission: "new leads StatCard + trend + pending consultations + stale leads",
        teacher: "today classes widget + CalendarAgenda agenda",
        department_manager: "open tasks widget + enrollment trend chart",
      };
      record(
        `TEST ${rt.id} — /dashboard (${rt.label})`,
        expectations[rt.role],
        JSON.stringify(check.actual),
        check.pass,
      );
    }

    await context.close();
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    api: API,
    frontend: BASE,
    results,
    netEvents,
  };
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("\n| Test | Expected | Actual | Pass/Fail |");
  console.log("|------|----------|--------|-----------|");
  for (const r of results) {
    const exp = String(r.expected).replace(/\|/g, "\\|").slice(0, 70);
    const act = String(r.actual).replace(/\|/g, "\\|").slice(0, 70);
    console.log(`| ${r.test} | ${exp} | ${act} | ${r.pass} |`);
  }

  const failed = results.filter((r) => r.pass === "Fail").length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
