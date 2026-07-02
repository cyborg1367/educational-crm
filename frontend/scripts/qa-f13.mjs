/**
 * F13 Supporting Entity Screens — automated visual QA.
 * Run: node scripts/qa-f13.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn, execSync } from "node:child_process";
import path from "node:path";

const BASE = "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://localhost:8000";
const OUT_DIR = path.resolve("qa-screenshots/f13");
const ENV_PATH = path.resolve(".env.local");
const FRONTEND_DIR = path.resolve(".");

const PERSIAN_DIGIT = /[۰-۹]/;
const TOMAN_SUFFIX = /تومان/;

const results = [];

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

async function apiPost(request, token, route, data) {
  const res = await request.post(`${API}${route}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`POST ${route} failed: ${res.status()} ${body}`);
  }
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
  await page.waitForTimeout(700);
}

async function pickSelectByLabel(page, labelText, optionText) {
  const facet = page.locator("label").filter({ hasText: labelText }).locator("..");
  const combo = facet.locator('[role="combobox"]').first();
  await combo.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  await page
    .getByRole("listbox")
    .getByRole("button", { name: optionText, exact: true })
    .click();
  await page.waitForTimeout(300);
}

async function ensureRoadmap(request, token) {
  const roadmaps = await apiGet(request, token, "/roadmaps?limit=10");
  if (roadmaps?.items?.length) {
    return roadmaps.items[0];
  }
  const departments = await apiGet(request, token, "/departments?limit=10");
  const deptId = departments?.items?.[0]?.id ?? 1;
  const roadmap = await apiPost(request, token, "/roadmaps", {
    department_id: deptId,
    name: "QA Roadmap F13",
  });
  await apiPost(request, token, `/roadmaps/${roadmap.id}/items`, {
    title: "گام اول",
    sequence: 0,
    course_id: 1,
  });
  return roadmap;
}

function killPort(port) {
  try {
    execSync(`fuser -k -9 ${port}/tcp 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

async function writeEnv(role) {
  await writeFile(
    ENV_PATH,
    `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_DEV_USER_ROLE=${role}
`,
    "utf8",
  );
}

let frontendProc = null;

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
  await restartFrontend("admin");

  const chromiumPath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
    "/home/cyborgmass/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumPath,
  });

  const requestCtx = await browser.newContext();
  const request = requestCtx.request;
  const token = await loginViaApi(request);
  const roadmap = await ensureRoadmap(request, token);

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: "fa-IR",
  });
  const page = await context.newPage();
  await seedAuth(page, token);

  // TEST 1 — /courses
  await page.goto(`${BASE}/courses`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "01-courses-initial");

  const priceHeader = page.locator("th").filter({ hasText: "قیمت" });
  const priceHeaderAlign = await priceHeader
    .evaluate((el) => getComputedStyle(el).textAlign)
    .catch(() => "");
  const priceCells = page.locator("tbody td.text-end");
  const priceCellCount = await priceCells.count();
  const firstPriceText =
    priceCellCount > 0 ? await priceCells.first().innerText() : "";
  const priceRightAligned =
    priceHeaderAlign === "right" || priceHeaderAlign === "end";
  const priceFormatted = PERSIAN_DIGIT.test(firstPriceText);

  await pickSelectByLabel(page, "دپارتمان", "زبان انگلیسی");
  await page.waitForTimeout(500);
  await shot(page, "02-courses-filtered");
  const filteredBody = await page.locator("tbody").innerText().catch(() => "");
  const filterWorks = filteredBody.includes("IELTS") || filteredBody.includes("زبان");

  await page.getByRole("button", { name: "افزودن دوره" }).click();
  await page.waitForTimeout(500);
  await shot(page, "03-courses-drawer");

  const drawer = page.locator("[data-vaul-drawer]");
  const drawerVisible = await drawer.isVisible();
  const drawerFields = {
    title: (await page.getByText("عنوان", { exact: false }).count()) > 0,
    department: (await page.getByText("دپارتمان", { exact: false }).count()) > 0,
    price: (await page.getByText("قیمت", { exact: false }).count()) > 0,
    duration: (await page.getByText("تعداد جلسات").count()) > 0,
    description: (await page.getByText("توضیحات").count()) > 0,
    active: (await page.getByText("فعال", { exact: true }).count()) > 0,
  };
  const allDrawerFields = Object.values(drawerFields).every(Boolean);

  const uniqueTitle = `QA Course F13 ${Date.now()}`;
  await page.getByLabel("عنوان").fill(uniqueTitle);
  await page.getByLabel("قیمت").click();
  await page.getByLabel("قیمت").fill("1500000");
  await page.getByLabel("تعداد جلسات").fill("10");

  const postPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/courses") &&
      res.request().method() === "POST" &&
      res.status() < 400,
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: "ثبت" }).click();
  let createOk = false;
  try {
    const postRes = await postPromise;
    createOk = postRes.ok();
    await page.waitForTimeout(800);
  } catch {
    createOk = false;
  }
  await page.reload({ waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "04-courses-after-create");
  const listAfterCreate = await page.locator("body").innerText();
  const courseAppears = listAfterCreate.includes(uniqueTitle);

  record(
    "TEST 1 — /courses price column",
    "Price column right-aligned with formatToman (Persian digits)",
    JSON.stringify({
      priceRightAligned,
      priceFormatted,
      sample: firstPriceText,
    }),
    priceRightAligned && priceFormatted,
  );
  record(
    "TEST 1 — /courses department filter",
    "Department facet filters list",
    JSON.stringify({ filterWorks, filteredSnippet: filteredBody.slice(0, 80) }),
    filterWorks,
  );
  record(
    "TEST 1 — /courses create drawer",
    "افزودن دوره drawer with all fields",
    JSON.stringify({ drawerVisible, drawerFields, allDrawerFields }),
    drawerVisible && allDrawerFields,
  );
  record(
    "TEST 1 — /courses create course",
    "POST /courses and new row in list",
    JSON.stringify({ createOk, courseAppears, title: uniqueTitle }),
    createOk && courseAppears,
  );

  // TEST 2 — /roadmaps
  await page.goto(`${BASE}/roadmaps`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "05-roadmaps-list");

  const roadmapRows = page.locator("tbody tr");
  const roadmapRowCount = await roadmapRows.count();
  const listHasRoadmap = roadmapRowCount > 0;

  if (listHasRoadmap) {
    await roadmapRows.first().click();
    await page.waitForURL(/\/roadmaps\/\d+/, { timeout: 10000 });
    await waitLoaded(page);
    await shot(page, "06-roadmap-detail");

    const itemsTable = page.locator("table tbody tr");
    const itemCount = await itemsTable.count();
    const hasItemsTable = itemCount > 0;

    await page.getByRole("button", { name: "افزودن آیتم" }).click();
    await page.waitForTimeout(500);
    await shot(page, "07-roadmap-add-item-drawer");
    const itemDrawerOpen = await page.locator("[data-vaul-drawer]").isVisible();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    const seqInput = page.locator('tbody input[type="number"]').first();
    const seqVisible = await seqInput.isVisible();
    let patchOk = false;
    if (seqVisible) {
      const roadmapId = page.url().match(/\/roadmaps\/(\d+)/)?.[1];
      const itemsData = await apiGet(
        request,
        token,
        `/roadmaps/${roadmapId}/items?limit=10`,
      );
      const itemId = itemsData?.items?.[0]?.id;
      const currentSeq = itemsData?.items?.[0]?.sequence ?? 0;
      const nextSeq = currentSeq + 1;
      const patchPromise = page.waitForResponse(
        (res) =>
          res.url().includes(`/roadmaps/${roadmapId}/items/`) &&
          res.request().method() === "PATCH" &&
          res.status() < 400,
        { timeout: 15000 },
      );
      await seqInput.click();
      await seqInput.fill(String(nextSeq));
      await page.waitForTimeout(250);
      await seqInput.evaluate((el) => {
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.blur();
      });
      try {
        const patchRes = await patchPromise;
        patchOk = patchRes.ok();
        await page.waitForTimeout(600);
        await shot(page, "08-roadmap-sequence-edited");
      } catch {
        patchOk = false;
      }
      record(
        "TEST 2 — roadmap sequence PATCH",
        "Inline sequence edit blur fires PATCH",
        JSON.stringify({ seqVisible, patchOk, itemId }),
        patchOk,
      );
    } else {
      record(
        "TEST 2 — roadmap sequence PATCH",
        "Inline sequence edit blur fires PATCH",
        "No sequence input found",
        false,
      );
    }

    record(
      "TEST 2 — /roadmaps list",
      "Screenshot list with name + item count",
      JSON.stringify({ roadmapRowCount, listHasRoadmap }),
      listHasRoadmap,
    );
    record(
      "TEST 2 — /roadmaps/[id] detail",
      "RoadmapItems table visible on detail page",
      JSON.stringify({ hasItemsTable, itemCount }),
      hasItemsTable,
    );
    record(
      "TEST 2 — roadmap add item drawer",
      "افزودن آیتم opens drawer",
      JSON.stringify({ itemDrawerOpen }),
      itemDrawerOpen,
    );
  } else {
    record("TEST 2 — /roadmaps list", "...", "No roadmap rows", false);
    record("TEST 2 — /roadmaps/[id] detail", "...", "Skipped", false);
    record("TEST 2 — roadmap add item drawer", "...", "Skipped", false);
    record("TEST 2 — roadmap sequence PATCH", "...", "Skipped", false);
  }

  // TEST 3 — /departments
  await page.goto(`${BASE}/departments`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "09-departments-list");

  const deptBody = await page.locator("tbody").innerText();
  const managerResolved =
    deptBody.includes("Admin") && !/\bmanager_id\b/i.test(deptBody);
  const hasActiveBadge =
    deptBody.includes("فعال") || deptBody.includes("غیرفعال");

  await page.getByRole("button", { name: "افزودن دپارتمان" }).click();
  await page.waitForTimeout(500);
  await shot(page, "10-departments-drawer");
  const deptDrawer = await page.locator("[data-vaul-drawer]").isVisible();
  const drawerCombo = page.locator("[data-vaul-drawer]").locator('[role="combobox"]').first();
  await drawerCombo.focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
  await page.waitForTimeout(200);
  const managerOptions = await page.getByRole("listbox").getByRole("button").count();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  record(
    "TEST 3 — /departments manager name",
    "Manager name resolved (not raw ID)",
    JSON.stringify({ managerResolved, snippet: deptBody.slice(0, 120) }),
    managerResolved,
  );
  record(
    "TEST 3 — /departments active badge",
    "is_active badge visible",
    JSON.stringify({ hasActiveBadge }),
    hasActiveBadge,
  );
  record(
    "TEST 3 — /departments create drawer",
    "افزودن دپارتمان drawer + manager Select populated",
    JSON.stringify({ deptDrawer, managerOptions }),
    deptDrawer && managerOptions > 0,
  );

  // TEST 4 — /users admin
  await page.addInitScript(() => {
    window.localStorage.setItem("NEXT_PUBLIC_DEV_USER_ROLE", "admin");
  });
  await page.goto(`${BASE}/users`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "11-users-admin");

  const usersBody = await page.locator("body").innerText();
  const hasPersianRole =
    usersBody.includes("مدیر") ||
    usersBody.includes("مدرس") ||
    usersBody.includes("پذیرش");
  const statusBadgeDomainWarn = false;
  const roleBadges = page.locator("tbody span").filter({
    hasText: /مدیر|مدرس|پذیرش|مالی/,
  });
  const roleBadgeCount = await roleBadges.count();

  await pickSelectByLabel(page, "نقش", "مدیر");
  await page.waitForTimeout(500);
  await shot(page, "12-users-role-filter");
  const filteredUsers = await page.locator("tbody").innerText();
  const roleFilterWorks =
    filteredUsers.includes("مدیر") || filteredUsers.includes("admin@example.com");

  record(
    "TEST 4 — /users role Badge",
    "Role as Badge with Persian label (not StatusBadge enum style)",
    JSON.stringify({
      hasPersianRole,
      roleBadgeCount,
      sample: filteredUsers.slice(0, 100),
    }),
    hasPersianRole && roleBadgeCount > 0,
  );
  record(
    "TEST 4 — /users role filter",
    "Role facet filters list",
    JSON.stringify({ roleFilterWorks }),
    roleFilterWorks,
  );

  // TEST 4 — non-admin PermissionBanner
  await restartFrontend("teacher");

  const teacherPage = await browser.newPage();
  await seedAuth(teacherPage, token);
  await teacherPage.goto(`${BASE}/users`, { waitUntil: "networkidle" });
  await waitLoaded(teacherPage);
  await shot(teacherPage, "13-users-teacher-denied");

  const permBanner = await teacherPage
    .getByText("فقط مدیر سیستم به این صفحه دسترسی دارد")
    .isVisible()
    .catch(() => false);
  await teacherPage.close();

  await restartFrontend("admin");
  await seedAuth(page, token);

  record(
    "TEST 4 — /users non-admin PermissionBanner",
    "PermissionBanner when role !== admin",
    JSON.stringify({ permBanner }),
    permBanner,
  );

  // TEST 5 — settings
  const me = await apiGet(request, token, "/auth/me");
  const org = await apiGet(request, token, "/organizations/me");

  await page.goto(`${BASE}/settings/org`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "14-settings-org");

  const orgInput = await page
    .locator('input[disabled][readonly]')
    .first()
    .inputValue()
    .catch(() => "");
  const orgRealName =
    orgInput.includes(org?.name ?? "") &&
    !orgInput.includes("سازمان ۱") &&
    !orgInput.includes("سازمان 1");

  await page.goto(`${BASE}/settings/profile`, { waitUntil: "networkidle" });
  await waitLoaded(page);
  await shot(page, "15-settings-profile");

  const profileInputs = page.locator('input[disabled][readonly]');
  const profileName = await profileInputs.nth(0).inputValue().catch(() => "");
  const profileEmail = await profileInputs.nth(1).inputValue().catch(() => "");
  const profileFromApi =
    profileName.includes(me?.name ?? "") &&
    profileEmail.includes(me?.email ?? "");

  record(
    "TEST 5 — /settings/org",
    `Real org name from GET /organizations/me (${org?.name})`,
    JSON.stringify({ orgInput, expected: org?.name, orgRealName }),
    orgRealName,
  );
  record(
    "TEST 5 — /settings/profile",
    `Real name/email from GET /auth/me`,
    JSON.stringify({
      profileName,
      profileEmail,
      expectedName: me?.name,
      expectedEmail: me?.email,
      profileFromApi,
    }),
    profileFromApi,
  );

  await context.close();
  await requestCtx.close();
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    api: API,
    frontend: BASE,
    roadmapId: roadmap.id,
    results,
  };
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("\n| Test | Expected | Actual | Pass/Fail |");
  console.log("|------|----------|--------|-----------|");
  for (const r of results) {
    const exp = String(r.expected).replace(/\|/g, "\\|").slice(0, 80);
    const act = String(r.actual).replace(/\|/g, "\\|").slice(0, 80);
    console.log(`| ${r.test} | ${exp} | ${act} | ${r.pass} |`);
  }

  const failed = results.filter((r) => r.pass === "Fail").length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  console.log(`Screenshots: ${OUT_DIR}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
