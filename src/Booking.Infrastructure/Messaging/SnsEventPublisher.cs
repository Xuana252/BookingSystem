using System.Text.Json;
using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;
using Booking.Domain.Configuration;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Booking.Infrastructure.Messaging;

/// <summary>
/// Publishes an EventEnvelope to the SNS topic (Moto in dev, real SNS in prod).
/// The SNS topic fans-out automatically to the subscribed SQS queue consumed by the Worker.
/// </summary>
public sealed class SnsEventPublisher(
    IAmazonSimpleNotificationService sns,
    AwsSettings settings,
    ILogger<SnsEventPublisher> logger) : IEventPublisher
{
    public async Task PublishAsync(EventEnvelope envelope, CancellationToken ct = default)
    {
        var request = new PublishRequest
        {
            TopicArn = settings.SnsTopicArn,
            Message = JsonSerializer.Serialize(envelope),
            Subject = envelope.EventType,
            MessageAttributes = new Dictionary<string, MessageAttributeValue>
            {
                ["EventType"] = new() { DataType = "String", StringValue = envelope.EventType },
                ["Source"] = new() { DataType = "String", StringValue = envelope.Source }
            }
        };

        var response = await sns.PublishAsync(request, ct);
        logger.LogInformation(
            "[SnsEventPublisher] Published {EventType} | SnsMessageId={SnsId}",
            envelope.EventType, response.MessageId);
    }
}
