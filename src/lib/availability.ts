export const BOOKING_TIME_ZONE = "Africa/Johannesburg";

export type SlotDate = { startsAt: string; endsAt: string };
export type EditableAvailabilityDay = { day: string; enabled: boolean; start: string; end: string };

export function validateWeeklyAvailability(days: EditableAvailabilityDay[]): string | null {
  for (const day of days) {
    if (!day.enabled) continue;
    if (!day.start || !day.end) return `${day.day} is enabled: enter both a start and end time.`;
    const [startHour, startMinute] = day.start.split(":").map(Number);
    const [endHour, endMinute] = day.end.split(":").map(Number);
    const startMinutes = startHour! * 60 + startMinute!;
    const endMinutes = endHour! * 60 + endMinute!;
    if (endMinutes <= startMinutes) return `${day.day}: end time must be later than start time.`;
    if (endMinutes - startMinutes < 60) return `${day.day}: availability must include at least one full hour.`;
  }
  return null;
}

export function getLocalDateKey(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOKING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatBookingDate(value: string): string {
  const date = new Date(value);
  const weekday = date.toLocaleDateString("en-ZA", {
    weekday: "short",
    timeZone: BOOKING_TIME_ZONE,
  });
  const calendarDate = date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    timeZone: BOOKING_TIME_ZONE,
  });
  return `${weekday.replace(/,$/, "")} · ${calendarDate}`;
}

export function formatBookingTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BOOKING_TIME_ZONE,
  });
}

export function groupSlotsByLocalDate<T extends SlotDate>(slots: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const slot of slots) {
    const key = getLocalDateKey(slot.startsAt);
    grouped.set(key, [...(grouped.get(key) ?? []), slot]);
  }
  return grouped;
}
