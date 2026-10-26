import sql from "mssql/msnodesqlv8.js";
import { test, expect } from "../support/test-fixtures";
import { createApplicationFixture, withTestDatabase } from "../support/test-database";
import { TEST_ACCOUNTS } from "../support/test-data";

test("DB-E — only Admin can approve; approval creates a live worker without verifying identity", async () => {
  const applicationId = await createApplicationFixture({
    description: "DB-E fictional approval fixture",
  });
  await withTestDatabase(async (pool) => {
    const ids = await pool.request().query<{ CustomerId: number; AdminId: number }>(`
      SELECT (SELECT UserId FROM dbo.Users WHERE Email = N'${TEST_ACCOUNTS.customer.email}') AS CustomerId,
             (SELECT UserId FROM dbo.Users WHERE Email = N'${TEST_ACCOUNTS.admin.email}') AS AdminId
    `);
    const customerId = ids.recordset[0]?.CustomerId;
    const adminId = ids.recordset[0]?.AdminId;
    if (!customerId || !adminId) throw new Error("Customer/admin fixture accounts are missing.");

    await expect(
      pool
        .request()
        .input("ApplicationId", sql.Int, applicationId)
        .input("AdminId", sql.Int, customerId)
        .input("NewStatus", sql.NVarChar(24), "Approved")
        .execute("dbo.usp_SetApplicationStatus"),
    ).rejects.toThrow(/admin/i);

    const untouched = await pool.request().input("ApplicationId", sql.Int, applicationId).query<{
      Status: string;
      Role: string;
    }>(`
        SELECT a.Status, u.Role FROM dbo.WorkerApplications a
        INNER JOIN dbo.Users u ON u.UserId = a.ApplicantUserId WHERE a.ApplicationId = @ApplicationId
      `);
    expect(untouched.recordset[0]).toEqual({ Status: "Application Submitted", Role: "Customer" });

    await pool
      .request()
      .input("ApplicationId", sql.Int, applicationId)
      .input("AdminId", sql.Int, adminId)
      .input("NewStatus", sql.NVarChar(24), "Approved")
      .execute("dbo.usp_SetApplicationStatus");

    const approved = await pool.request().input("ApplicationId", sql.Int, applicationId).query<{
      Status: string;
      Role: string;
      ListingStatus: string;
      IsIdentityVerified: boolean;
      Actions: number;
    }>(`
        SELECT a.Status, u.Role, w.ListingStatus, w.IsIdentityVerified,
          (SELECT COUNT(*) FROM dbo.AdminActions aa WHERE aa.ApplicationId = a.ApplicationId) AS Actions
        FROM dbo.WorkerApplications a
        INNER JOIN dbo.Users u ON u.UserId = a.ApplicantUserId
        INNER JOIN dbo.Workers w ON w.WorkerId = a.CreatedWorkerId
        WHERE a.ApplicationId = @ApplicationId
      `);
    expect(approved.recordset[0]).toEqual({
      Status: "Approved",
      Role: "Worker",
      ListingStatus: "Live",
      IsIdentityVerified: false,
      Actions: 1,
    });
  });
});
