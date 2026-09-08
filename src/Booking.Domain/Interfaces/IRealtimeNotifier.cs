namespace Booking.Domain.Interfaces;

public interface IRealtimeNotifier
{
    Task RoomAvailabilityChangedAsync(Guid roomId, CancellationToken ct = default);
    Task NotifyUserAsync(Guid userId, string message, CancellationToken ct = default);
}
