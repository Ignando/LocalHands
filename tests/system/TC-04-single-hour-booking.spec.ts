import { test, expect } from "../support/test-fixtures";
import { parseRandAmount, selectAvailableHours, signInFixture } from "../support/test-actions";
import { withTestDatabase } from "../support/test-database";

test("TC-04 — book one hour, reserve its slot and persist the service rate plus one callout fee", async ({
  page,
}) => {
  await signInFixture(page, "customer");
  await page.goto("/pro/pw-worker");
  const send = page.getByRole("button", { name: "Send request" });
  await expect(send).toBeDisabled();
  await selectAvailableHours(page, 1);
  const visibleEstimateText = await page
    .locator("aside")
    .getByText("Estimated total")
    .locator("xpath=..")
    .innerText();
  const visibleEstimate = parseRandAmount(visibleEstimateText);
  await send.click();
  await expect(page.getByText("Booking request sent")).toBeVisible();

  const result = await withTestDatabase(async (pool) =>
    pool.request().query<{
      RequestId: number;
      Status: string;
      ServiceEstimate: number;
      TravelFee: number;
      TotalPrice: number;
      SlotStatus: string;
      LinkedSlots: number;
    }>(`
    SELECT TOP (1) r.RequestId, r.Status, r.ServiceEstimate, r.TravelFee, r.TotalPrice,
      slot.SlotStatus, (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs WHERE rs.RequestId = r.RequestId) AS LinkedSlots
    FROM dbo.ServiceRequests r
    INNER JOIN dbo.Users c ON c.UserId = r.CustomerId
    INNER JOIN dbo.ServiceRequestSlots rs ON rs.RequestId = r.RequestId
    INNER JOIN dbo.AvailabilitySlots slot ON slot.SlotId = rs.SlotId
    WHERE c.Email = N'pw.customer@localhands.test'
    ORDER BY r.RequestId DESC
  `),
  );
  const request = result.recordset[0];
  expect(request).toBeTruthy();
  expect(request?.Status).toBe("Pending");
  expect(request?.LinkedSlots).toBe(1);
  expect(request?.SlotStatus).toBe("Booked");
  expect(Number(request?.TotalPrice)).toBe(
    Number(request?.ServiceEstimate) + Number(request?.TravelFee),
  );
  expect(visibleEstimate).toBe(Number(request?.TotalPrice));
});
