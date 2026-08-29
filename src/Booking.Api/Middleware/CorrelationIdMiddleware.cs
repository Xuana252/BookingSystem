namespace Booking.Api.Middleware;

/// <summary>
/// Generates (or accepts an inbound) correlation ID for the whole request, stashes it in
/// HttpContext.Items so HttpContextCorrelationIdAccessor can hand it to whatever publishes an
/// event (e.g. ReservationService), and pushes it into a logging scope so every log line for
/// this request carries it — not just the one line at the point of publishing.
/// </summary>
public class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Correlation-Id";
    public const string ItemsKey = "CorrelationId";

    public async Task InvokeAsync(HttpContext context, ILogger<CorrelationIdMiddleware> logger)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var headerValue)
            && !string.IsNullOrWhiteSpace(headerValue)
                ? headerValue.ToString()
                : Guid.NewGuid().ToString();

        context.Items[ItemsKey] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await next(context);
        }
    }
}
