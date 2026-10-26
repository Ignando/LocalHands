import sql from "mssql/msnodesqlv8.js";
import { test, expect } from "../support/test-fixtures";
import { withTestDatabase } from "../support/test-database";
import { TEST_ACCOUNTS, TEST_WORKER_PUBLIC_ID } from "../support/test-data";

test("DB-A — unique email, role check and working-hour constraints reject invalid data", async () => {
  await withTestDatabase(async (pool) => {
    await expect(
      pool
        .request()
        .input("Name", sql.NVarChar(100), "Duplicate fixture")
        .input("Email", sql.NVarChar(254), TEST_ACCOUNTS.customer.email)
        .query("INSERT dbo.Users (FullName, Email, Role) VALUES (@Name, @Email, N'Customer')"),
    ).rejects.toThrow();

    await expect(
      pool
        .request()
        .input("Name", sql.NVarChar(100), "Invalid role fixture")
        .input("Email", sql.NVarChar(254), "pw.invalid-role@localhands.test")
        .query("INSERT dbo.Users (FullName, Email, Role) VALUES (@Name, @Email, N'Guest')"),
    ).rejects.toThrow();

    const worker = await pool
      .request()
      .input("PublicId", sql.NVarChar(40), TEST_WORKER_PUBLIC_ID)
      .query<{ WorkerId: number }>("SELECT WorkerId FROM dbo.Workers WHERE PublicId = @PublicId");
    const workerId = worker.recordset[0]?.WorkerId;
    if (!workerId) throw new Error("Worker fixture is missing.");
    await expect(
      pool
        .request()
        .input("WorkerId", sql.Int, workerId)
        .query(
          "UPDATE dbo.WeeklyHours SET StartTime = '17:00', EndTime = '09:00' WHERE WorkerId = @WorkerId AND DayOfWeek = 1",
        ),
    ).rejects.toThrow();

    const remaining = await pool.request().query<{ InvalidRows: number }>(`
      SELECT COUNT(*) AS InvalidRows FROM dbo.Users WHERE Email = N'pw.invalid-role@localhands.test'
    `);
    expect(remaining.recordset[0]?.InvalidRows).toBe(0);
  });
});
