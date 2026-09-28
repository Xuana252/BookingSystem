using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Booking.Application.Features.Common.Caching;

public class CacheInvalidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<CacheInvalidationBehavior<TRequest, TResponse>> _logger;

    public CacheInvalidationBehavior(IDistributedCache cache, ILogger<CacheInvalidationBehavior<TRequest, TResponse>> logger)
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
            await InvalidateKeysAsync(invalidator.CacheKeysToInvalidate, cancellationToken);
        }
        else if (request is ICacheInvalidatorCommand<TResponse> invalidatorWithResponse)
        {
            await InvalidateKeysAsync(invalidatorWithResponse.CacheKeysToInvalidate, cancellationToken);
        }

        return response;
    }

    private async Task InvalidateKeysAsync(string[] keys, CancellationToken cancellationToken)
    {
        foreach (var key in keys)
        {
            _logger.LogInformation("Invalidating cache key: {CacheKey}", key);
            await _cache.RemoveAsync(key, cancellationToken);
        }
    }
}
