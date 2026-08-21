using Booking.Domain.Interfaces;
using Microsoft.AspNetCore.Http;

namespace Booking.Infrastructure.Http;

/// <summary>
/// Reads the correlation ID CorrelationIdMiddleware stashed in HttpContext.Items for the current
/// request. Falls back to a fresh one when there's no ambient HttpContext — e.g. Booking.Worker's
/// Hangfire-triggered reminder scan, which isn't driven by an inbound HTTP request at all, so
/// each publish in that loop gets its own independent correlation ID (this is a computed
/// property, re-evaluated on every access, not cached).
/// </summary>
public class HttpContextCorrelationIdAccessor(IHttpContextAccessor httpContextAccessor) : ICorrelationIdAccessor
{
    public string CorrelationId =>
        httpContextAccessor.HttpContext?.Items["CorrelationId"] as string
        ?? Guid.NewGuid().ToString();
}
