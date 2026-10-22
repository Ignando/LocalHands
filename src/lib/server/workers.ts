import { createServerFn } from "@tanstack/react-start";
import sql from "mssql/msnodesqlv8";

import { getDbConnection } from "@/lib/db";
import type { Day, Review, Worker } from "@/lib/mock-data";

// SQL Server DayOfWeek stored as 1=Mon … 7=Sun (matching the seed script comment).
const DOW_TO_DAY: Record<number, Day> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

// TIME(0) columns arrive from mssql as "HH:mm:ss" strings — trim to "HH:mm".
function trimTime(t: unknown): string {
  return String(t).slice(0, 5);
}

type WorkerRow = {
  WorkerId: number;
  PublicId: string;
  FullName: string;
  CategorySlug: string;
  Suburb: string;
  YearsExperience: number;
  StartingPrice: string | number;
  TravelFee: string | number;
  About: string | null;
  PhotoUrl: string | null;
  QualifiedTitle: string | null;
  IsIdentityVerified: boolean | number;
  AvailabilityStatus: "Available" | "NextWeek";
  IsExperienceVerified: boolean | number;
  IsQualified: boolean | number;
  RatingAverage: string | number;
  ReviewCount: number;
  JobsCompleted: number;
};

type ServiceRow = { WorkerId: number; ServiceName: string };
type HoursRow = { WorkerId: number; DayOfWeek: number; StartTime: unknown; EndTime: unknown };

function buildBadges(row: WorkerRow): string[] {
  const badges: string[] = [];
  if (row.IsIdentityVerified) badges.push("Identity Verified");
  if (row.IsExperienceVerified) badges.push("Experience Verified");
  if (row.IsQualified) badges.push("Qualification Verified");
  if (row.ReviewCount > 0) badges.push("Customer Rated");
  return badges;
}

function mapRow(
  row: WorkerRow,
  services: string[],
  schedule: Partial<Record<Day, [string, string]>>,
): Worker {
  return {
    id: row.PublicId,
    name: row.FullName,
    category: row.CategorySlug,
    services,
    location: row.Suburb,
    years: row.YearsExperience,
    startPrice: Number(row.StartingPrice),
    rating: Number(row.RatingAverage),
    reviews: row.ReviewCount,
    jobs: row.JobsCompleted,
    verified: Boolean(row.IsIdentityVerified),
    availability: row.AvailabilityStatus,
    ...(row.QualifiedTitle ? { qualified: row.QualifiedTitle } : {}),
    badges: buildBadges(row),
    bio: row.About ?? "",
    ...(row.PhotoUrl ? { photo: row.PhotoUrl } : {}),
    schedule,
    travelFee: Number(row.TravelFee),
  };
}

// ─── Fetch all live workers ───────────────────────────────────────────────────

export const getWorkers = createServerFn().handler(async (): Promise<Worker[]> => {
  const pool = await getDbConnection();

  const [workersRes, servicesRes, hoursRes] = await Promise.all([
    pool.request().query<WorkerRow>(
      `SELECT * FROM dbo.vw_WorkerSummary WHERE ListingStatus = 'Live' ORDER BY JobsCompleted DESC`,
    ),
    pool.request().query<ServiceRow>(`
      SELECT ws.WorkerId, ws.ServiceName
      FROM dbo.WorkerServices ws
      INNER JOIN dbo.Workers w ON w.WorkerId = ws.WorkerId
      WHERE w.ListingStatus = 'Live' AND ws.IsActive = 1
      ORDER BY ws.ServiceId
    `),
    pool.request().query<HoursRow>(`
      SELECT wh.WorkerId, wh.DayOfWeek, wh.StartTime, wh.EndTime
      FROM dbo.WeeklyHours wh
      INNER JOIN dbo.Workers w ON w.WorkerId = wh.WorkerId
      WHERE w.ListingStatus = 'Live'
    `),
  ]);

  // Group services and hours by WorkerId
  const serviceMap = new Map<number, string[]>();
  for (const s of servicesRes.recordset) {
    const arr = serviceMap.get(s.WorkerId) ?? [];
    arr.push(s.ServiceName);
    serviceMap.set(s.WorkerId, arr);
  }

  const scheduleMap = new Map<number, Partial<Record<Day, [string, string]>>>();
  for (const h of hoursRes.recordset) {
    const day = DOW_TO_DAY[h.DayOfWeek];
    if (!day) continue;
    const sched = scheduleMap.get(h.WorkerId) ?? {};
    sched[day] = [trimTime(h.StartTime), trimTime(h.EndTime)];
    scheduleMap.set(h.WorkerId, sched);
  }

  return workersRes.recordset.map((row) =>
    mapRow(
      row,
      serviceMap.get(row.WorkerId) ?? [],
      scheduleMap.get(row.WorkerId) ?? {},
    ),
  );
});

