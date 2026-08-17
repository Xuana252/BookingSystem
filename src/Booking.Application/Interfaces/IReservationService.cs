using Booking.Application.DTOs;
using Booking.Domain.Entities;

namespace Booking.Application.Interfaces;

public interface IReservationService
{
    Task<IReadOnlyList<Reservation>> GetAllAsync(CancellationToken ct = default);

    /// <exception cref="ArgumentException">EndTime is not after StartTime.</exception>
    Task<Reservation> CreateAsync(CreateReservationRequest request, Guid userId, CancellationToken ct = default);
}
