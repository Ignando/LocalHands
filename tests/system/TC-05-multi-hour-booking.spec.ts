import { test, expect } from "../support/test-fixtures";
import { parseRandAmount, selectAvailableHours, signInFixture } from "../support/test-actions";
import { withTestDatabase } from "../support/test-database";
import { TEST_PREMIUM_SERVICE } from "../support/test-data";

test("TC-05 — book two hours once, charge the selected rate twice and include the callout once", async ({
  page,
}) => {
  await signInFixture(page, "customer");
  await page.goto("/pro/pw-worker");
  await page.getByLabel("Service").selectOption({ label: TEST_PREMIUM_SERVICE });
  await selectAvailableHours(page, 2);
  const visibleEstimateText = await page
    .locator("aside")
    .getByText("Estimated total")
    .locator("xpath=..")
    .innerText();
  const visibleEstimate = parseRandAmount(visibleEstimateText);
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Booking request sent")).toBeVisible();

  const result = await withTestDatabase(async (pool) =>
    pool.request().query<{
      RequestId: number;
      Status: string;
      ServiceName: string;
      ServiceRate: number;
      ServiceEstimate: number;
      TravelFee: number;
      TotalPrice: number;
      LinkedSlots: number;
      BookedSlots: number;
    }>(`
    SELECT TOP (1) r.RequestId, r.Status, ws.ServiceName, ws.StartingPrice AS ServiceRate,
      r.ServiceEstimate, r.TravelFee, r.TotalPrice,
      (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs WHERE rs.RequestId = r.RequestId) AS LinkedSlots,
      (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs INNER JOIN dbo.AvailabilitySlots a ON a.SlotId = rs.SlotId
       WHERE rs.RequestId = r.RequestId AND a.SlotStatus = N'Booked') AS BookedSlots
    FROM dbo.ServiceRequests r
    INNER JOIN dbo.Users c ON c.UserId = r.CustomerId
    INNER JOIN dbo.WorkerServices ws ON ws.ServiceId = r.ServiceId
    WHERE c.Email = N'pw.customer@localhands.test'
    ORDER BY r.RequestId DESC
  `),
  );
  const request = result.recordset[0];
  expect(request).toBeTruthy();
  expect(request?.ServiceName).toBe(TEST_PREMIUM_SERVICE);
  expect(request?.Status).toBe("Pending");
  expect(request?.LinkedSlots).toBe(2);
  expect(request?.BookedSlots).toBe(2);
  expect(Number(request?.ServiceEstimate)).toBe(Number(request?.ServiceRate) * 2);
  expect(Number(request?.TotalPrice)).toBe(
    Number(request?.ServiceRate) * 2 + Number(request?.TravelFee),
  );

  // The current profile UI estimates from worker.StartingPrice (R200), while the server uses
  // the Premium service rate (R350). This assertion is expected to expose that known discrepancy.
  expect(
    visibleEstimate,
    "displayed estimate must match the server-calculated persisted total",
  ).toBe(Number(request?.TotalPrice));
});
