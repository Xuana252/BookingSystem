using System.Net.Http.Json;
using Booking.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Booking.Infrastructure.External;

/// <summary>
/// Calls a stubbed email/SMS provider over HTTP. Real provider integration is out of scope for
/// this OJT project — this exists to practice the WireMock-based integration-testing pattern.
/// </summary>
public sealed class HttpNotificationSender(HttpClient httpClient, ILogger<HttpNotificationSender> logger) : INotificationSender
{
    public async Task<bool> SendAsync(string recipientEmail, string subject, string message, CancellationToken ct = default)
    {
        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync("notifications", new
            {
                to = recipientEmail,
                subject,
                message
            }, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Provider unreachable (connection refused, DNS failure, timeout) — degrade to a
            // logged failure like a non-2xx response, instead of throwing out of a "send a
            // notification" call and failing the whole message being processed for it.
            logger.LogWarning(ex, "[HttpNotificationSender] Provider unreachable for {Recipient}.", recipientEmail);
            return false;
        }

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "[HttpNotificationSender] Provider returned {StatusCode} for {Recipient}.",
                response.StatusCode, recipientEmail);
            return false;
        }

        return true;
    }
}
