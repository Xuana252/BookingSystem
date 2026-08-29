namespace Booking.Domain.Interfaces;

public interface ICorrelationIdAccessor
{
    string CorrelationId { get; }
}
