export const SCHEDULING_TIME_ZONE = "Africa/Johannesburg";
const SAST_OFFSET_MINUTES = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

export type WeeklyHoursEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type GeneratedAvailabilitySlot = {
  startsAt: Date;
  endsAt: Date;
};

export function getWeekdayNumber(year: number, monthIndex: number, day: number): number {
  const weekday = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function generateAvailabilitySlots(
  weeklyHours: readonly WeeklyHoursEntry[],
  now = new Date(),
): GeneratedAvailabilitySlot[] {
  const localToday = new Date(now.getTime() + SAST_OFFSET_MINUTES * 60_000);
  const firstLocalDate = Date.UTC(
    localToday.getUTCFullYear(),
    localToday.getUTCMonth(),
    localToday.getUTCDate(),
  );
  const slots: GeneratedAvailabilitySlot[] = [];

  for (let offset = 0; offset < 30; offset += 1) {
    const localDate = new Date(firstLocalDate + offset * DAY_MS);
    const weekday = getWeekdayNumber(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
    );

    for (const hours of weeklyHours) {
      if (hours.dayOfWeek !== weekday || hours.endTime <= hours.startTime) continue;
      const [startHour, startMinute] = parseTime(hours.startTime);
      const [endHour, endMinute] = parseTime(hours.endTime);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
        const startsAt = new Date(
          firstLocalDate + offset * DAY_MS + minutes * 60_000 - SAST_OFFSET_MINUTES * 60_000,
        );
        if (startsAt.getTime() <= now.getTime()) continue;
        slots.push({ startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000) });
      }
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function parseTime(time: string): [number, number] {
  const [hour = "0", minute = "0"] = time.split(":");
  return [Number(hour), Number(minute)];
}

export function getSastDateKey(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value instanceof Date ? value : new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatSastDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: SCHEDULING_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value instanceof Date ? value : new Date(value));
}

export function formatSastTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: SCHEDULING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(value instanceof Date ? value : new Date(value));
}

export function toSqlUtcDateTime(value: Date): string {
  return value.toISOString().slice(0, 19);
}
