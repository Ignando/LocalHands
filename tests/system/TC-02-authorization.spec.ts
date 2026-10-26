import sql from "mssql/msnodesqlv8.js";
import { test, expect } from "../support/test-fixtures";
import { signInFixture } from "../support/test-actions";
import { createBookingFixture, withTestDatabase } from "../support/test-database";
import { TEST_ACCOUNTS } from "../support/test-data";

test("TC-02 — customer cannot access protected worker/admin pages or mutate protected records", async ({
  page,
}) => {
  await signInFixture(page, "customer");
  const request = await createBookingFixture({ notes: "TC02 protected status-change fixture" });
  const before = await withTestDatabase(async (pool) =>
    pool.request().query<{ Applications: number; Requests: number }>(`
      SELECT (SELECT COUNT(*) FROM dbo.WorkerApplications) AS Applications,
             (SELECT COUNT(*) FROM dbo.ServiceRequests) AS Requests
    `),
  );

  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Review queue" })).toHaveCount(0);
  await page.goto("/worker-profile");
  await expect(page).not.toHaveURL(/\/worker-profile$/);
  await expect(page.getByRole("heading", { name: "Edit profile" })).toHaveCount(0);

  const rejected = await withTestDatabase(async (pool) => {
    const customer = await pool
      .request()
      .input("Email", sql.NVarChar(254), TEST_ACCOUNTS.customer.email)
      .query<{ UserId: number }>("SELECT UserId FROM dbo.Users WHERE Email = @Email");
    const customerId = customer.recordset[0]?.UserId;
    if (!customerId) throw new Error("Customer fixture is missing.");
    await expect(
      pool
        .request()
        .input("RequestId", sql.Int, request.requestId)
        .input("NewStatus", sql.NVarChar(10), "Accepted")
        .input("ChangedByUserId", sql.Int, customerId)
        .execute("dbo.usp_SetServiceRequestStatus"),
    ).rejects.toThrow(/cannot update|account/i);
    return pool.request().input("RequestId", sql.Int, request.requestId).query<{
      Status: string;
      HistoryRows: number;
    }>(`
        SELECT r.Status, (SELECT COUNT(*) FROM dbo.BookingStatusHistory h WHERE h.RequestId = r.RequestId) AS HistoryRows
        FROM dbo.ServiceRequests r WHERE r.RequestId = @RequestId
      `);
  });
  expect(rejected.recordset[0]).toEqual({ Status: "Pending", HistoryRows: 0 });

  const after = await withTestDatabase(async (pool) =>
    pool.request().query<{ Applications: number; Requests: number }>(`
      SELECT (SELECT COUNT(*) FROM dbo.WorkerApplications) AS Applications,
             (SELECT COUNT(*) FROM dbo.ServiceRequests) AS Requests
    `),
  );
  expect(after.recordset[0]).toEqual(before.recordset[0]);

  // The UI exposes no server-function invocation control to a customer. The rejected status change above
  // exercises the database procedure guard; DB-C/DB-E also test role and transition failures. This does not
  // replace a direct server-function RPC test, which the application does not expose as a public API.
  await expect(page.getByRole("button", { name: /approve|accept|decline|remove/i })).toHaveCount(0);
});
