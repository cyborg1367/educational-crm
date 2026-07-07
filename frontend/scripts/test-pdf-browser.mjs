import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../qa-screenshots");
const pdfPath = path.join(outDir, "test-invoice-6.pdf");
const baseUrl = process.env.BASE_URL ?? "http://localhost";

const consoleErrors = [];
const failedRequests = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  }
});
page.on("pageerror", (err) => {
  consoleErrors.push(`PAGE ERROR: ${err.message}`);
});
page.on("response", (res) => {
  if (res.status() >= 400 && !res.url().includes("/reports/")) {
    failedRequests.push(`${res.status()} ${res.url()}`);
  }
});

await page.goto(`${baseUrl}/login`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.getByLabel("ایمیل").fill("admin@example.com");
await page.getByLabel("رمز عبور").fill("changeme123");
await page.getByRole("button", { name: "ورود" }).click();
await page.waitForURL("**/dashboard**", { timeout: 15000 });

await page.goto(`${baseUrl}/invoices/6`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "دانلود فاکتور PDF" }).waitFor({
  timeout: 15000,
});

const downloadPromise = page.waitForEvent("download", { timeout: 30000 }).catch(() => null);
await page.getByRole("button", { name: "دانلود فاکتور PDF" }).click();
await page.waitForTimeout(8000);

const toastText = await page.locator("body").innerText();
const download = await downloadPromise;

if (download) {
  await download.saveAs(pdfPath);
  const stat = fs.statSync(pdfPath);
  console.log(`SUCCESS: PDF saved to ${pdfPath} (${stat.size} bytes)`);
} else {
  const pdfErrorLine = toastText
    .split("\n")
    .find((line) => line.includes("خطا در تولید فاکتور PDF"));
  console.log("DOWNLOAD FAILED");
  console.log("Toast line:", pdfErrorLine ?? "(not found)");
  console.log("Failed requests:", failedRequests.slice(0, 20));
  console.log("Console errors:", consoleErrors.slice(0, 20));
  await page.screenshot({
    path: path.join(outDir, "pdf-test-failure.png"),
    fullPage: true,
  });
  process.exitCode = 1;
}

await browser.close();
