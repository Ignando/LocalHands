import { test, expect } from "../support/test-fixtures";
import { parseRandAmount, signInFixture } from "../support/test-actions";
import { createBookingFixture, withTestDatabase } from "../support/test-database";

test("TC-07 — accept, complete and decline requests with the implemented reservation rules", async ({
  page,
}) => {
  const accept = await createBookingFixture({ notes: "TC07 accept fixture" });
  const complete = await createBookingFixture({ notes: "TC07 complete fixture" });
  const decline = await createBookingFixture({
    hours: 2,
    notes: "TC07 decline multi-hour fixture",
  });

  await withTestDatabase(async (pool) => {
    const worker = await pool.request().query<{ UserId: number }>(`
      SELECT u.UserId FROM dbo.Users u INNER JOIN dbo.Workers w ON w.UserId = u.UserId WHERE w.PublicId = N'pw-worker'
    `);
    const workerId = worker.recordset[0]?.UserId;
    if (!workerId) throw new Error("Worker test account is missing.");
    await pool
      .request()
      .input("RequestId", complete.requestId)
      .input("NewStatus", "Accepted")
      .input("ChangedByUserId", workerId)
      .execute("dbo.usp_SetServiceRequestStatus");
  });

  await signInFixture(page, "worker");
  await page.goto("/worker-dashboard");
  const acceptArticle = page.getByRole("article").filter({ hasText: "TC07 accept fixture" });
  const completeArticle = page.getByRole("article").filter({ hasText: "TC07 complete fixture" });
  const declineArticle = page
    .getByRole("article")
    .filter({ hasText: "TC07 decline multi-hour fixture" });

  await acceptArticle.getByRole("button", { name: "Accept" }).click();
  await expect(acceptArticle.getByText("Accepted", { exact: true })).toBeVisible();
  await completeArticle.getByRole("button", { name: "Mark complete" }).click();
  await expect(completeArticle.getByText("Completed", { exact: true })).toBeVisible();
  await declineArticle.getByRole("button", { name: "Decline" }).click();
  await expect(declineArticle.getByText("Declined", { exact: true })).toBeVisible();

  const states = await withTestDatabase(async (pool) =>
    pool
      .request()
      .input("CompleteId", complete.requestId)
      .input("DeclineId", decline.requestId)
      .input("AcceptId", accept.requestId).query<{
      RequestId: number;
      Status: string;
      LinkedSlots: number;
      ReservedSlots: number;
      TotalPrice: number;
    }>(`
      SELECT r.RequestId, r.Status, r.TotalPrice,
        (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs WHERE rs.RequestId = r.RequestId) AS LinkedSlots,
        (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs INNER JOIN dbo.AvailabilitySlots a ON a.SlotId = rs.SlotId
         WHERE rs.RequestId = r.RequestId AND a.SlotStatus = N'Booked') AS ReservedSlots
      FROM dbo.ServiceRequests r WHERE r.RequestId IN (@CompleteId, @DeclineId, @AcceptId)
    `),
  );
  const byId = new Map(states.recordset.map((row) => [row.RequestId, row]));
  expect(byId.get(accept.requestId)?.Status).toBe("Accepted");
  expect(byId.get(complete.requestId)?.Status).toBe("Completed");
  expect(byId.get(complete.requestId)?.ReservedSlots).toBe(1);
  expect(byId.get(decline.requestId)?.Status).toBe("Declined");
  expect(byId.get(decline.requestId)?.LinkedSlots).toBe(2);
  expect(byId.get(decline.requestId)?.ReservedSlots).toBe(0);
  const earningsCard = await page
    .getByText("Earnings", { exact: true })
    .locator("xpath=..")
    .innerText();
  await expect(page.getByText("Completed jobs", { exact: true })).toBeVisible();
  expect(parseRandAmount(earningsCard)).toBe(Number(byId.get(complete.requestId)?.TotalPrice));
});
