import { test, expect } from "../support/test-fixtures";
import { calculateHourlyBookingPrice } from "../../src/lib/pricing";
import { createBookingFixture, withTestDatabase } from "../support/test-database";

test("DB-B — persisted total uses selected service rate times hours plus one callout fee", async () => {
  const fixture = await createBookingFixture({
    hours: 2,
    service: "premium",
    notes: "DB-B pricing fixture",
  });
  const record = await withTestDatabase(async (pool) =>
    pool.request().input("RequestId", fixture.requestId).query<{
      ServiceRate: number;
      Hours: number;
      ServiceEstimate: number;
      TravelFee: number;
      TotalPrice: number;
    }>(`
      SELECT ws.StartingPrice AS ServiceRate,
        (SELECT COUNT(*) FROM dbo.ServiceRequestSlots rs WHERE rs.RequestId = r.RequestId) AS Hours,
        r.ServiceEstimate, r.TravelFee, r.TotalPrice
      FROM dbo.ServiceRequests r INNER JOIN dbo.WorkerServices ws ON ws.ServiceId = r.ServiceId
      WHERE r.RequestId = @RequestId
    `),
  );
  const row = record.recordset[0];
  expect(row).toBeTruthy();
  const expected = calculateHourlyBookingPrice(
    Number(row?.ServiceRate),
    Number(row?.Hours),
    Number(row?.TravelFee),
  );
  expect(Number(row?.ServiceEstimate)).toBe(expected.serviceSubtotal);
  expect(Number(row?.TotalPrice)).toBe(expected.total);
  expect(Number(row?.TravelFee)).toBe(fixture.calloutFee);
});
