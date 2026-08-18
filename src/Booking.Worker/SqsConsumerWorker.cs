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
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);

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
            ReceiveMessageResponse response;
            try
            {
                response = await sqs.ReceiveMessageAsync(new ReceiveMessageRequest
                {
                    QueueUrl = settings.SqsQueueUrl,
                    MaxNumberOfMessages = 10,
                    WaitTimeSeconds = 20
                }, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break; // normal shutdown
            }
            catch (Exception ex)
            {
                // Transient failure (network blip, Moto/SQS temporarily unreachable, throttling).
                // Log and back off instead of letting this bubble up — an unhandled exception here
                // would stop the whole BackgroundService (and, by default, the host).
                logger.LogError(ex,
                    "[SqsConsumerWorker] Failed to poll {QueueUrl}; retrying in {DelaySeconds}s.",
                    settings.SqsQueueUrl, RetryDelay.TotalSeconds);
                await Task.Delay(RetryDelay, stoppingToken);
                continue;
            }

            foreach (var message in response.Messages ?? [])
            {
                await ProcessMessageAsync(message, stoppingToken);
            }
        }
    }

    private async Task ProcessMessageAsync(Message message, CancellationToken ct)
    {
        try
        {
            HandleMessage(message);
            await sqs.DeleteMessageAsync(settings.SqsQueueUrl, message.ReceiptHandle, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Don't delete on failure — the message becomes visible again after the queue's
            // VisibilityTimeout and gets retried (and eventually dead-lettered per the queue's
            // RedrivePolicy), instead of silently dropping it or crashing the consumer loop.
            logger.LogError(ex, "[SqsConsumerWorker] Failed to process message {MessageId}; leaving for redelivery.", message.MessageId);
        }
    }

    private void HandleMessage(Message message)
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
}
