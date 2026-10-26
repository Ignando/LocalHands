import { test, expect } from "../support/test-fixtures";
import { selectAvailableHours, signInFixture, signOut } from "../support/test-actions";
import { withTestDatabase } from "../support/test-database";

test("TC-10 — treat SQL-like notes and application text as literal, safely rendered input", async ({
  page,
}) => {
  const notes = `Literal test: ' OR 1=1 -- <script>window.__lh_pw_test=1</script>`;
  const description = `Application literal: ' OR 1=1 -- <script>window.__lh_pw_description=1</script>`;

  await signInFixture(page, "customer");
  await page.goto("/pro/pw-worker");
  await selectAvailableHours(page, 1);
  await page.getByLabel("Job notes").fill(notes);
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Booking request sent")).toBeVisible();

  const storedNotes = await withTestDatabase(async (pool) =>
    pool
      .request()
      .query<{ JobNotes: string }>(
        "SELECT TOP (1) JobNotes FROM dbo.ServiceRequests ORDER BY RequestId DESC",
      ),
  );
  expect(storedNotes.recordset[0]?.JobNotes).toBe(notes);

  await page.goto("/apply");
  await page.getByLabel("Phone").fill("070 000 0301");
  await page.getByLabel("Tell customers about your work").fill(description);
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible();
  await signOut(page);

  await signInFixture(page, "worker");
  await page.goto("/worker-dashboard");
  await expect(page.getByRole("article").filter({ hasText: notes })).toBeVisible();
  await expect(page.locator("script")).not.toContainText("window.__lh_pw_test");
  expect(await page.evaluate(() => Object.hasOwn(window, "__lh_pw_test"))).toBe(false);
  await signOut(page);

  await signInFixture(page, "admin");
  await page.goto("/admin");
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await expect(page.locator("script")).not.toContainText("window.__lh_pw_description");
  expect(await page.evaluate(() => Object.hasOwn(window, "__lh_pw_description"))).toBe(false);
});
