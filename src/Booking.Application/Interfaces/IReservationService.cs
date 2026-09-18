using Booking.Application.DTOs;

namespace Booking.Application.Interfaces;

public interface IReservationService
{
    Task<IReadOnlyList<ReservationResponse>> GetAllAsync(CancellationToken ct = default);

    /// <exception cref="ArgumentException">EndTime is not after StartTime, or a booking rule (business hours, max duration, overlap) is violated.</exception>
    Task<ReservationResponse> CreateAsync(CreateReservationRequest request, Guid userId, CancellationToken ct = default);

    /// <exception cref="KeyNotFoundException">No reservation with that id exists.</exception>
    /// <exception cref="UnauthorizedAccessException">The reservation belongs to a different user.</exception>
    Task CancelAsync(Guid reservationId, Guid userId, CancellationToken ct = default);

    /// <summary>Cancels a reservation without checking user permissions. Used by background jobs (e.g., auto-cancel for no-show).</summary>
    Task SystemCancelAsync(Guid reservationId, string reason, CancellationToken ct = default);

    /// <summary>Marks a reservation as checked in, preventing auto-cancellation.</summary>
    Task CheckInAsync(Guid reservationId, Guid userId, CancellationToken ct = default);
}
