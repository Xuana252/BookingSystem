using System.Text.Json;
using Amazon.SQS;
using Amazon.SQS.Model;
using Booking.Domain.Configuration;
using Booking.Domain.Events;

namespace Booking.Worker;

/// <summary>
/// Long-polls the booking-events SQS queue (fed by SNS) and logs each event.
/// Phase-1 event-pattern POC — no business logic yet, that lands in Phase 2.
/// </summary>
public class SqsConsumerWorker(
    IAmazonSQS sqs,
    AwsSettings settings,
    ILogger<SqsConsumerWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrEmpty(settings.SqsQueueUrl))
        {
            logger.LogWarning("[SqsConsumerWorker] Aws:SqsQueueUrl is not configured. Consumer idling.");
            return;
        }

        logger.LogInformation("[SqsConsumerWorker] Polling {QueueUrl}...", settings.SqsQueueUrl);

        while (!stoppingToken.IsCancellationRequested)
        {
            var response = await sqs.ReceiveMessageAsync(new ReceiveMessageRequest
            {
                QueueUrl = settings.SqsQueueUrl,
                MaxNumberOfMessages = 10,
                WaitTimeSeconds = 20
            }, stoppingToken);

            foreach (var message in response.Messages ?? [])
            {
                HandleMessage(message);
                await sqs.DeleteMessageAsync(settings.SqsQueueUrl, message.ReceiptHandle, stoppingToken);
            }
        }
    }

    private void HandleMessage(Message message)
    {
        try
        {
            // SNS delivers to SQS wrapped in a notification envelope; unwrap it to get our EventEnvelope.
            var body = message.Body;
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("Type", out var type) && type.GetString() == "Notification"
                && doc.RootElement.TryGetProperty("Message", out var inner))
            {
                body = inner.GetString() ?? body;
            }

            var envelope = JsonSerializer.Deserialize<EventEnvelope>(body);
            logger.LogInformation(
                "[SqsConsumerWorker] Received {EventType} | MessageId={MessageId} | Source={Source} | Payload={Payload}",
                envelope?.EventType, envelope?.MessageId, envelope?.Source, envelope?.Payload);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[SqsConsumerWorker] Failed to process message {MessageId}.", message.MessageId);
        }
    }
}
