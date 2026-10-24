import { describe, expect, it } from "vitest";

import {
  formatBookingDate,
  formatBookingTime,
  getLocalDateKey,
  groupSlotsByLocalDate,
  validateWeeklyAvailability,
} from "@/lib/availability";
import { calculateHourlyBookingPrice } from "@/lib/pricing";

describe("South African booking dates", () => {
  it("uses the South African date when a UTC slot crosses midnight", () => {
    const startsAt = "2026-10-31T22:00:00.000Z";

    expect(getLocalDateKey(startsAt)).toBe("2026-11-01");
    expect(formatBookingDate(startsAt)).toBe("Sun · 01 Nov");
    expect(formatBookingTime(startsAt)).toBe("00:00");
  });

  it("groups hourly slots by local calendar date across a month boundary", () => {
    const slots = [
      { startsAt: "2026-10-31T21:00:00.000Z", endsAt: "2026-10-31T22:00:00.000Z" },
      { startsAt: "2026-10-31T22:00:00.000Z", endsAt: "2026-10-31T23:00:00.000Z" },
      { startsAt: "2026-11-01T22:00:00.000Z", endsAt: "2026-11-01T23:00:00.000Z" },
    ];

    expect([...groupSlotsByLocalDate(slots).keys()]).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(groupSlotsByLocalDate(slots).get("2026-11-01")).toHaveLength(1);
  });

  it("validates each enabled weekday and ignores disabled weekday times", () => {
    expect(validateWeeklyAvailability([
      { day: "Mon", enabled: true, start: "09:00", end: "11:00" },
      { day: "Tue", enabled: true, start: "", end: "" },
    ])).toContain("Tue is enabled");
    expect(validateWeeklyAvailability([
      { day: "Mon", enabled: true, start: "09:00", end: "09:00" },
    ])).toContain("later than start time");
    expect(validateWeeklyAvailability([
      { day: "Mon", enabled: false, start: "", end: "" },
    ])).toBeNull();
  });

  it("charges the callout once for a multi-hour booking", () => {
    expect(calculateHourlyBookingPrice(180, 2, 50)).toEqual({
      serviceSubtotal: 360,
      calloutFee: 50,
      total: 410,
    });
  });
});
