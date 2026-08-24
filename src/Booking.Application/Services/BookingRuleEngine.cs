using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class BookingRuleEngine(ReservationRuleSettings settings, BusinessSettings businessSettings) : IBookingRuleEngine
{
    public void Validate(Reservation candidate, IReadOnlyList<Reservation> existingReservationsForRoom)
    {
        // StartTime/EndTime are stored (and expected on the wire) as UTC — "business hours" is
        // meaningless without pinning down whose. Convert to the configured business time zone
        // before checking, rather than comparing UTC directly against an 08:00-18:00 window that
        // would otherwise only line up with a real business day for someone at UTC+0.
        var businessTimeZone = TimeZoneInfo.FindSystemTimeZoneById(businessSettings.TimeZoneId);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(candidate.StartTime, DateTimeKind.Utc), businessTimeZone);
        var localEnd = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(candidate.EndTime, DateTimeKind.Utc), businessTimeZone);

        if (localStart.Date != localEnd.Date
            || localStart.TimeOfDay < settings.BusinessHoursStart
            || localEnd.TimeOfDay > settings.BusinessHoursEnd)
        {
            throw new ArgumentException(
                $"Reservation must fall within business hours ({settings.BusinessHoursStart:hh\\:mm}-{settings.BusinessHoursEnd:hh\\:mm} {businessSettings.TimeZoneId}) on a single day.");
        }

        var duration = candidate.EndTime - candidate.StartTime;
        if (duration > TimeSpan.FromHours(settings.MaxDurationHours))
        {
            throw new ArgumentException($"Reservation duration cannot exceed {settings.MaxDurationHours} hour(s).");
        }

        var overlaps = existingReservationsForRoom.Any(r =>
            r.Id != candidate.Id
            && r.RoomId == candidate.RoomId
            && r.Status == ReservationStatus.Confirmed
            && r.StartTime < candidate.EndTime
            && candidate.StartTime < r.EndTime);

        if (overlaps)
        {
            throw new ArgumentException("Room is already booked for an overlapping time range.");
        }
    }
}
