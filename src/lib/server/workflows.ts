import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sql from "mssql/msnodesqlv8";

import { getDbConnection } from "@/lib/db";
import type {
  Application,
  ApplicationStatus,
  RequestStatus,
  ServiceRequest,
  Worker,
} from "@/lib/mock-data";

import { getWorkerById } from "@/lib/server/workers";



type ApplicationRow = {
  ApplicationId: number;
  FullName: string;
  Email: string;
  Phone: string;
  CategorySlug: string;
  MainService: string;
  Suburb: string;
  YearsExperience: number;
  SubmittedAt: Date | string;
  IdentityStatus: "Pending" | "Verified" | "Rejected";
  QualificationStatus: "Verified" | "Pending" | "Not required" | "Rejected";
  ReferenceCount: number;
  Description: string;
  StartingPrice: string | number;
  Status: ApplicationStatus;
};

type RequestRow = {
  RequestId: number;
  PublicId: string;
  Status: RequestStatus;
  ScheduledAt: Date | string;
  CustomerName: string;
  ServiceName: string;
  WorkerSuburb: string;
  ServiceEstimate: string | number;
  TravelFee: string | number;
  TotalPrice: string | number;
  JobNotes: string | null;
};

function mapApplication(row: ApplicationRow): Application {
  const submitted = new Date(row.SubmittedAt);
  return {
    id: String(row.ApplicationId),
    name: row.FullName,
    email: row.Email,
    phone: row.Phone,
    category: row.CategorySlug,
    services: [row.MainService],
    location: row.Suburb,
    years: row.YearsExperience,
    date: submitted.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    idVerified: row.IdentityStatus === "Verified",
    qualification: row.QualificationStatus,
    references: row.ReferenceCount,
    description: row.Description,
    startPrice: Number(row.StartingPrice),
    status: row.Status,
  };
}

function mapRequest(row: RequestRow): ServiceRequest {
  const scheduled = new Date(row.ScheduledAt);
  return {
    id: String(row.RequestId),
    workerId: row.PublicId,
    customer: row.CustomerName,
    service: row.ServiceName,
    date: scheduled.toLocaleDateString("en-ZA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Africa/Johannesburg",
    }),
    time: scheduled.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Johannesburg",
    }),
    scheduledAt: scheduled.toISOString(),
    location: row.WorkerSuburb,
    total: Number(row.TotalPrice),
    ...(row.JobNotes ? { notes: row.JobNotes } : {}),
    status: row.Status,
  };
}

const APPLICATION_QUERY = `
  SELECT a.ApplicationId, a.FullName, a.Email, a.Phone, c.Slug AS CategorySlug,
         a.MainService, s.Name AS Suburb, a.YearsExperience, a.SubmittedAt,
         a.IdentityStatus, a.QualificationStatus, a.ReferenceCount, a.Description,
         a.StartingPrice, a.Status
  FROM dbo.WorkerApplications a
  INNER JOIN dbo.Categories c ON c.CategoryId = a.CategoryId
  INNER JOIN dbo.Suburbs s ON s.SuburbId = a.SuburbId
`;

const REQUEST_QUERY = `
  SELECT r.RequestId, w.PublicId, r.Status, r.ScheduledAt, customer.FullName AS CustomerName,
         ws.ServiceName, suburb.Name AS WorkerSuburb, r.ServiceEstimate, r.TravelFee,
         r.TotalPrice, r.JobNotes
  FROM dbo.ServiceRequests r
  INNER JOIN dbo.Users customer ON customer.UserId = r.CustomerId
  INNER JOIN dbo.Workers w ON w.WorkerId = r.WorkerId
  INNER JOIN dbo.WorkerServices ws ON ws.ServiceId = r.ServiceId
  INNER JOIN dbo.Suburbs suburb ON suburb.SuburbId = w.SuburbId
`;

async function loadApplications(): Promise<Application[]> {
  const pool = await getDbConnection();
  const result = await pool
    .request()
    .query<ApplicationRow>(`${APPLICATION_QUERY} ORDER BY a.SubmittedAt DESC`);
  return result.recordset.map(mapApplication);
}