// ─── Fetch a single worker by PublicId ────────────────────────────────────────

export const getWorkerById = createServerFn()
  .validator((id: string) => id)
  .handler(async ({ data: publicId }): Promise<Worker | null> => {
    const pool = await getDbConnection();

    const workerRes = await pool
      .request()
      .input("PublicId", sql.NVarChar(40), publicId)
      .query<WorkerRow>(
        `SELECT * FROM dbo.vw_WorkerSummary WHERE PublicId = @PublicId AND ListingStatus = 'Live'`,
      );

    const row = workerRes.recordset[0];
    if (!row) return null;

    const [servicesRes, hoursRes] = await Promise.all([
      pool
        .request()
        .input("WorkerId", sql.Int, row.WorkerId)
        .query<{ ServiceName: string }>(
          `SELECT ServiceName FROM dbo.WorkerServices WHERE WorkerId = @WorkerId AND IsActive = 1 ORDER BY ServiceId`,
        ),
      pool
        .request()
        .input("WorkerId", sql.Int, row.WorkerId)
        .query<HoursRow>(
          `SELECT DayOfWeek, StartTime, EndTime FROM dbo.WeeklyHours WHERE WorkerId = @WorkerId`,
        ),
    ]);

    const schedule: Partial<Record<Day, [string, string]>> = {};
    for (const h of hoursRes.recordset) {
      const day = DOW_TO_DAY[h.DayOfWeek];
      if (day) schedule[day] = [trimTime(h.StartTime), trimTime(h.EndTime)];
    }

    return mapRow(row, servicesRes.recordset.map((s) => s.ServiceName), schedule);
  });

type ReviewRow = {
  ReviewId: number;
  Author: string;
  Rating: number;
  CreatedAt: Date | string;
  ServiceName: string;
  Comment: string | null;
};

function mapReview(row: ReviewRow): Review {
  const date = new Date(row.CreatedAt);
  return {
    id: String(row.ReviewId),
    author: row.Author,
    rating: Number(row.Rating),
    date: date.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    service: row.ServiceName,
    text: row.Comment ?? "",
  };
}

const REVIEW_QUERY = `
  SELECT r.ReviewId, u.FullName AS Author, r.Rating, r.CreatedAt,
         ws.ServiceName, r.Comment
  FROM dbo.Reviews r
  INNER JOIN dbo.Users u ON u.UserId = r.CustomerId
  INNER JOIN dbo.ServiceRequests sr ON sr.RequestId = r.RequestId
  INNER JOIN dbo.WorkerServices ws ON ws.ServiceId = sr.ServiceId
  INNER JOIN dbo.Workers w ON w.WorkerId = r.WorkerId
  WHERE r.IsVisible = 1 AND w.ListingStatus = 'Live'
`;

export const getFeaturedReviews = createServerFn().handler(async (): Promise<Review[]> => {
  const pool = await getDbConnection();
  const result = await pool.request().query<ReviewRow>(
    `${REVIEW_QUERY} ORDER BY r.CreatedAt DESC OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY`,
  );
  return result.recordset.map(mapReview);
});

export const getReviewsForWorker = createServerFn()
  .validator((id: string) => id)
  .handler(async ({ data: publicId }): Promise<Review[]> => {
    const pool = await getDbConnection();
    const result = await pool
      .request()
      .input("PublicId", sql.NVarChar(40), publicId)
      .query<ReviewRow>(
        `${REVIEW_QUERY} AND w.PublicId = @PublicId ORDER BY r.CreatedAt DESC OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY`,
      );
    return result.recordset.map(mapReview);
  });
