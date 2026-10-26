import sql from "mssql/msnodesqlv8.js";
import { test, expect } from "../support/test-fixtures";
import { createBookingFixture, withTestDatabase } from "../support/test-database";
import { TEST_ACCOUNTS } from "../support/test-data";

test("DB-C — wrong-role and invalid request-status transitions are rejected without mutation", async () => {
  const fixture = await createBookingFixture({ notes: "DB-C status fixture" });
  await withTestDatabase(async (pool) => {
    const ids = await pool.request().query<{ AdminId: number; WorkerId: number }>(`
      SELECT (SELECT UserId FROM dbo.Users WHERE Email = N'${TEST_ACCOUNTS.admin.email}') AS AdminId,
             (SELECT UserId FROM dbo.Users WHERE Email = N'${TEST_ACCOUNTS.worker.email}') AS WorkerId
    `);
    const { AdminId, WorkerId } = ids.recordset[0] ?? {};
    if (!AdminId || !WorkerId) throw new Error("Admin/worker fixture accounts are missing.");

    await expect(
      pool
        .request()
        .input("RequestId", sql.Int, fixture.requestId)
        .input("NewStatus", sql.NVarChar(10), "Accepted")
        .input("ChangedByUserId", sql.Int, AdminId)
        .execute("dbo.usp_SetServiceRequestStatus"),
    ).rejects.toThrow(/cannot update|account/i);

    await expect(
      pool
        .request()
        .input("RequestId", sql.Int, fixture.requestId)
        .input("NewStatus", sql.NVarChar(10), "Completed")
        .input("ChangedByUserId", sql.Int, WorkerId)
        .execute("dbo.usp_SetServiceRequestStatus"),
    ).rejects.toThrow(/transition/i);

    const state = await pool.request().input("RequestId", sql.Int, fixture.requestId).query<{
      Status: string;
      HistoryRows: number;
    }>(`
        SELECT r.Status, (SELECT COUNT(*) FROM dbo.BookingStatusHistory h WHERE h.RequestId = r.RequestId) AS HistoryRows
        FROM dbo.ServiceRequests r WHERE r.RequestId = @RequestId
      `);
    expect(state.recordset[0]).toEqual({ Status: "Pending", HistoryRows: 0 });
  });
});
