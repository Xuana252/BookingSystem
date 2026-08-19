using Booking.Application.DTOs;
using Booking.Domain.Entities;

namespace Booking.Application.Interfaces;

public interface IReservationService
{
    Task<IReadOnlyList<Reservation>> GetAllAsync(CancellationToken ct = default);

    /// <exception cref="ArgumentException">EndTime is not after StartTime, or a booking rule (business hours, max duration, overlap) is violated.</exception>
    Task<Reservation> CreateAsync(CreateReservationRequest request, Guid userId, CancellationToken ct = default);
}
