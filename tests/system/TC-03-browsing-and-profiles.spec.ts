import { test, expect } from "../support/test-fixtures";
import { withTestDatabase } from "../support/test-database";

test("TC-03 — browse category, clear filter, view worker profile and show empty reviews", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("no reviews yet", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="/pro/pw-worker"]')).toHaveCount(1);

  const before = await page.locator('a[href="/pro/pw-worker"]').count();
  expect(before).toBe(1);
  await page.getByText("Garden & Landscaping", { exact: true }).first().click();
  await expect(page.getByText("Garden & Landscaping near you", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="/pro/pw-worker"]')).toBeVisible();
  await page.getByRole("button", { name: /clear filters/i }).click();
  await expect(page.getByText("Recommended near you")).toBeVisible();

  const verification = await withTestDatabase(async (pool) =>
    pool.request().input("PublicId", "pw-worker").query<{
      IsIdentityVerified: boolean;
      IsExperienceVerified: boolean;
      IsQualified: boolean;
      ReviewCount: number;
    }>(`
      SELECT IsIdentityVerified, IsExperienceVerified, IsQualified, ReviewCount
      FROM dbo.Workers WHERE PublicId = @PublicId
    `),
  );
  expect(verification.recordset[0]).toEqual({
    IsIdentityVerified: false,
    IsExperienceVerified: false,
    IsQualified: false,
    ReviewCount: 0,
  });

  await page.goto("/pro/pw-worker");
  await expect(page.getByRole("heading", { name: /playwright worker/i })).toBeVisible();
  await expect(page.getByText("Playwright Standard Service", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent reviews" })).toBeVisible();
  await expect(page.getByText("0.0 average", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: /playwright worker/i })
      .locator("xpath=..")
      .locator("svg"),
  ).toHaveCount(0);
  await expect(page.getByText("Identity Verified", { exact: true })).toHaveCount(0);
});
