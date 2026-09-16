using System.Net.Http.Json;

using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Booking.Infrastructure.External;

public class TeamsNotificationService(HttpClient httpClient, IUserRepository users, ILogger<TeamsNotificationService> logger) : ITeamsNotificationService
{
    public async Task SendBookingCardAsync(string webhookUrl, Reservation reservation, Room room, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(webhookUrl)) return;

        var host = await users.GetByIdAsync(reservation.UserId, ct);
        var hostName = host?.Username ?? "Unknown User";

        var startTime = reservation.StartTime.ToString("MMM dd, yyyy h:mm tt");
        var endTime = reservation.EndTime.ToString("h:mm tt");

        // Construct MS Teams Adaptive Card payload
        var payload = new
        {
            type = "message",
            attachments = new[]
            {
                new
                {
                    contentType = "application/vnd.microsoft.card.adaptive",
                    content = new
                    {
                        type = "AdaptiveCard",
                        version = "1.4",
                        body = new object[]
                        {
                            new
                            {
                                type = "TextBlock",
                                size = "Medium",
                                weight = "Bolder",
                                text = "🟢 New Room Booking"
                            },
                            new
                            {
                                type = "FactSet",
                                facts = new[]
                                {
                                    new { title = "Room:", value = room.Name },
                                    new { title = "Time:", value = $"{startTime} - {endTime}" },
                                    new { title = "Host:", value = hostName }
                                }
                            }
                        }
                    }
                }
            }
        };

        try
        {
            var response = await httpClient.PostAsJsonAsync(webhookUrl, payload, ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("[TeamsNotificationService] Failed to post to webhook. Status Code: {StatusCode}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[TeamsNotificationService] Exception posting to webhook {Url}", webhookUrl);
        }
    }
}
