using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Booking.Application.Features.Common.Caching;

public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICachedQuery<TResponse>
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger;

    public CachingBehavior(IDistributedCache cache, ILogger<CachingBehavior<TRequest, TResponse>> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var cachedString = await _cache.GetStringAsync(request.CacheKey, cancellationToken);
        if (!string.IsNullOrEmpty(cachedString))
        {
            _logger.LogInformation("Cache HIT for {CacheKey}", request.CacheKey);
            var cachedResponse = JsonSerializer.Deserialize<TResponse>(cachedString);
            return cachedResponse!;
        }

        _logger.LogInformation("Cache MISS for {CacheKey}. Executing handler...", request.CacheKey);
        
        var response = await next();

        var expiration = request.Expiration ?? TimeSpan.FromMinutes(5);
        var options = new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = expiration };
        
        var serializedResponse = JsonSerializer.Serialize(response);
        await _cache.SetStringAsync(request.CacheKey, serializedResponse, options, cancellationToken);
        
        _logger.LogInformation("Stored result in cache for {CacheKey} (Expiration: {Expiration})", request.CacheKey, expiration);

        return response;
    }
}
