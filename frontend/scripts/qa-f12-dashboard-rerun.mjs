/**
 * Re-run F12 dashboard QA for roles that previously failed.
 * Run: node scripts/qa-f12-dashboard-rerun.mjs
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
const results = [];
let frontendProc = null;

function record(test, expected, actual, pass) {
  results.push({ test, expected, actual, pass: pass ? "Pass" : "Fail" });
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

async function seedAuth(page, token) {
  await page.addInitScript((t) => {
    window.localStorage.setItem("crm_access_token", t);
    document.cookie = `crm_access_token=${encodeURIComponent(t)}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }, token);
}

const dashboardChecks = {
  admin: async (p) => {
    const text = await p.locator("body").innerText();
    const noCrash = !text.includes("Runtime Error");
    const statCards = await p.locator("text=/کل دانش|ثبت‌نام فعال|درآمد ماه|نرخ وصول/").count();
    const hasLine = (await p.locator(".recharts-line").count()) > 0;
    const hasBar = (await p.locator(".recharts-bar-rectangle").count()) > 0;
    const persianNums = PERSIAN_DIGIT.test(text);
    return {
      pass: noCrash && statCards >= 4 && hasLine && hasBar && persianNums,
      actual: { noCrash, statCards, hasLine, hasBar, persianNums },
    };
  },
  admission: async (p) => {
    const text = await p.locator("body").innerText();
    const noCrash = !text.includes("Runtime Error");
    const hasStat = text.includes("سرنخ");
    const hasLine = (await p.locator(".recharts-line").count()) > 0;
    const hasPending = text.includes("مشاوره");
    const hasStale = text.includes("راکد");
    const viewAll = (await p.getByText("مشاهده همه").count()) >= 2;
    return {
      pass: noCrash && hasStat && hasLine && hasPending && hasStale && viewAll,
      actual: { noCrash, hasStat, hasLine, hasPending, hasStale, viewAll },
    };
  },
  department_manager: async (p) => {
    const text = await p.locator("body").innerText();
    const noCrash = !text.includes("Runtime Error");
    const hasTasks = text.includes("وظایف");
    const viewAll = (await p.getByText("مشاهده همه").count()) > 0;
    const hasBar = (await p.locator(".recharts-bar-rectangle").count()) > 0;
    return {
      pass: noCrash && hasTasks && viewAll && hasBar,
      actual: { noCrash, hasTasks, viewAll, hasBar },
    };
  },
};

const roleTests = [
  {
    id: 3,
    role: "admin",
    shot: "06-dashboard-admin-rerun",
    label: "Admin",
    expectation: "4 StatCards + revenue line + enrollment bar + Persian formatting",
  },
  {
    id: 5,
    role: "admission",
    shot: "08-dashboard-admission-rerun",
    label: "Admission",
    expectation: "new leads StatCard + trend + pending consultations + stale leads",
  },
  {
    id: 7,
    role: "department_manager",
    shot: "10-dashboard-dept-mgr-rerun",
    label: "Department Manager",
    expectation: "open tasks widget + enrollment trend chart",
  },
];

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
  const loginRes = await request.post(`${API}/auth/login`, {
    data: { email: "admin@example.com", password: "changeme123" },
  });
  if (!loginRes.ok()) throw new Error(`Login failed: ${loginRes.status()}`);
  const { access_token: token } = await loginRes.json();

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: "fa-IR",
  });
  const page = await context.newPage();

  for (const rt of roleTests) {
    await restartFrontend(rt.role);
    await seedAuth(page, token);
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, `${rt.shot}.png`), fullPage: true });
    const check = await dashboardChecks[rt.role](page);
    record(`TEST ${rt.id} — /dashboard (${rt.label})`, rt.expectation, JSON.stringify(check.actual), check.pass);
  }

  await context.close();
  await browser.close();

  const report = { generatedAt: new Date().toISOString(), api: API, frontend: BASE, results };
  await writeFile(path.join(OUT_DIR, "report-rerun.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("\n| Test | Expected | Actual | Pass/Fail |");
  console.log("|------|----------|--------|-----------|");
  for (const r of results) {
    const exp = String(r.expected).replace(/\|/g, "\\|").slice(0, 70);
    const act = String(r.actual).replace(/\|/g, "\\|").slice(0, 90);
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
