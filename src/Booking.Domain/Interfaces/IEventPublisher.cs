using Booking.Domain.Events;

namespace Booking.Domain.Interfaces;

public interface IEventPublisher
{
    Task PublishAsync(EventEnvelope envelope, CancellationToken ct = default);
}
