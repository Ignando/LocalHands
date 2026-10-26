import { describe, expect, it } from "vitest";
import {
  formatSastDate,
  formatSastTime,
  generateAvailabilitySlots,
  getSastDateKey,
  getWeekdayNumber,
  type WeeklyHoursEntry,
} from "@/lib/scheduling";

const allWeekdays: WeeklyHoursEntry[] = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
  { dayOfWeek: 2, startTime: "09:00", endTime: "11:00" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
  { dayOfWeek: 4, startTime: "09:00", endTime: "11:00" },
  { dayOfWeek: 5, startTime: "09:00", endTime: "11:00" },
  { dayOfWeek: 6, startTime: "09:00", endTime: "11:00" },
  { dayOfWeek: 7, startTime: "09:00", endTime: "11:00" },
];

describe("weekly availability scheduling", () => {
  it("maps Monday through Sunday to 1 through 7", () => {
    const monday = Date.UTC(2026, 9, 26);
    expect(Array.from({ length: 7 }, (_, index) => getWeekdayNumber(2026, 9, 26 + index))).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(new Date(monday).getUTCDay()).toBe(1);
  });

  it("generates one-hour future slots in South African local working hours", () => {
    const now = new Date("2026-10-31T12:30:00.000Z");
    const slots = generateAvailabilitySlots(allWeekdays, now);
    const sunday = slots.filter((slot) => getSastDateKey(slot.startsAt) === "2026-11-01");

    expect(
      sunday.map(({ startsAt, endsAt }) => [startsAt.toISOString(), endsAt.toISOString()]),
    ).toEqual([
      ["2026-11-01T07:00:00.000Z", "2026-11-01T08:00:00.000Z"],
      ["2026-11-01T08:00:00.000Z", "2026-11-01T09:00:00.000Z"],
    ]);
  });

  it("returns the same unique generated slots when run repeatedly", () => {
    const now = new Date("2026-10-31T12:30:00.000Z");
    const firstRun = generateAvailabilitySlots(allWeekdays, now);
    const secondRun = generateAvailabilitySlots(allWeekdays, now);
    const starts = firstRun.map(({ startsAt }) => startsAt.toISOString());

    expect(secondRun.map(({ startsAt }) => startsAt.toISOString())).toEqual(starts);
    expect(new Set(starts).size).toBe(starts.length);
  });

  it("extends a 30-day horizon from the current South African date", () => {
    const now = new Date("2026-10-31T12:30:00.000Z");
    const slots = generateAvailabilitySlots(allWeekdays, now);
    const dates = [...new Set(slots.map(({ startsAt }) => getSastDateKey(startsAt)))];

    expect(dates[0]).toBe("2026-11-01");
    expect(dates.at(-1)).toBe("2026-11-29");
    expect(dates).toHaveLength(29);
  });

  it("moves the rolling horizon forward when the old horizon is nearly expired", () => {
    const previousHorizon = generateAvailabilitySlots(
      allWeekdays,
      new Date("2026-10-31T12:30:00.000Z"),
    );
    const extendedHorizon = generateAvailabilitySlots(
      allWeekdays,
      new Date("2026-11-27T12:30:00.000Z"),
    );
    const oldLastDate = previousHorizon.at(-1)?.startsAt;
    const newLastDate = extendedHorizon.at(-1)?.startsAt;

    expect(oldLastDate).toBeDefined();
    expect(newLastDate).toBeDefined();
    if (!oldLastDate || !newLastDate) throw new Error("Expected generated future slots");
    expect(newLastDate.getTime()).toBeGreaterThan(oldLastDate.getTime());
    expect(getSastDateKey(newLastDate)).toBe("2026-12-26");
  });

  it("excludes slots whose start is at or before the current instant", () => {
    const now = new Date("2026-10-31T07:00:00.000Z");
    const saturdayHours = [{ dayOfWeek: 6, startTime: "09:00", endTime: "12:00" }];
    const slots = generateAvailabilitySlots(saturdayHours, now);

    expect(
      slots
        .filter(({ startsAt }) => getSastDateKey(startsAt) === "2026-10-31")
        .map(({ startsAt }) => startsAt.toISOString()),
    ).toEqual(["2026-10-31T08:00:00.000Z", "2026-10-31T09:00:00.000Z"]);
    expect(slots.every(({ startsAt }) => startsAt.getTime() > now.getTime())).toBe(true);
  });

  it("generates future weekday slots from seeded-style worker hours", () => {
    const weekdayHours = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: "07:00",
      endTime: "17:00",
    }));
    const now = new Date("2026-10-25T12:00:00.000Z");
    const slots = generateAvailabilitySlots(weekdayHours, now);
    const monday = slots.filter((slot) => getSastDateKey(slot.startsAt) === "2026-10-26");

    expect(monday[0]?.startsAt.toISOString()).toBe("2026-10-26T05:00:00.000Z");
    expect(monday).toHaveLength(10);
    expect(slots.every(({ startsAt }) => startsAt.getTime() > now.getTime())).toBe(true);
  });

  it("generates full one-hour slots from non-hour-aligned weekly hours", () => {
    const sundayHours = [{ dayOfWeek: 7, startTime: "09:30", endTime: "12:00" }];
    const slots = generateAvailabilitySlots(sundayHours, new Date("2026-10-30T12:00:00.000Z"));
    const sunday = slots.filter((slot) => getSastDateKey(slot.startsAt) === "2026-11-01");

    expect(sunday.map(({ startsAt, endsAt }) => [startsAt.toISOString(), endsAt.toISOString()])).toEqual([
      ["2026-11-01T07:30:00.000Z", "2026-11-01T08:30:00.000Z"],
      ["2026-11-01T08:30:00.000Z", "2026-11-01T09:30:00.000Z"],
    ]);
  });

  it("does not create slots for invalid or shorter-than-one-hour intervals", () => {
    const weeklyHours = [
      { dayOfWeek: 7, startTime: "10:00", endTime: "09:00" },
      { dayOfWeek: 7, startTime: "09:00", endTime: "09:59" },
    ];

    expect(generateAvailabilitySlots(weeklyHours, new Date("2026-10-30T12:00:00.000Z"))).toEqual([]);
  });

  it("formats labels for South Africa independently of the browser timezone", () => {
    const slot = "2026-11-02T07:00:00.000Z";

    expect(formatSastTime(slot)).toBe("09:00");
    expect(formatSastDate(slot)).toContain("2");
    expect(formatSastDate(slot)).toContain("November");
    expect(getSastDateKey(slot)).toBe("2026-11-02");
  });

  it("handles year boundaries and leap day using calendar dates", () => {
    const weeklyHours = [{ dayOfWeek: 4, startTime: "09:00", endTime: "10:00" }];
    const slots = generateAvailabilitySlots(weeklyHours, new Date("2024-02-28T12:00:00.000Z"));
    const dates = slots.map(({ startsAt }) => getSastDateKey(startsAt));

    expect(dates).toContain("2024-02-29");
    expect(dates).toContain("2024-03-07");
  });
});
