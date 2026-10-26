import { randomBytes, scrypt } from "node:crypto";
import sql from "mssql/msnodesqlv8.js";

import {
  getTestDatabaseSettings,
  getTestPasswords,
  TEST_ACCOUNTS,
  TEST_DATABASE_NAME,
  TEST_PREMIUM_SERVICE,
  TEST_STANDARD_SERVICE,
  TEST_WORKER_PUBLIC_ID,
} from "./test-data";

type TestPool = sql.ConnectionPool;
export type BookingFixture = {
  requestId: number;
  slotIds: number[];
  serviceRate: number;
  calloutFee: number;
  total: number;
};

function makePasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) return reject(error);
        resolve(`scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`);
      },
    );
  });
}

export async function assertTargetDatabase(pool: TestPool): Promise<void> {
  const result = await pool
    .request()
    .query<{ DatabaseName: string }>("SELECT DB_NAME() AS DatabaseName");
  const actual = result.recordset[0]?.DatabaseName;
  if (actual !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing test database operation: connected database is ${actual ?? "unknown"}; expected ${TEST_DATABASE_NAME}.`,
    );
  }
}

export async function withTestDatabase<T>(work: (pool: TestPool) => Promise<T>): Promise<T> {
  const settings = getTestDatabaseSettings();
  const connectionString =
    [
      `Driver={${settings.driver}}`,
      `Server=${settings.server}`,
      `Database=${settings.database}`,
      "Trusted_Connection=yes",
      "Encrypt=yes",
      "TrustServerCertificate=yes",
    ].join(";") + ";";
  const pool = await new sql.ConnectionPool({
    connectionString,
  } as unknown as ConstructorParameters<typeof sql.ConnectionPool>[0]).connect();
  try {
    await assertTargetDatabase(pool);
    return await work(pool);
  } finally {
    await pool.close();
  }
}

const RESET_TEST_FIXTURES_SQL = `
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @CustomerId INT = (SELECT UserId FROM dbo.Users WHERE Email = N'pw.customer@localhands.test');
  DECLARE @ApplicantId INT = (SELECT UserId FROM dbo.Users WHERE Email = N'pw.applicant@localhands.test');
  DECLARE @AdminId INT = (SELECT UserId FROM dbo.Users WHERE Email = N'pw.admin@localhands.test');
  DECLARE @WorkerId INT = (SELECT WorkerId FROM dbo.Workers WHERE PublicId = N'pw-worker');

  IF @CustomerId IS NULL OR @ApplicantId IS NULL OR @AdminId IS NULL OR @WorkerId IS NULL
      THROW 51001, 'Playwright fixtures are missing; execute database/tests/setup-test-database.sql in SSMS 22.', 1;

  DECLARE @WorkerIds TABLE (WorkerId INT PRIMARY KEY);
  INSERT @WorkerIds (WorkerId) VALUES (@WorkerId);
  INSERT @WorkerIds (WorkerId)
  SELECT w.WorkerId FROM dbo.Workers w
  WHERE w.UserId IN (@CustomerId, @ApplicantId)
    AND NOT EXISTS (SELECT 1 FROM @WorkerIds existing WHERE existing.WorkerId = w.WorkerId);

  DECLARE @ApplicationIds TABLE (ApplicationId INT PRIMARY KEY);
  INSERT @ApplicationIds (ApplicationId)
  SELECT ApplicationId FROM dbo.WorkerApplications
  WHERE ApplicantUserId IN (@CustomerId, @ApplicantId);

  DECLARE @RequestIds TABLE (RequestId INT PRIMARY KEY);
  INSERT @RequestIds (RequestId)
  SELECT RequestId FROM dbo.ServiceRequests
  WHERE CustomerId IN (@CustomerId, @ApplicantId)
     OR WorkerId IN (SELECT WorkerId FROM @WorkerIds);

  DELETE n FROM dbo.Notifications n WHERE n.RelatedRequestId IN (SELECT RequestId FROM @RequestIds);
  DELETE rv FROM dbo.Reviews rv WHERE rv.RequestId IN (SELECT RequestId FROM @RequestIds);
  DELETE h FROM dbo.BookingStatusHistory h WHERE h.RequestId IN (SELECT RequestId FROM @RequestIds);
  DELETE rs FROM dbo.ServiceRequestSlots rs WHERE rs.RequestId IN (SELECT RequestId FROM @RequestIds);
  DELETE r FROM dbo.ServiceRequests r WHERE r.RequestId IN (SELECT RequestId FROM @RequestIds);
  DELETE d FROM dbo.WorkerDocuments d
    WHERE d.ApplicationId IN (SELECT ApplicationId FROM @ApplicationIds)
       OR d.WorkerId IN (SELECT WorkerId FROM @WorkerIds);
  DELETE a FROM dbo.AdminActions a WHERE a.ApplicationId IN (SELECT ApplicationId FROM @ApplicationIds);
  UPDATE dbo.WorkerApplications SET CreatedWorkerId = NULL WHERE ApplicationId IN (SELECT ApplicationId FROM @ApplicationIds);
  DELETE a FROM dbo.WorkerApplications a WHERE a.ApplicationId IN (SELECT ApplicationId FROM @ApplicationIds);
  DELETE a FROM dbo.WorkerServiceAreas a WHERE a.WorkerId IN (SELECT WorkerId FROM @WorkerIds);
  DELETE s FROM dbo.WorkerServices s WHERE s.WorkerId IN (SELECT WorkerId FROM @WorkerIds);
  DELETE h FROM dbo.WeeklyHours h WHERE h.WorkerId IN (SELECT WorkerId FROM @WorkerIds);
  DELETE v FROM dbo.AvailabilitySlots v WHERE v.WorkerId IN (SELECT WorkerId FROM @WorkerIds);
  DELETE w FROM dbo.Workers w WHERE w.UserId IN (@CustomerId, @ApplicantId);

  UPDATE dbo.Users SET FullName = N'Playwright Customer', Phone = N'070 000 0101', Role = N'Customer',
    SuburbId = (SELECT SuburbId FROM dbo.Suburbs WHERE Name = N'Bellville') WHERE UserId = @CustomerId;
  UPDATE dbo.Users SET FullName = N'Playwright Applicant', Phone = N'070 000 0102', Role = N'Customer',
    SuburbId = (SELECT SuburbId FROM dbo.Suburbs WHERE Name = N'Bellville') WHERE UserId = @ApplicantId;
  UPDATE dbo.Users SET FullName = N'Playwright Admin', Phone = N'070 000 0103', Role = N'Admin',
    SuburbId = (SELECT SuburbId FROM dbo.Suburbs WHERE Name = N'Bellville') WHERE UserId = @AdminId;
  UPDATE dbo.Users SET FullName = N'Playwright Worker', Phone = N'070 000 0104', Role = N'Worker',
    SuburbId = (SELECT SuburbId FROM dbo.Suburbs WHERE Name = N'Bellville')
    WHERE UserId = (SELECT UserId FROM dbo.Workers WHERE WorkerId = @WorkerId);

  DELETE s FROM dbo.UserSessions s WHERE s.UserId IN (@CustomerId, @ApplicantId, @AdminId,
    (SELECT UserId FROM dbo.Workers WHERE WorkerId = @WorkerId));
  DELETE s FROM dbo.UserSessions s
    WHERE s.UserId IN (SELECT UserId FROM dbo.Users WHERE Email LIKE N'pw.registered.%@localhands.test');
  DELETE u FROM dbo.Users u WHERE u.Email LIKE N'pw.registered.%@localhands.test';

  UPDATE dbo.Workers SET YearsExperience = 3, StartingPrice = 200, TravelFee = 50,
    About = N'Fictional Playwright test worker; not a verified real person.',
    IsIdentityVerified = 0, IsExperienceVerified = 0, IsQualified = 0,
    AvailabilityStatus = N'Available', ListingStatus = N'Live',
    RatingAverage = 0, ReviewCount = 0, JobsCompleted = 0,
    SuburbId = (SELECT SuburbId FROM dbo.Suburbs WHERE Name = N'Bellville') WHERE WorkerId = @WorkerId;

  INSERT dbo.WorkerServices (WorkerId, ServiceName, StartingPrice)
    VALUES (@WorkerId, N'Playwright Standard Service', 200),
           (@WorkerId, N'Playwright Premium Service', 350);
  INSERT dbo.WeeklyHours (WorkerId, DayOfWeek, StartTime, EndTime, IsAvailable)
    SELECT @WorkerId, days.DayOfWeek, '09:00', '17:00', 1
    FROM (VALUES (1),(2),(3),(4),(5),(6),(7)) days(DayOfWeek);
`;

export async function resetTestFixtures(): Promise<void> {
  await withTestDatabase(async (pool) => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await assertTargetDatabase(pool);
      await new sql.Request(transaction).query(RESET_TEST_FIXTURES_SQL);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  });
}

export async function prepareTestDatabase(): Promise<void> {
  const passwords = getTestPasswords();
  await withTestDatabase(async (pool) => {
    const objects = await pool.request().query<{ Name: string; Found: number }>(`
      SELECT N'Users' AS Name, IIF(OBJECT_ID(N'dbo.Users', N'U') IS NULL, 0, 1) AS Found
      UNION ALL SELECT N'Workers', IIF(OBJECT_ID(N'dbo.Workers', N'U') IS NULL, 0, 1)
      UNION ALL SELECT N'AvailabilitySlots', IIF(OBJECT_ID(N'dbo.AvailabilitySlots', N'U') IS NULL, 0, 1)
      UNION ALL SELECT N'ServiceRequests', IIF(OBJECT_ID(N'dbo.ServiceRequests', N'U') IS NULL, 0, 1)
      UNION ALL SELECT N'ServiceRequestSlots', IIF(OBJECT_ID(N'dbo.ServiceRequestSlots', N'U') IS NULL, 0, 1)
      UNION ALL SELECT N'BookingStatusHistory', IIF(OBJECT_ID(N'dbo.BookingStatusHistory', N'U') IS NULL, 0, 1)
      UNION ALL SELECT N'usp_SetServiceRequestStatus', IIF(OBJECT_ID(N'dbo.usp_SetServiceRequestStatus', N'P') IS NULL, 0, 1)
      UNION ALL SELECT N'usp_SetApplicationStatus', IIF(OBJECT_ID(N'dbo.usp_SetApplicationStatus', N'P') IS NULL, 0, 1)
    `);
    const missing = objects.recordset.filter((item) => !item.Found).map((item) => item.Name);
    if (missing.length) {
      throw new Error(
        `Test schema is incomplete (${missing.join(", ")}). Run database/tests/setup-test-database.sql in SSMS 22 first.`,
      );
    }
    const fixtureRows = await pool.request().query<{ Email: string; Role: string }>(`
      SELECT Email, Role FROM dbo.Users
      WHERE Email IN (N'${TEST_ACCOUNTS.customer.email}', N'${TEST_ACCOUNTS.applicant.email}',
        N'${TEST_ACCOUNTS.worker.email}', N'${TEST_ACCOUNTS.admin.email}')
    `);
    if (fixtureRows.recordset.length !== 4) {
      throw new Error(
        "One or more Playwright fixture accounts are missing. Run database/tests/setup-test-database.sql in SSMS 22.",
      );
    }
  });

  await resetTestFixtures();
  const credentials = [
    {
      email: TEST_ACCOUNTS.customer.email,
      role: TEST_ACCOUNTS.customer.role,
      password: passwords.customer,
    },
    {
      email: TEST_ACCOUNTS.applicant.email,
      role: TEST_ACCOUNTS.applicant.role,
      password: passwords.customer,
    },
    {
      email: TEST_ACCOUNTS.worker.email,
      role: TEST_ACCOUNTS.worker.role,
      password: passwords.worker,
    },
    { email: TEST_ACCOUNTS.admin.email, role: TEST_ACCOUNTS.admin.role, password: passwords.admin },
  ];
  await withTestDatabase(async (pool) => {
    for (const { email, role, password } of credentials) {
      const passwordHash = await makePasswordHash(password);
      const result = await pool
        .request()
        .input("Email", sql.NVarChar(254), email)
        .input("Role", sql.NVarChar(10), role)
        .input("PasswordHash", sql.NVarChar(512), passwordHash).query(`
          UPDATE dbo.Users SET PasswordHash = @PasswordHash, UpdatedAt = SYSUTCDATETIME()
          WHERE Email = @Email AND Role = @Role AND IsActive = 1;
          IF @@ROWCOUNT <> 1 THROW 51002, 'A test account has the wrong role or is inactive.', 1;
          UPDATE dbo.UserSessions SET RevokedAt = SYSUTCDATETIME()
          WHERE UserId = (SELECT UserId FROM dbo.Users WHERE Email = @Email) AND RevokedAt IS NULL;
        `);
      if (result.rowsAffected[0] !== 1) {
        throw new Error(`Could not prepare the ${role} fixture account; check test seed roles.`);
      }
    }
  });
}

let fixtureSequence = 0;

function nextSastStart(dayOffset: number, hour = 11): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "0";
  const localDate = new Date(
    Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day")) + dayOffset),
  );
  return new Date(
    Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), hour - 2),
  );
}

export async function createBookingFixture(
  options: {
    hours?: number;
    service?: "standard" | "premium";
    status?: "Pending" | "Accepted";
    notes?: string;
  } = {},
): Promise<BookingFixture> {
  const hours = options.hours ?? 1;
  if (!Number.isInteger(hours) || hours < 1 || hours > 24)
    throw new Error("Fixture hours must be an integer from 1 to 24.");
  const serviceName = options.service === "premium" ? TEST_PREMIUM_SERVICE : TEST_STANDARD_SERVICE;
  fixtureSequence += 1;
  const firstStart = nextSastStart(3 + fixtureSequence, 11);
  const starts = Array.from(
    { length: hours },
    (_, index) => new Date(firstStart.getTime() + index * 60 * 60 * 1000),
  );
  return withTestDatabase(async (pool) => {
    await assertTargetDatabase(pool);
    const workerResult = await pool
      .request()
      .input("PublicId", sql.NVarChar(40), TEST_WORKER_PUBLIC_ID).query<{
      WorkerId: number;
      UserId: number;
      TravelFee: number;
    }>(`
        SELECT w.WorkerId, w.UserId, w.TravelFee FROM dbo.Workers w WHERE w.PublicId = @PublicId AND w.ListingStatus = N'Live'
      `);
    const worker = workerResult.recordset[0];
    const customerResult = await pool
      .request()
      .input("Email", sql.NVarChar(254), TEST_ACCOUNTS.customer.email)
      .query<{ UserId: number }>(
        "SELECT UserId FROM dbo.Users WHERE Email = @Email AND Role = N'Customer'",
      );
    const customerId = customerResult.recordset[0]?.UserId;
    const serviceResult = await pool
      .request()
      .input("WorkerId", sql.Int, worker?.WorkerId)
      .input("Name", sql.NVarChar(120), serviceName)
      .query<{ ServiceId: number; StartingPrice: number }>(
        "SELECT ServiceId, StartingPrice FROM dbo.WorkerServices WHERE WorkerId = @WorkerId AND ServiceName = @Name AND IsActive = 1",
      );
    const service = serviceResult.recordset[0];
    if (!worker || !customerId || !service)
      throw new Error(
        "Booking fixtures are missing; run the isolated setup script and fixture preparation.",
      );

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await assertTargetDatabase(pool);
      const slotIds: number[] = [];
      for (const startsAt of starts) {
        const slotResult = await new sql.Request(transaction)
          .input("WorkerId", sql.Int, worker.WorkerId)
          .input("StartsAt", sql.DateTime2, startsAt)
          .input("EndsAt", sql.DateTime2, new Date(startsAt.getTime() + 60 * 60 * 1000)).query<{
          SlotId: number;
        }>(`
            INSERT dbo.AvailabilitySlots (WorkerId, StartsAt, EndsAt, SlotStatus)
            OUTPUT INSERTED.SlotId VALUES (@WorkerId, @StartsAt, @EndsAt, N'Available')
          `);
        const slotId = slotResult.recordset[0]?.SlotId;
        if (!slotId) throw new Error("Could not create a fixture availability slot.");
        slotIds.push(slotId);
      }
      const ref = `PW-${randomBytes(6).toString("hex")}`;
      const requestResult = await new sql.Request(transaction)
        .input("Reference", sql.NVarChar(20), ref)
        .input("CustomerId", sql.Int, customerId)
        .input("WorkerId", sql.Int, worker.WorkerId)
        .input("ServiceId", sql.Int, service.ServiceId)
        .input("Notes", sql.NVarChar(500), options.notes ?? "Playwright database fixture")
        .input("Estimate", sql.Decimal(10, 2), Number(service.StartingPrice) * hours)
        .input("TravelFee", sql.Decimal(10, 2), Number(worker.TravelFee))
        .input("ScheduledAt", sql.DateTime2, starts[0])
        .input("Status", sql.NVarChar(15), options.status ?? "Pending").query<{
        RequestId: number;
      }>(`
          INSERT dbo.ServiceRequests (PublicReference, CustomerId, WorkerId, ServiceId, SlotId, JobNotes, ServiceEstimate, TravelFee, ScheduledAt, Status)
          OUTPUT INSERTED.RequestId
          VALUES (@Reference, @CustomerId, @WorkerId, @ServiceId, NULL, @Notes, @Estimate, @TravelFee, @ScheduledAt, @Status)
        `);
      const requestId = requestResult.recordset[0]?.RequestId;
      if (!requestId) throw new Error("Could not create the service-request fixture.");
      for (const slotId of slotIds) {
        await new sql.Request(transaction)
          .input("RequestId", sql.Int, requestId)
          .input("SlotId", sql.Int, slotId)
          .query(
            "INSERT dbo.ServiceRequestSlots (RequestId, SlotId) VALUES (@RequestId, @SlotId); UPDATE dbo.AvailabilitySlots SET SlotStatus = N'Booked' WHERE SlotId = @SlotId;",
          );
      }
      await transaction.commit();
      return {
        requestId,
        slotIds,
        serviceRate: Number(service.StartingPrice),
        calloutFee: Number(worker.TravelFee),
        total: Number(service.StartingPrice) * hours + Number(worker.TravelFee),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  });
}

export async function createApplicationFixture(
  options: { email?: string; phone?: string; description?: string } = {},
): Promise<number> {
  return withTestDatabase(async (pool) => {
    await assertTargetDatabase(pool);
    const applicant = await pool
      .request()
      .input("Email", sql.NVarChar(254), options.email ?? TEST_ACCOUNTS.applicant.email).query<{
      UserId: number;
      FullName: string;
      Email: string;
      SuburbId: number;
    }>(`
        SELECT u.UserId, u.FullName, u.Email, u.SuburbId FROM dbo.Users u WHERE u.Email = @Email
      `);
    const account = applicant.recordset[0];
    const category = await pool
      .request()
      .query<{ CategoryId: number }>(
        "SELECT TOP (1) CategoryId FROM dbo.Categories WHERE IsActive = 1 ORDER BY SortOrder",
      );
    if (!account || !category.recordset[0])
      throw new Error("Application fixture account or category is missing.");
    const inserted = await pool
      .request()
      .input("UserId", sql.Int, account.UserId)
      .input("FullName", sql.NVarChar(100), account.FullName)
      .input("Email", sql.NVarChar(254), account.Email)
      .input("Phone", sql.NVarChar(20), options.phone ?? "070 000 0199")
      .input("CategoryId", sql.Int, category.recordset[0].CategoryId)
      .input("SuburbId", sql.Int, account.SuburbId)
      .input(
        "Description",
        sql.NVarChar(1000),
        options.description ?? "Fictional application fixture for database integration tests.",
      ).query<{ ApplicationId: number }>(`
        INSERT dbo.WorkerApplications (ApplicantUserId, FullName, Email, Phone, CategoryId, SuburbId, MainService, YearsExperience, Description, StartingPrice)
        OUTPUT INSERTED.ApplicationId
        VALUES (@UserId, @FullName, @Email, @Phone, @CategoryId, @SuburbId, N'Fixture service', 2, @Description, 220)
      `);
    const id = inserted.recordset[0]?.ApplicationId;
    if (!id) throw new Error("Could not create application fixture.");
    return id;
  });
}
