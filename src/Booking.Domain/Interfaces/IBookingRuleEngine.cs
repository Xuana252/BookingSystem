using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface IBookingRuleEngine
{
    /// <exception cref="ArgumentException">The candidate reservation violates a booking rule.</exception>
    void Validate(Reservation candidate, IReadOnlyList<Reservation> existingReservationsForRoom);
}
