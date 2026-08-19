using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class BookingRuleEngine(ReservationRuleSettings settings) : IBookingRuleEngine
{
    public void Validate(Reservation candidate, IReadOnlyList<Reservation> existingReservationsForRoom)
    {
        if (candidate.StartTime.Date != candidate.EndTime.Date
            || candidate.StartTime.TimeOfDay < settings.BusinessHoursStart
            || candidate.EndTime.TimeOfDay > settings.BusinessHoursEnd)
        {
            throw new ArgumentException(
                $"Reservation must fall within business hours ({settings.BusinessHoursStart:hh\\:mm}-{settings.BusinessHoursEnd:hh\\:mm}) on a single day.");
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
