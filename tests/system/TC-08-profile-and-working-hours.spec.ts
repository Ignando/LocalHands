import { test, expect } from "../support/test-fixtures";
import { signInFixture } from "../support/test-actions";
import { withTestDatabase } from "../support/test-database";

test("TC-08 — save worker profile fields and weekly hours, reload and inspect public profile", async ({
  page,
}) => {

  await signInFixture(page, "worker");
  await page.goto("/worker-profile");
  await page.waitForLoadState("networkidle");
  const uniqueName = "Playwright Profile Updated";
  await page.getByLabel("Full name").fill(uniqueName);
  const firstStartTime = page.getByLabel(/start time$/i).first();
  const firstEndTime = page.getByLabel(/end time$/i).first();
  await firstStartTime.fill("10:00");
  await firstEndTime.fill("16:00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue(uniqueName);
  await expect(firstStartTime).toHaveValue("10:00");
  await expect(firstEndTime).toHaveValue("16:00");

  const saved = await withTestDatabase(async (pool) =>
    pool.request().query<{ FullName: string; StartTime: string; EndTime: string }>(`
    SELECT u.FullName, CONVERT(VARCHAR(5), wh.StartTime, 108) AS StartTime, CONVERT(VARCHAR(5), wh.EndTime, 108) AS EndTime
    FROM dbo.Users u INNER JOIN dbo.Workers w ON w.UserId = u.UserId
    INNER JOIN dbo.WeeklyHours wh ON wh.WorkerId = w.WorkerId
    WHERE w.PublicId = N'pw-worker' AND wh.DayOfWeek = 1
  `),
  );
  expect(saved.recordset[0]).toMatchObject({
    FullName: uniqueName,
    StartTime: "10:00",
    EndTime: "16:00",
  });

  await page.goto("/pro/pw-worker");
  await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible();
});
