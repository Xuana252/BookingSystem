using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Booking.Application.Features.Common.Caching;

public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICachedQuery<TResponse>
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger;

    public CachingBehavior(IMemoryCache cache, ILogger<CachingBehavior<TRequest, TResponse>> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(request.CacheKey, out TResponse? cachedResponse))
        {
            _logger.LogInformation("Cache HIT for {CacheKey}", request.CacheKey);
            return cachedResponse!;
        }

        _logger.LogInformation("Cache MISS for {CacheKey}. Executing handler...", request.CacheKey);
        
        var response = await next();

        var expiration = request.Expiration ?? TimeSpan.FromMinutes(5);
        _cache.Set(request.CacheKey, response, expiration);
        
        _logger.LogInformation("Stored result in cache for {CacheKey} (Expiration: {Expiration})", request.CacheKey, expiration);

        return response;
    }
}
