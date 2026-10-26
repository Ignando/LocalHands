import { test, expect } from "../support/test-fixtures";
import { signInFixture, signOut } from "../support/test-actions";
import { withTestDatabase } from "../support/test-database";

test("TC-09 — submit applications, reject invalid phone input, approve/reject and verify listing-removal gap", async ({
  page,
}) => {
  const approvedDescription = "TC09 approved fictional application description";
  const rejectedDescription = "TC09 rejected fictional application description";

  await signInFixture(page, "customer");
  await page.goto("/apply");
  await page.getByLabel("Phone").fill("12");
  await page
    .getByLabel("Tell customers about your work")
    .fill("A valid description for the initial invalid phone form.");
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByText(/too small|7 characters|at least 7/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Application received" })).toHaveCount(0);
  const noInvalidSubmission = await withTestDatabase(async (pool) =>
    pool.request().query<{ Count: number }>(`
    SELECT COUNT(*) AS Count FROM dbo.WorkerApplications WHERE ApplicantUserId = (SELECT UserId FROM dbo.Users WHERE Email = N'pw.customer@localhands.test')
  `),
  );
  expect(noInvalidSubmission.recordset[0]?.Count).toBe(0);

  await page.getByLabel("Phone").fill("070 000 0201");
  await page.getByLabel("Tell customers about your work").fill(approvedDescription);
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible();
  await signOut(page);

  await signInFixture(page, "applicant");
  await page.goto("/apply");
  await page.getByLabel("Phone").fill("070 000 0202");
  await page.getByLabel("Tell customers about your work").fill(rejectedDescription);
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible();
  await signOut(page);

  await signInFixture(page, "admin");
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  const approved = page.getByRole("article").filter({ hasText: approvedDescription });
  const rejected = page.getByRole("article").filter({ hasText: rejectedDescription });
  await approved.getByRole("button", { name: "Approve" }).click();
  await expect(approved.getByText("Approved", { exact: true })).toBeVisible();
  await rejected.getByRole("button", { name: "Reject" }).click();
  await expect(rejected.getByText("Rejected", { exact: true })).toBeVisible();

  const result = await withTestDatabase(async (pool) =>
    pool
      .request()
      .input("ApprovedDescription", approvedDescription)
      .input("RejectedDescription", rejectedDescription).query<{
      ApprovedRole: string;
      ListingStatus: string;
      IsIdentityVerified: boolean;
      RejectedStatus: string;
      ApprovedStatus: string;
    }>(`
      SELECT approvedUser.Role AS ApprovedRole, approvedWorker.ListingStatus, approvedWorker.IsIdentityVerified,
        rejected.Status AS RejectedStatus, approved.Status AS ApprovedStatus
      FROM dbo.WorkerApplications approved
      INNER JOIN dbo.Users approvedUser ON approvedUser.UserId = approved.ApplicantUserId
      INNER JOIN dbo.Workers approvedWorker ON approvedWorker.WorkerId = approved.CreatedWorkerId
      CROSS JOIN dbo.WorkerApplications rejected
      WHERE approved.Description = @ApprovedDescription AND rejected.Description = @RejectedDescription
    `),
  );
  expect(result.recordset[0]).toMatchObject({
    ApprovedRole: "Worker",
    ListingStatus: "Live",
    IsIdentityVerified: false,
    ApprovedStatus: "Approved",
    RejectedStatus: "Rejected",
  });

  // The current Admin UI exposes application Approve/Reject only; no listing-removal control is wired in.
  await expect(page.getByRole("button", { name: /remove worker|remove listing/i })).toHaveCount(0);
});
