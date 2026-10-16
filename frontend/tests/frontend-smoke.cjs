const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const base = process.env.TEST_BASE_URL || "http://localhost:3100";
  try {
    for (const route of ["dashboard", "projects", "tasks", "bugs", "time-logs", "approvals", "payroll", "payslips", "analytics", "employees", "organisation", "audit-logs", "notifications", "settings"]) {
      const response = await page.goto(`${base}/${route}`);
      assert.equal(response.status(), 200, `${route} route failed`);
      await page.locator("h1").waitFor();
    }
    if (page.url().includes("/login")) {
      assert.equal(await page.getByRole("heading", { name: "Welcome back" }).count(), 1);
      console.log("Frontend smoke passed: protected routes redirect unauthenticated users to sign in.");
      return;
    }
    await page.goto(`${base}/projects`);
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByPlaceholder("e.g. Customer portal").fill("Preview Test Project");
    await page.getByPlaceholder("e.g. Northstar Digital").fill("Test Client");
    await page.getByPlaceholder("What is this project delivering?").fill("Frontend interaction test");
    await page.locator('input[type="date"]').fill("2026-11-30");
    await page.getByLabel("Owner").selectOption({ label: "Anika Rao" });
    await page.getByPlaceholder("Authentication, Billing, Reporting").fill("Core, Reports");
    await page.getByRole("button", { name: "Create project" }).click();
    assert.equal(await page.getByText("Preview Test Project").count(), 1);

    await page.goto(`${base}/bugs`);
    await page.getByRole("button", { name: "Report defect" }).click();
    await page.getByPlaceholder("Describe the issue briefly").fill("Preview test defect");
    await page.getByLabel("Original completed task").selectOption("TSK-276");
    await page.getByPlaceholder("What happened and how can it be reproduced?").fill("Repeatable test defect for frontend validation.");
    await page.getByRole("button", { name: "Report defect" }).last().click();
    assert.equal(await page.getByText("Preview test defect").count(), 1);

    await page.goto(`${base}/tasks`);
    await page.getByText("User onboarding screens").first().click();
    assert.equal(await page.getByText("Linked defects").count(), 1);
    await page.getByRole("button", { name: "Close dialog" }).click();

    await page.goto(`${base}/time-logs`);
    await page.getByRole("button", { name: "Log time" }).click();
    await page.getByRole("dialog").locator("select").first().selectOption("TSK-276");
    assert.equal(await page.getByText("Corrective", { exact: true }).count() > 0, true);
    await page.getByRole("dialog").locator("select").nth(1).selectOption({ label: "Sofia Patel" });
    await page.getByLabel("Hours").fill("1.5");
    await page.getByPlaceholder("What was done during this time?").fill("Reproduced and corrected the issue");
    await page.getByRole("button", { name: "Submit time entry" }).click();
    assert.equal(await page.getByText("Reproduced and corrected the issue").count(), 1);

    await page.goto(`${base}/approvals`);
    await page.getByText("Reproduced and corrected the issue").waitFor();
    assert.equal(await page.getByText("Reproduced and corrected the issue").count(), 1);
    assert.deepEqual(errors, []);
    console.log("Frontend smoke test passed: all routes, project creation, defect linking, corrective time and approval queue.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