async function loadRequestsForUser(
  userId: number,
  role: "customer" | "worker" | "admin",
): Promise<ServiceRequest[]> {
  const pool = await getDbConnection();
  const request = pool.request();
  let where = "";
  if (role === "customer") {
    where = "WHERE r.CustomerId = @UserId";
    request.input("UserId", sql.Int, userId);
  } else if (role === "worker") {
    where = "WHERE w.UserId = @UserId";
    request.input("UserId", sql.Int, userId);
  }
  const result = await request.query<RequestRow>(
    `${REQUEST_QUERY} ${where} ORDER BY r.ScheduledAt DESC`,
  );
  return result.recordset.map(mapRequest);
}

export const getWorkspaceData = createServerFn().handler(async () => {
  const { getAuthenticatedUser } = await import("@/lib/server/auth.server");
  const user = await getAuthenticatedUser();
  if (!user) return { applications: [] as Application[], requests: [] as ServiceRequest[] };

  const [applications, requests] = await Promise.all([
    user.role === "admin" ? loadApplications() : Promise.resolve([]),
    loadRequestsForUser(user.userId, user.role),
  ]);
  return { applications, requests };
});

export const getActiveLocations = createServerFn().handler(async () => {
  const pool = await getDbConnection();
  const result = await pool.request().query<{ Name: string }>(`
    SELECT Name FROM dbo.Suburbs WHERE IsActive = 1 ORDER BY Name
  `);
  return result.recordset.map((row) => row.Name);
});

const applicationInput = z.object({
  phone: z.string().trim().min(7).max(20),
  category: z.string().trim().min(1).max(40),
  service: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(60),
  years: z.number().int().min(0).max(60),
  description: z.string().trim().min(10).max(1000),
  startPrice: z.number().min(0).max(1_000_000),
});

export const submitApplication = createServerFn({ method: "POST" })
  .validator(applicationInput)
  .handler(async ({ data }) => {
    const { requireRole } = await import("@/lib/server/auth.server");
    const user = await requireRole("customer");
    const pool = await getDbConnection();
    const existing = await pool
      .request()
      .input("UserId", sql.Int, user.userId)
      .query<{ ApplicationId: number }>(`
        SELECT TOP (1) ApplicationId
        FROM dbo.WorkerApplications
        WHERE ApplicantUserId = @UserId
          AND Status NOT IN (N'Approved', N'Rejected')
      `);
    if (existing.recordset.length) {
      throw new Error("You already have an application under review");
    }

    const inserted = await pool
      .request()
      .input("UserId", sql.Int, user.userId)
      .input("Phone", sql.NVarChar(20), data.phone)
      .input("CategorySlug", sql.NVarChar(40), data.category)
      .input("Service", sql.NVarChar(120), data.service)
      .input("Suburb", sql.NVarChar(60), data.location)
      .input("Years", sql.TinyInt, data.years)
      .input("Description", sql.NVarChar(1000), data.description)
      .input("StartingPrice", sql.Decimal(10, 2), data.startPrice)
      .query<{ ApplicationId: number }>(`
        INSERT dbo.WorkerApplications
          (ApplicantUserId, FullName, Email, Phone, CategoryId, SuburbId, MainService,
           YearsExperience, Description, StartingPrice)
        OUTPUT INSERTED.ApplicationId
        SELECT @UserId, u.FullName, u.Email, @Phone, c.CategoryId, s.SuburbId, @Service,
               @Years, @Description, @StartingPrice
        FROM dbo.Users u
        INNER JOIN dbo.Categories c ON c.Slug = @CategorySlug AND c.IsActive = 1
        INNER JOIN dbo.Suburbs s ON s.Name = @Suburb AND s.IsActive = 1
        WHERE u.UserId = @UserId AND u.IsActive = 1
      `);
    const applicationId = inserted.recordset[0]?.ApplicationId;
    if (!applicationId) throw new Error("Check that the selected category and area are active");

    const result = await pool
      .request()
      .input("ApplicationId", sql.Int, applicationId)
      .query<ApplicationRow>(`${APPLICATION_QUERY} WHERE a.ApplicationId = @ApplicationId`);
    const row = result.recordset[0];
    if (!row) throw new Error("The application was saved but could not be reloaded");
    return mapApplication(row);
  });

const applicationStatusInput = z.object({
  applicationId: z.coerce.number().int().positive(),
  status: z.enum(["Under Review", "Interview Required", "Approved", "Rejected"]),
});

