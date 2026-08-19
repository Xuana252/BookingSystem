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
        var response = await httpClient.PostAsJsonAsync("notifications", new
        {
            to = recipientEmail,
            subject,
            message
        }, ct);

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
