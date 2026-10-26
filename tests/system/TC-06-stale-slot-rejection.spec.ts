import { test, expect } from "../support/test-fixtures";
import { selectAvailableHours, signIn, passwordFor } from "../support/test-actions";
import { withTestDatabase } from "../support/test-database";
import { TEST_ACCOUNTS } from "../support/test-data";

test("TC-06 — reject a stale slot after another customer has booked it", async ({
  page,
  browser,
}) => {
  const secondPage = await browser.newPage();
  try {
    await signIn(page, TEST_ACCOUNTS.customer.email, passwordFor("customer"));
    await page.goto("/pro/pw-worker");
    await selectAvailableHours(page, 1);

    await signIn(secondPage, TEST_ACCOUNTS.applicant.email, passwordFor("customer"));
    await secondPage.goto("/pro/pw-worker");
    await selectAvailableHours(secondPage, 1);

    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Booking request sent")).toBeVisible();

    // Keep the second browser's already-loaded selection to simulate a stale view. This is sequential,
    // not a simultaneous-booking or concurrency test.
    await secondPage.getByRole("button", { name: "Send request" }).click();
    await expect(secondPage.getByText(/no longer available/i)).toBeVisible();

    const result = await withTestDatabase(async (pool) =>
      pool.request().query<{ Requests: number; LinkedRows: number; SlotStatus: string }>(`
        SELECT (SELECT COUNT(*) FROM dbo.ServiceRequests r INNER JOIN dbo.Workers w ON w.WorkerId = r.WorkerId WHERE w.PublicId = N'pw-worker') AS Requests,
          (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs INNER JOIN dbo.ServiceRequests r ON r.RequestId = rs.RequestId
           INNER JOIN dbo.Workers w ON w.WorkerId = r.WorkerId WHERE w.PublicId = N'pw-worker') AS LinkedRows,
          (SELECT TOP (1) a.SlotStatus FROM dbo.AvailabilitySlots a INNER JOIN dbo.Workers w ON w.WorkerId = a.WorkerId
           WHERE w.PublicId = N'pw-worker' AND a.SlotStatus = N'Booked' ORDER BY a.SlotId DESC) AS SlotStatus
      `),
    );
    expect(result.recordset[0]?.Requests).toBe(1);
    expect(result.recordset[0]?.LinkedRows).toBe(1);
    expect(result.recordset[0]?.SlotStatus).toBe("Booked");
  } finally {
    await secondPage.close();
  }
});
