using MediatR;

namespace Booking.Application.Features.Common.Caching;

public interface ICachedQuery<TResponse> : IRequest<TResponse>
{
    string CacheKey { get; }
    TimeSpan? Expiration { get; }
}
