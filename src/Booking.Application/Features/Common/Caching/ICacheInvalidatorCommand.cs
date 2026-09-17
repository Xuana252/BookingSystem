using MediatR;

namespace Booking.Application.Features.Common.Caching;

public interface ICacheInvalidatorCommand : IRequest
{
    string[] CacheKeysToInvalidate { get; }
}

public interface ICacheInvalidatorCommand<TResponse> : IRequest<TResponse>
{
    string[] CacheKeysToInvalidate { get; }
}