export const setApplicationStatus = createServerFn({ method: "POST" })
  .validator(applicationStatusInput)
  .handler(async ({ data }) => {
    const { requireRole } = await import("@/lib/server/auth.server");
    const admin = await requireRole("admin");
    const pool = await getDbConnection();
    await pool
      .request()
      .input("ApplicationId", sql.Int, data.applicationId)
      .input("AdminId", sql.Int, admin.userId)
      .input("NewStatus", sql.NVarChar(24), data.status)
      .execute("dbo.usp_SetApplicationStatus");
    const result = await pool
      .request()
      .input("ApplicationId", sql.Int, data.applicationId)
      .query<ApplicationRow>(`${APPLICATION_QUERY} WHERE a.ApplicationId = @ApplicationId`);
    const row = result.recordset[0];
    if (!row) throw new Error("The application could not be reloaded");
    return mapApplication(row);
  });

export type AvailableSlot = { startsAt: string; endsAt: string };

export const getAvailableSlots = createServerFn()
  .validator((workerPublicId: string) => workerPublicId)
  .handler(async ({ data: workerPublicId }): Promise<AvailableSlot[]> => {
    const pool = await getDbConnection();
    const result = await pool
      .request()
      .input("PublicId", sql.NVarChar(40), workerPublicId)
      .query<{ StartsAt: Date | string; EndsAt: Date | string }>(`
        SELECT a.StartsAt, a.EndsAt
        FROM dbo.AvailabilitySlots a
        INNER JOIN dbo.Workers w ON w.WorkerId = a.WorkerId
        WHERE w.PublicId = @PublicId AND w.ListingStatus = N'Live'
          AND a.SlotStatus = N'Available' AND a.StartsAt > SYSUTCDATETIME()
        ORDER BY a.StartsAt
      `);
    return result.recordset.map((slot) => ({
      startsAt: new Date(slot.StartsAt).toISOString(),
      endsAt: new Date(slot.EndsAt).toISOString(),
    }));
  });

const createRequestInput = z.object({
  workerPublicId: z.string().trim().min(1).max(40),
  service: z.string().trim().min(1).max(120),
  startsAt: z.string().datetime(),
  notes: z.string().trim().max(500),
});

