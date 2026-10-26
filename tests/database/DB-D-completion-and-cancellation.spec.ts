import sql from "mssql/msnodesqlv8.js";
import { test, expect } from "../support/test-fixtures";
import { createBookingFixture, withTestDatabase } from "../support/test-database";
import { TEST_ACCOUNTS } from "../support/test-data";

test("DB-D — completion retains every slot; cancellation releases every eligible linked slot", async () => {
  const completed = await createBookingFixture({ hours: 2, notes: "DB-D completion fixture" });
  const cancelled = await createBookingFixture({ hours: 2, notes: "DB-D cancellation fixture" });

  await withTestDatabase(async (pool) => {
    const ids = await pool
      .request()
      .input("CustomerEmail", sql.NVarChar(254), TEST_ACCOUNTS.customer.email)
      .input("WorkerEmail", sql.NVarChar(254), TEST_ACCOUNTS.worker.email).query<{
      CustomerId: number;
      WorkerId: number;
    }>(`
        SELECT (SELECT UserId FROM dbo.Users WHERE Email = @CustomerEmail) AS CustomerId,
               (SELECT UserId FROM dbo.Users WHERE Email = @WorkerEmail) AS WorkerId
      `);
    const customerId = ids.recordset[0]?.CustomerId;
    const workerId = ids.recordset[0]?.WorkerId;
    if (!customerId || !workerId) throw new Error("Customer/worker fixture accounts are missing.");

    await pool
      .request()
      .input("RequestId", sql.Int, completed.requestId)
      .input("NewStatus", sql.NVarChar(10), "Accepted")
      .input("ChangedByUserId", sql.Int, workerId)
      .execute("dbo.usp_SetServiceRequestStatus");
    await pool
      .request()
      .input("RequestId", sql.Int, completed.requestId)
      .input("NewStatus", sql.NVarChar(10), "Completed")
      .input("ChangedByUserId", sql.Int, workerId)
      .execute("dbo.usp_SetServiceRequestStatus");
    await pool
      .request()
      .input("RequestId", sql.Int, cancelled.requestId)
      .input("NewStatus", sql.NVarChar(10), "Cancelled")
      .input("ChangedByUserId", sql.Int, customerId)
      .execute("dbo.usp_SetServiceRequestStatus");

    const rows = await pool
      .request()
      .input("CompletedId", sql.Int, completed.requestId)
      .input("CancelledId", sql.Int, cancelled.requestId).query<{
      RequestId: number;
      Status: string;
      LinkedSlots: number;
      BookedSlots: number;
      AvailableSlots: number;
      HistoryRows: number;
    }>(`
        SELECT r.RequestId, r.Status,
          (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs WHERE rs.RequestId = r.RequestId) AS LinkedSlots,
          (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs INNER JOIN dbo.AvailabilitySlots a ON a.SlotId = rs.SlotId
            WHERE rs.RequestId = r.RequestId AND a.SlotStatus = N'Booked') AS BookedSlots,
          (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs INNER JOIN dbo.AvailabilitySlots a ON a.SlotId = rs.SlotId
            WHERE rs.RequestId = r.RequestId AND a.SlotStatus = N'Available') AS AvailableSlots,
          (SELECT COUNT(*) FROM dbo.BookingStatusHistory h WHERE h.RequestId = r.RequestId) AS HistoryRows
        FROM dbo.ServiceRequests r WHERE r.RequestId IN (@CompletedId, @CancelledId)
      `);
    const byId = new Map(rows.recordset.map((row) => [row.RequestId, row]));
    expect(byId.get(completed.requestId)).toMatchObject({
      Status: "Completed",
      LinkedSlots: 2,
      BookedSlots: 2,
      AvailableSlots: 0,
      HistoryRows: 2,
    });
    expect(byId.get(cancelled.requestId)).toMatchObject({
      Status: "Cancelled",
      LinkedSlots: 2,
      BookedSlots: 0,
      AvailableSlots: 2,
      HistoryRows: 1,
    });
  });
});
