/**
 * F10 Enrollment & Finance — automated visual QA.
 * Run: node scripts/qa-f10.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://localhost:8001";
const OUT_DIR = path.resolve("qa-screenshots/f10");

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
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()}`);
  }
  const { access_token: token } = await res.json();
  return token;
}

async function apiGet(request, token, path) {
  const res = await request.get(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  return res.json();
}

async function apiPost(request, token, path, data) {
  const res = await request.post(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data,
  });
  return res;
}

async function seedAuth(page, token) {
  await page.addInitScript((t) => {
    window.localStorage.setItem("crm_access_token", t);
  }, token);
}

async function waitForLoaded(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

async function clickTab(page, label) {
  await page.getByRole("tab", { name: label }).click();
  await page.waitForTimeout(350);
}

async function getDialogBox(page) {
  const dialog = page.locator(".confirm-dialog-content").first();
  if ((await dialog.count()) === 0) return null;
  return dialog.boundingBox();
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

  try {
    await runTests(browser);
  } finally {
    await browser.close();
  }

  const report = { generatedAt: new Date().toISOString(), results };
  await writeFile(
    path.join(OUT_DIR, "report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log("\n| Test | Expected | Actual | Pass/Fail |");
  console.log("|------|----------|--------|-----------|");
  for (const r of results) {
    const exp = String(r.expected).replace(/\|/g, "\\|").slice(0, 60);
    const act = String(r.actual).replace(/\|/g, "\\|").slice(0, 60);
    console.log(`| ${r.test} | ${exp} | ${act} | ${r.pass} |`);
  }

  const failed = results.filter((r) => r.pass === "Fail").length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

async function expectEnabled(locator, page, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await locator.isEnabled()) return;
    await page.waitForTimeout(200);
  }
  throw new Error("Element stayed disabled");
}

async function runTests(browser) {
  const request = await browser.newContext().then((ctx) => ctx.request);
  const token = await loginViaApi(request);

  const enrollments = await apiGet(request, token, "/enrollments?limit=10");
  const enrollment = enrollments?.items?.[0];
  const enrollmentId = enrollment?.id ?? 1;

  const invoices = await apiGet(request, token, "/invoices?limit=10");
  const invoice = invoices?.items?.find((i) => i.enrollment_id === enrollmentId) ??
    invoices?.items?.[0];
  const invoiceId = invoice?.id ?? 3;

  const invoiceDetail = await apiGet(request, token, `/invoices/${invoiceId}`);
  const pendingInstallment = invoiceDetail?.installments?.find(
    (i) => i.status === "pending" || i.status === "partially_paid",
  );

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "fa-IR",
  });
  const page = await ctx.newPage();
  await seedAuth(page, token);

  // ── TEST 1 — Enrollments list ───────────────────────────────────────
  {
    await page.goto(`${BASE}/enrollments`, { waitUntil: "networkidle" });
    await waitForLoaded(page);
    await shot(page, "01-enrollments-list");

    const table = page.locator("table");
    const newBtn = page.getByRole("button", { name: "ثبت‌نام جدید" });
    const statusBadges = page.locator("table tbody tr").first().locator("span");
    const pagination = page.locator("p").filter({ hasText: /[۰-۹]+.*از.*[۰-۹]+/ });
    const paginationText = (await pagination.first().textContent()) ?? "";

    record(
      "TEST 1 — DataTable with enrollments",
      "Table visible with rows",
      `table=${await table.isVisible()}, rows=${await page.locator("table tbody tr").count()}`,
      (await table.isVisible()) && (await page.locator("table tbody tr").count()) > 0,
    );
    record(
      "TEST 1 — StatusBadge per row",
      "Status badge in first row",
      `badgeCount=${await statusBadges.count()}`,
      (await statusBadges.count()) > 0,
    );
    record(
      "TEST 1 — ثبت‌نام جدید header button",
      "Button visible",
      `visible=${await newBtn.isVisible()}`,
      await newBtn.isVisible(),
    );
    record(
      "TEST 1 — Persian pagination",
      "Pagination uses Persian digits (۰-۹)",
      paginationText,
      /[۰-۹]/.test(paginationText),
    );
  }

  // ── TEST 2 — Enrollment detail tabs ─────────────────────────────────
  {
    await page.goto(`${BASE}/enrollments/${enrollmentId}`, {
      waitUntil: "networkidle",
    });
    await waitForLoaded(page);
    await shot(page, "02-enrollment-header");

    const dropBtn = page.getByRole("button", { name: "لغو ثبت‌نام" });
    const canDrop =
      enrollment?.status === "pre_enroll" || enrollment?.status === "active";
    record(
      "TEST 2 — Header StatusAction لغو ثبت‌نام",
      canDrop ? "Drop button visible for pre_enroll/active" : "No drop for terminal status",
      `status=${enrollment?.status}, dropVisible=${await dropBtn.isVisible()}`,
      canDrop ? await dropBtn.isVisible() : !(await dropBtn.isVisible()),
    );

    await clickTab(page, "اطلاعات کلی");
    await shot(page, "02-tab-overview");

    const frozenInputs = page.locator('input[aria-readonly="true"]');
    const lockIcons = page.getByRole("button", { name: /دلیل قفل/ });
    const frozenCount = await frozenInputs.count();
    const lockCount = await lockIcons.count();

    record(
      "TEST 2 — Overview FrozenField money (×3)",
      "3 read-only money fields + lock info icons",
      `frozenInputs=${frozenCount}, lockIcons=${lockCount}`,
      frozenCount >= 3 && lockCount >= 3,
    );

    await clickTab(page, "فاکتور و اقساط");
    await shot(page, "02-tab-invoice-installments");
    record(
      "TEST 2 — FinancialTable installments",
      "Installment table visible",
      `rows=${await page.locator("table tbody tr").count()}`,
      (await page.locator("table tbody tr").count()) > 0,
    );

    await clickTab(page, "حضور و غیاب");
    await shot(page, "02-tab-attendance");
    const presentBadge = page.getByText("حاضر");
    const absentBadge = page.getByText("غایب");
    const hasAttendanceRows = (await page.locator("table tbody tr").count()) > 0;
    record(
      "TEST 2 — Attendance حاضر/غایب badges",
      hasAttendanceRows ? "حاضر or غایب badge visible" : "Empty state (no attendance rows)",
      `present=${await presentBadge.count()}, absent=${await absentBadge.count()}, rows=${await page.locator("table tbody tr").count()}`,
      hasAttendanceRows
        ? (await presentBadge.count()) > 0 || (await absentBadge.count()) > 0
        : true,
    );

    await clickTab(page, "تایم‌لاین");
    await waitForLoaded(page);
    await shot(page, "02-tab-timeline");
    const timeline = page.locator('[role="feed"][aria-label="تایم‌لاین"]');
    record(
      "TEST 2 — Timeline merged feed",
      "Timeline feed visible",
      `visible=${await timeline.isVisible()}`,
      await timeline.isVisible(),
    );
  }

  // ── TEST 3 — Drop flow (cancel only) ──────────────────────────────
  {
    await page.goto(`${BASE}/enrollments/${enrollmentId}`, {
      waitUntil: "networkidle",
    });
    await waitForLoaded(page);

    const dropBtn = page.getByRole("button", { name: "لغو ثبت‌نام" });
    if (await dropBtn.isVisible()) {
      await dropBtn.click();
      await page.waitForSelector(".confirm-dialog-content", { timeout: 15000 });
      await page.waitForTimeout(400);
      await shot(page, "03-drop-confirm-dialog");

      const dialog = page.locator(".confirm-dialog-content");
      const box = await getDialogBox(page);
      const consequences = page.locator(
        "text=/قسط لغو می‌شود|بازپرداخت می‌شود|وظیفه لغو می‌شود/",
      );
      let bg = "";
      if ((await dialog.count()) > 0) {
        bg = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
      }

      record(
        "TEST 3 — Tier-3 dialog width ~560px",
        "Dialog width ≈ 560px",
        box ? `width=${Math.round(box.width)}` : "no dialog",
        box ? Math.abs(box.width - 560) < 40 : false,
      );
      record(
        "TEST 3 — Danger-tinted tier-3 surface",
        "Tier-3 background applied",
        bg,
        Boolean(bg && bg !== "rgba(0, 0, 0, 0)"),
      );
      record(
        "TEST 3 — CascadeConsequenceList populated",
        "Installments + refund + tasks consequences",
        `matches=${await consequences.count()}`,
        (await consequences.count()) >= 3,
      );

      await page.getByRole("button", { name: "انصراف" }).click();
      await page.waitForTimeout(400);
      const stillDropVisible = await dropBtn.isVisible();
      record(
        "TEST 3 — Cancel closes dialog, enrollment unchanged",
        "Dialog closed, drop still available",
        `dropStillVisible=${stillDropVisible}`,
        stillDropVisible,
      );
    } else {
      record(
        "TEST 3 — Drop flow",
        "Drop button for pre_enroll/active",
        "Drop button not visible — skipped",
        false,
      );
    }
  }

  // ── TEST 4 — Record payment ─────────────────────────────────────────
  {
    await page.goto(`${BASE}/enrollments/${enrollmentId}`, {
      waitUntil: "networkidle",
    });
    await clickTab(page, "فاکتور و اقساط");

    const payBtn = page.getByRole("button", { name: "ثبت پرداخت" }).first();
    if ((await payBtn.count()) > 0 && pendingInstallment) {
      await payBtn.click();
      await page.waitForTimeout(500);
      await shot(page, "04-payment-drawer");

      const drawer = page.locator('[data-vaul-drawer]');
      const moneyInput = drawer.locator('input[inputmode="numeric"]');
      const remaining = pendingInstallment.amount - pendingInstallment.paid_amount;

      record(
        "TEST 4 — AppDrawer with MoneyInput",
        "Drawer + money input visible",
        `drawer=${await drawer.isVisible()}, input=${await moneyInput.isVisible()}`,
        (await drawer.isVisible()) && (await moneyInput.isVisible()),
      );

      const overAmount = remaining + 10000;
      await moneyInput.fill(String(overAmount));
      await moneyInput.blur();
      await page.waitForTimeout(300);
      await shot(page, "04-payment-over-limit");

      const inlineError = drawer.getByText(/مانده|بیشتر/);
      record(
        "TEST 4 — Inline error when amount > remaining",
        "Validation error shown",
        `errorVisible=${await inlineError.count() > 0}`,
        (await inlineError.count()) > 0,
      );

      await moneyInput.fill(String(Math.min(remaining, 50000)));
      await moneyInput.blur();
      const submitBtn = drawer.getByRole("button", { name: "ثبت پرداخت" });
      await submitBtn.click();
      await page.waitForTimeout(1200);
      await shot(page, "04-payment-success");

      const toast = page.getByText("پرداخت ثبت شد");
      record(
        "TEST 4 — Valid payment → Toast + refresh",
        "Success toast after submit",
        `toast=${await toast.count() > 0}`,
        (await toast.count()) > 0,
      );
    } else {
      record("TEST 4 — Record payment", "Pending installment + pay button", "Skipped — no pending installment", false);
    }
  }

  // ── TEST 5 — Refund flow ────────────────────────────────────────────
  {
    const paymentsRes = await apiGet(request, token, "/payments?limit=50");
    let payment = paymentsRes?.items?.find(
      (p) => invoiceDetail?.installments?.some((i) => i.id === p.installment_id),
    );

    if (!payment && pendingInstallment) {
      const inst = invoiceDetail.installments.find((i) => i.paid_amount > 0) ??
        invoiceDetail.installments[0];
      const payRes = await apiPost(request, token, "/payments", {
        installment_id: inst.id,
        amount: Math.min(50000, inst.amount - inst.paid_amount),
      });
      if (payRes.ok()) {
        payment = await payRes.json();
      }
    }

    await page.goto(`${BASE}/invoices/${invoiceId}`, { waitUntil: "networkidle" });
    await waitForLoaded(page);

    const refundBtn = page.getByRole("button", { name: "بازپرداخت" }).first();
    if ((await refundBtn.count()) > 0) {
      await refundBtn.click();
      await page.waitForTimeout(600);
      await shot(page, "05-refund-dialog");

      const consequences = page.getByText(/مبلغ بازگشتی|مانده قابل بازپرداخت/);
      const reasonField = page.locator("textarea");
      record(
        "TEST 5 — Refund tier-3 with Textarea + consequences",
        "Reason textarea + refundable balance list",
        `consequences=${await consequences.count()}, textarea=${await reasonField.count()}`,
        (await consequences.count()) >= 1 && (await reasonField.count()) > 0,
      );

      await page.getByRole("button", { name: "انصراف" }).click();
    } else {
      record(
        "TEST 5 — Refund flow",
        "Refund button on payment row",
        "No refundable payment row visible",
        false,
      );
    }
  }

  // ── TEST 6 — Wizard ─────────────────────────────────────────────────
  {
    await page.goto(`${BASE}/enrollments/new?person_id=1`, {
      waitUntil: "networkidle",
    });
    await waitForLoaded(page);
    await shot(page, "06-wizard-step1");

    const classSelect = page.locator('[data-zone="Primary"] [role="combobox"]').first();
    await classSelect.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    record(
      "TEST 6 — Step 1 searchable class Select",
      "Class combobox visible",
      `visible=${await classSelect.isVisible()}`,
      await classSelect.isVisible(),
    );

    await classSelect.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const listboxBtn = page
      .locator('[data-radix-popper-content-wrapper] [role="listbox"] button')
      .first();
    if ((await listboxBtn.count()) === 0) {
      await classSelect.click();
      await page.waitForTimeout(500);
    }
    const optionBtn = page
      .locator('[data-radix-popper-content-wrapper] [role="listbox"] button, [role="listbox"] button')
      .first();
    await optionBtn.waitFor({ state: "visible", timeout: 8000 });
    await optionBtn.click();
    await page.waitForTimeout(300);
    const nextStep1 = page.locator('[data-zone="Action-bar"] button', {
      hasText: "بعدی",
    });
    await nextStep1.waitFor({ state: "visible", timeout: 5000 });
    await expectEnabled(nextStep1, page);
    await nextStep1.click();
    await waitForLoaded(page);
    await shot(page, "06-wizard-step2");

    const frozenPrice = page.locator('input[aria-readonly="true"]');
    const discountInput = page.locator('input[inputmode="numeric"]').filter({
      hasNot: page.locator('[aria-readonly="true"]'),
    });
    const finalAmountText = page.getByText(/مبلغ نهایی/);
    record(
      "TEST 6 — Step 2 price/discount/final_amount",
      "Frozen price, discount input, live final amount",
      `frozen=${await frozenPrice.count()}, discount=${await discountInput.count()}, finalLabel=${await finalAmountText.isVisible()}`,
      (await frozenPrice.count()) > 0 &&
        (await discountInput.count()) > 0 &&
        (await finalAmountText.isVisible()),
    );

    await page.locator('[data-zone="Action-bar"] button', { hasText: "بعدی" }).click();
    await waitForLoaded(page);
    await shot(page, "06-wizard-step3-default");

    const installmentInputs = page.locator(
      '[data-zone="Primary"] input[inputmode="numeric"]',
    );
    if ((await installmentInputs.count()) >= 2) {
      await installmentInputs.nth(0).fill("100000");
      await installmentInputs.nth(0).blur();
      await page.waitForTimeout(300);
      await shot(page, "06-wizard-step3-sum-error");

      const sumError = page.getByText("جمع اقساط باید برابر مبلغ نهایی باشد");
      const submitDisabled = await page
        .locator('[data-zone="Action-bar"] button', { hasText: "ثبت" })
        .isDisabled();
      record(
        "TEST 6 — Sum validation error + disabled Submit",
        "Error message + disabled submit",
        `error=${await sumError.isVisible()}, disabled=${submitDisabled}`,
        (await sumError.isVisible()) && submitDisabled,
      );

      await page.locator('[data-zone="Action-bar"] button', { hasText: "بازگشت" }).click();
      await page.waitForTimeout(300);
      await page.locator('[data-zone="Action-bar"] button', { hasText: "بعدی" }).click();
      await waitForLoaded(page);

      const submitEnabled = !(await page
        .locator('[data-zone="Action-bar"] button', { hasText: "ثبت" })
        .isDisabled());
      await shot(page, "06-wizard-step3-sum-valid");
      record(
        "TEST 6 — Fixed amounts enable Submit",
        "Submit enabled when sum matches",
        `enabled=${submitEnabled}`,
        submitEnabled,
      );
    } else {
      record("TEST 6 — Step 3 installments", "2 installment rows", "Not enough inputs", false);
    }
  }

  // ── TEST 7 — Invoice detail ─────────────────────────────────────────
  {
    await page.goto(`${BASE}/invoices/${invoiceId}`, { waitUntil: "networkidle" });
    await waitForLoaded(page);
    await shot(page, "07-invoice-detail");

    const frozenTotal = page.locator('input[aria-readonly="true"]').first();
    const lockIcon = page.getByRole("button", { name: /دلیل قفل/ }).first();
    const tables = page.locator("table");
    const tableCount = await tables.count();

    record(
      "TEST 7 — FrozenField total_amount",
      "Read-only total + lock icon",
      `frozen=${await frozenTotal.isVisible()}, lock=${await lockIcon.isVisible()}`,
      (await frozenTotal.isVisible()) && (await lockIcon.isVisible()),
    );
    record(
      "TEST 7 — FinancialTable + payments + refunds tables",
      "3 tables present",
      `tableCount=${tableCount}`,
      tableCount >= 3,
    );

    record(
      "TEST 7 — Route note",
      `/invoices/${invoiceId} used (seed DB has no invoice id=1)`,
      `invoiceId=${invoiceId}`,
      invoiceId > 0,
    );
  }

  // ── TEST 8 — Error state ────────────────────────────────────────────
  {
    await page.goto(`${BASE}/enrollments/99999`, { waitUntil: "networkidle" });
    await waitForLoaded(page);
    await shot(page, "08-not-found");

    const errorState = page.locator('[role="alert"]').filter({
      hasText: /یافت نشد|NOT_FOUND|نامعتبر/,
    });
    const errorText = (await errorState.first().textContent()) ?? "";
    record(
      "TEST 8 — NOT_FOUND ErrorState",
      "Error alert for missing enrollment",
      errorText.slice(0, 80),
      (await errorState.first().isVisible()) && errorText.length > 0,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