export const createServiceRequest = createServerFn({ method: "POST" })
  .validator(createRequestInput)
  .handler(async ({ data }) => {
    const { requireRole } = await import("@/lib/server/auth.server");
    const customer = await requireRole("customer");
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const slot = await new sql.Request(transaction)
        .input("PublicId", sql.NVarChar(40), data.workerPublicId)
        .input("Service", sql.NVarChar(120), data.service)
        .input("StartsAt", sql.DateTime2, new Date(data.startsAt))
        .query<{
          SlotId: number;
          WorkerId: number;
          ServiceId: number;
          StartingPrice: string | number;
          TravelFee: string | number;
        }>(`
          SELECT a.SlotId, w.WorkerId, ws.ServiceId, ws.StartingPrice, w.TravelFee
          FROM dbo.AvailabilitySlots a WITH (UPDLOCK, ROWLOCK)
          INNER JOIN dbo.Workers w ON w.WorkerId = a.WorkerId
          INNER JOIN dbo.WorkerServices ws ON ws.WorkerId = w.WorkerId
          WHERE w.PublicId = @PublicId AND w.ListingStatus = N'Live'
            AND ws.ServiceName = @Service AND ws.IsActive = 1
            AND a.StartsAt = @StartsAt AND a.SlotStatus = N'Available'
        `);
      const selectedSlot = slot.recordset[0];
      if (!selectedSlot) throw new Error("That time is no longer available");

      const result = await new sql.Request(transaction)
        .input("CustomerId", sql.Int, customer.userId)
        .input("WorkerId", sql.Int, selectedSlot.WorkerId)
        .input("ServiceId", sql.Int, selectedSlot.ServiceId)
        .input("SlotId", sql.Int, selectedSlot.SlotId)
        .input("Notes", sql.NVarChar(500), data.notes || null)
        .input("Estimate", sql.Decimal(10, 2), Number(selectedSlot.StartingPrice))
        .input("TravelFee", sql.Decimal(10, 2), Number(selectedSlot.TravelFee))
        .input("StartsAt", sql.DateTime2, new Date(data.startsAt))
        .query<{ RequestId: number }>(`
          INSERT dbo.ServiceRequests
            (CustomerId, WorkerId, ServiceId, SlotId, JobNotes, ServiceEstimate,
             TravelFee, ScheduledAt)
          OUTPUT INSERTED.RequestId
          VALUES
            (@CustomerId, @WorkerId, @ServiceId, @SlotId, @Notes, @Estimate,
             @TravelFee, @StartsAt)
        `);
      await new sql.Request(transaction)
        .input("SlotId", sql.Int, selectedSlot.SlotId)
        .query(`UPDATE dbo.AvailabilitySlots SET SlotStatus = N'Booked' WHERE SlotId = @SlotId`);
      await transaction.commit();

      const requestId = result.recordset[0]?.RequestId;
      if (!requestId) throw new Error("The booking was saved but could not be reloaded");
      return loadRequestById(requestId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  });

async function loadRequestById(requestId: number): Promise<ServiceRequest> {
  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input("RequestId", sql.Int, requestId)
    .query<RequestRow>(`${REQUEST_QUERY} WHERE r.RequestId = @RequestId`);
  const row = result.recordset[0];
  if (!row) throw new Error("The booking could not be reloaded");
  return mapRequest(row);
}

const updateRequestStatusInput = z.object({
  requestId: z.coerce.number().int().positive(),
  status: z.enum(["Accepted", "Declined", "Completed", "Cancelled"]),
});

export const updateRequestStatus = createServerFn({ method: "POST" })
  .validator(updateRequestStatusInput)
  .handler(async ({ data }) => {
    const { requireRole } = await import("@/lib/server/auth.server");
    const user = await requireRole("customer", "worker");
    const pool = await getDbConnection();
    const owned = await pool
      .request()
      .input("RequestId", sql.Int, data.requestId)
      .input("UserId", sql.Int, user.userId)
      .input("UserRole", sql.NVarChar(10), user.role === "customer" ? "Customer" : "Worker")
      .query<{ RequestId: number }>(`
        SELECT r.RequestId
        FROM dbo.ServiceRequests r
        LEFT JOIN dbo.Workers w ON w.WorkerId = r.WorkerId
        WHERE r.RequestId = @RequestId
          AND ((@UserRole = N'Customer' AND r.CustomerId = @UserId)
            OR (@UserRole = N'Worker' AND w.UserId = @UserId))
      `);
    if (!owned.recordset.length) throw new Error("You cannot update this booking");
    if (user.role === "worker" && data.status === "Cancelled") {
      throw new Error("Workers cannot cancel a booking from this screen");
    }
    if (user.role === "customer" && data.status !== "Cancelled") {
      throw new Error("Customers can only cancel their own booking");
    }

    await pool
      .request()
      .input("RequestId", sql.Int, data.requestId)
      .input("NewStatus", sql.NVarChar(10), data.status)
      .input("ChangedByUserId", sql.Int, user.userId)
      .execute("dbo.usp_SetServiceRequestStatus");
    return loadRequestById(data.requestId);
  });

const updateWorkerInput = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(100),
  location: z.string().trim().min(1).max(60),
  years: z.number().int().min(0).max(60),
  startPrice: z.number().min(0).max(1_000_000),
  travelFee: z.number().min(0).max(1_000_000),
  bio: z.string().trim().max(500),
  services: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  schedule: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(1).max(7),
        startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      }),
    )
    .max(7)
    .superRefine((days, context) => {
      const seenDays = new Set<number>();
      days.forEach((day, index) => {
        if (seenDays.has(day.dayOfWeek)) {
          context.addIssue({ code: "custom", path: [index, "dayOfWeek"], message: "Choose each weekday only once" });
        }
        seenDays.add(day.dayOfWeek);
        const startMinutes = Number(day.startTime.slice(0, 2)) * 60 + Number(day.startTime.slice(3, 5));
        const endMinutes = Number(day.endTime.slice(0, 2)) * 60 + Number(day.endTime.slice(3, 5));
        if (endMinutes - startMinutes < 60) {
          context.addIssue({ code: "custom", path: [index, "endTime"], message: "Availability must include at least one full hour" });
        }
      });
    }),
});

