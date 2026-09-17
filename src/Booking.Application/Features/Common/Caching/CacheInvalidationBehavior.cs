using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Booking.Application.Features.Common.Caching;

public class CacheInvalidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<CacheInvalidationBehavior<TRequest, TResponse>> _logger;

    public CacheInvalidationBehavior(IMemoryCache cache, ILogger<CacheInvalidationBehavior<TRequest, TResponse>> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // Always execute the actual handler first. We only want to invalidate cache if the command succeeds.
        var response = await next();

        // Check if the request implements either of the invalidation interfaces.
        if (request is ICacheInvalidatorCommand invalidator)
        {
            InvalidateKeys(invalidator.CacheKeysToInvalidate);
        }
        else if (request is ICacheInvalidatorCommand<TResponse> invalidatorWithResponse)
        {
            InvalidateKeys(invalidatorWithResponse.CacheKeysToInvalidate);
        }

        return response;
    }

    private void InvalidateKeys(string[] keys)
    {
        foreach (var key in keys)
        {
            _logger.LogInformation("Invalidating cache key: {CacheKey}", key);
            _cache.Remove(key);
        }
    }
}
