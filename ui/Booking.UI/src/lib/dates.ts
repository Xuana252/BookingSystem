// Mirrors ReservationRuleSettings' defaults (Booking.Api/appsettings.json: 08:00-18:00) — not
// fetched from the Api, since nothing exposes business-hours config over HTTP yet. Worth
// revisiting if that setting ever becomes configurable per-deployment rather than a fixed
// default. END is exclusive (18 means the last bookable hour is 17:00-18:00).
export const BUSINESS_HOURS_START = 8;
export const BUSINESS_HOURS_END = 18;

export function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
}

// HH:mm, the format <input type="time"> reads/writes/min/max against.
export function hourToTimeValue(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export const BUSINESS_HOURS_START_TIME = hourToTimeValue(BUSINESS_HOURS_START);
export const BUSINESS_HOURS_END_TIME = hourToTimeValue(BUSINESS_HOURS_END);

// yyyy-mm-dd, the format <input type="date"> reads/writes — in the browser's local calendar
// day, not UTC (matters right around midnight).
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// dateValue/timeValue are toDateInputValue/hourToTimeValue-shaped strings ("yyyy-mm-dd" and
// "HH:mm"). Builds the Date in the browser's local timezone (like the old datetime-local inputs
// did) so .toISOString() produces the correct UTC instant for the Api — BookingRuleEngine
// re-interprets it in the configured business timezone.
export function combineDateAndTime(dateValue: string, timeValue: string): Date {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