export const updateWorkerProfile = createServerFn({ method: "POST" })
  .validator(updateWorkerInput)
  .handler(async ({ data }) => {
    const { requireRole } = await import("@/lib/server/auth.server");
    const worker = await requireRole("worker");
    if (!worker.workerPublicId || worker.workerPublicId !== data.id) {
      throw new Error("You can only update your own worker profile");
    }

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const suburb = await new sql.Request(transaction)
        .input("Name", sql.NVarChar(60), data.location)
        .query<{ SuburbId: number }>(`
          SELECT SuburbId FROM dbo.Suburbs WHERE Name = @Name AND IsActive = 1
        `);
      const suburbId = suburb.recordset[0]?.SuburbId;
      if (!suburbId) throw new Error("Choose an active suburb");

      const workerRecord = await new sql.Request(transaction)
        .input("UserId", sql.Int, worker.userId)
        .query<{ WorkerId: number }>(`SELECT WorkerId FROM dbo.Workers WHERE UserId = @UserId`);
      const workerId = workerRecord.recordset[0]?.WorkerId;
      if (!workerId) throw new Error("Your worker profile could not be found");

      await new sql.Request(transaction)
        .input("UserId", sql.Int, worker.userId)
        .input("Name", sql.NVarChar(100), data.name)
        .input("SuburbId", sql.Int, suburbId)
        .query(`
          UPDATE dbo.Users SET FullName = @Name, SuburbId = @SuburbId,
            UpdatedAt = SYSUTCDATETIME() WHERE UserId = @UserId
        `);
      await new sql.Request(transaction)
        .input("UserId", sql.Int, worker.userId)
        .input("SuburbId", sql.Int, suburbId)
        .input("Years", sql.TinyInt, data.years)
        .input("StartingPrice", sql.Decimal(10, 2), data.startPrice)
        .input("TravelFee", sql.Decimal(10, 2), data.travelFee)
        .input("About", sql.NVarChar(500), data.bio)
        .query(`
          UPDATE dbo.Workers SET SuburbId = @SuburbId, YearsExperience = @Years,
            StartingPrice = @StartingPrice, TravelFee = @TravelFee, About = @About,
            UpdatedAt = SYSUTCDATETIME()
          WHERE UserId = @UserId
        `);

      await new sql.Request(transaction)
        .input("UserId", sql.Int, worker.userId)
        .query(`
          UPDATE ws SET IsActive = 0
          FROM dbo.WorkerServices ws
          INNER JOIN dbo.Workers w ON w.WorkerId = ws.WorkerId
          WHERE w.UserId = @UserId
        `);

      for (const service of [...new Set(data.services)]) {
        const serviceRequest = new sql.Request(transaction)
          .input("UserId", sql.Int, worker.userId)
          .input("ServiceName", sql.NVarChar(120), service)
          .input("StartingPrice", sql.Decimal(10, 2), data.startPrice);
        await serviceRequest.query(`
          IF EXISTS (
            SELECT 1 FROM dbo.WorkerServices ws
            INNER JOIN dbo.Workers w ON w.WorkerId = ws.WorkerId
            WHERE w.UserId = @UserId AND ws.ServiceName = @ServiceName
          )
            UPDATE ws SET IsActive = 1, StartingPrice = @StartingPrice
            FROM dbo.WorkerServices ws
            INNER JOIN dbo.Workers w ON w.WorkerId = ws.WorkerId
            WHERE w.UserId = @UserId AND ws.ServiceName = @ServiceName;
          ELSE
            INSERT dbo.WorkerServices (WorkerId, ServiceName, StartingPrice)
            SELECT w.WorkerId, @ServiceName, @StartingPrice
            FROM dbo.Workers w WHERE w.UserId = @UserId;
        `);
      }

      await new sql.Request(transaction)
        .input("WorkerId", sql.Int, workerId)
        .query(`DELETE FROM dbo.WeeklyHours WHERE WorkerId = @WorkerId`);
      for (const day of data.schedule) {
        await new sql.Request(transaction)
          .input("WorkerId", sql.Int, workerId)
          .input("DayOfWeek", sql.TinyInt, day.dayOfWeek)
          .input("StartTime", sql.VarChar(5), day.startTime)
          .input("EndTime", sql.VarChar(5), day.endTime)
          .query(`
            INSERT dbo.WeeklyHours (WorkerId, DayOfWeek, StartTime, EndTime, IsAvailable)
            VALUES (@WorkerId, @DayOfWeek, CONVERT(TIME(0), @StartTime), CONVERT(TIME(0), @EndTime), 1)
          `);
      }

      await new sql.Request(transaction)
        .input("WorkerId", sql.Int, workerId)
        .query(`
          CREATE TABLE #GeneratedAvailability (
            StartsAt DATETIME2(0) NOT NULL PRIMARY KEY,
            EndsAt DATETIME2(0) NOT NULL
          );

          DECLARE @LocalToday DATE = CONVERT(
            DATE,
            SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time'
          );

          ;WITH DayNumbers AS (
            SELECT TOP (30)
              CONVERT(INT, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1) AS DayOffset
            FROM sys.all_objects
          ),
          WorkDates AS (
            SELECT DATEADD(DAY, DayOffset, @LocalToday) AS WorkDate
            FROM DayNumbers
          ),
          HourOffsets AS (
            SELECT TOP (24)
              CONVERT(INT, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1) AS HourOffset
            FROM sys.all_objects
          ),
          LocalSlots AS (
            SELECT DATEADD(
              MINUTE,
              DATEDIFF(MINUTE, CONVERT(TIME(0), '00:00'), wh.StartTime) + hours.HourOffset * 60,
              CONVERT(DATETIME2(0), dates.WorkDate)
            ) AS LocalStart
            FROM WorkDates dates
            INNER JOIN dbo.WeeklyHours wh
              ON wh.WorkerId = @WorkerId
             AND wh.IsAvailable = 1
             AND wh.DayOfWeek = CONVERT(TINYINT, (DATEDIFF(DAY, CONVERT(DATE, '19000101'), dates.WorkDate) % 7) + 1)
            CROSS JOIN HourOffsets hours
            WHERE hours.HourOffset < DATEDIFF(MINUTE, wh.StartTime, wh.EndTime) / 60
          ),
          UtcSlots AS (
            SELECT CONVERT(
              DATETIME2(0),
              (LocalStart AT TIME ZONE 'South Africa Standard Time') AT TIME ZONE 'UTC'
            ) AS StartsAt
            FROM LocalSlots
          )
          INSERT #GeneratedAvailability (StartsAt, EndsAt)
          SELECT StartsAt, DATEADD(HOUR, 1, StartsAt)
          FROM UtcSlots
          WHERE StartsAt > SYSUTCDATETIME();

          UPDATE a
          SET SlotStatus = CASE WHEN generated.StartsAt IS NULL THEN N'Blocked' ELSE N'Available' END,
              EndsAt = COALESCE(generated.EndsAt, a.EndsAt)
          FROM dbo.AvailabilitySlots a
          LEFT JOIN #GeneratedAvailability generated ON generated.StartsAt = a.StartsAt
          WHERE a.WorkerId = @WorkerId
            AND a.SlotStatus IN (N'Available', N'Blocked')
            AND a.StartsAt > SYSUTCDATETIME();

          INSERT dbo.AvailabilitySlots (WorkerId, StartsAt, EndsAt, SlotStatus)
          SELECT @WorkerId, generated.StartsAt, generated.EndsAt, N'Available'
          FROM #GeneratedAvailability generated
          WHERE NOT EXISTS (
            SELECT 1 FROM dbo.AvailabilitySlots a
            WHERE a.WorkerId = @WorkerId AND a.StartsAt = generated.StartsAt
          );
        `);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    const updated = await getWorkerById({ data: data.id });
    if (!updated) throw new Error("The updated profile could not be reloaded");
    return updated satisfies Worker;
  });

export const removeWorker = createServerFn({ method: "POST" })
  .validator((workerPublicId: string) => workerPublicId)
  .handler(async ({ data: workerPublicId }) => {
    const { requireRole } = await import("@/lib/server/auth.server");
    await requireRole("admin");
    const pool = await getDbConnection();
    const result = await pool
      .request()
      .input("PublicId", sql.NVarChar(40), workerPublicId)
      .query(`
        UPDATE dbo.Workers SET ListingStatus = N'Removed', UpdatedAt = SYSUTCDATETIME()
        WHERE PublicId = @PublicId AND ListingStatus = N'Live'
      `);
    if (!result.rowsAffected[0]) throw new Error("Worker was not found or is already removed");
    return workerPublicId;
  });
