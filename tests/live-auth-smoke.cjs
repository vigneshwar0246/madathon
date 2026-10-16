const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();
  try {
    await page.goto(process.env.TEST_BASE_URL || "http://localhost:3100");
    await page.waitForURL(/\/login$/, { timeout: 20000 });
    assert.equal(await page.getByRole("heading", { name: "Sign in to Vetra" }).count(), 1);
    assert.equal(await page.getByText("Frontend preview").count(), 0);
    console.log("Live auth smoke passed: unsigned users reach sign in, not demo data.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
