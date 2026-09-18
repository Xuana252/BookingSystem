using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface IBookingRuleEngine
{
    /// <param name="roomCapacity">The room's Capacity — checked against 1 (the host) + attendeeCount.</param>
    /// <param name="attendeeCount">Attendees only, not including the host.</param>
    /// <exception cref="ArgumentException">The candidate reservation violates a booking rule.</exception>
    void Validate(Reservation candidate, IReadOnlyList<Reservation> existingReservationsForRoom, int roomCapacity, int attendeeCount, SystemSettings settings);
}
