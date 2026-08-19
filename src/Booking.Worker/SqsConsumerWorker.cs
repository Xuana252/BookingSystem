using System.Text.Json;
using Amazon.SQS;
using Amazon.SQS.Model;
using Booking.Application.Interfaces;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Microsoft.Extensions.DependencyInjection;

namespace Booking.Worker;

/// <summary>
/// Long-polls the booking-events SQS queue (fed by SNS) and reacts to each event:
/// ReservationCreated is just logged, ReservationReminderDue creates a Notification row.
/// </summary>
public class SqsConsumerWorker(
    IAmazonSQS sqs,
    AwsSettings settings,
    IServiceScopeFactory scopeFactory,
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
            await HandleMessageAsync(message, ct);
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

    private async Task HandleMessageAsync(Message message, CancellationToken ct)
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

        if (envelope?.EventType == EventTypes.ReservationReminderDue)
        {
            await CreateReminderNotificationAsync(envelope, ct);
        }
    }

    private async Task CreateReminderNotificationAsync(EventEnvelope envelope, CancellationToken ct)
    {
        var reservation = JsonSerializer.Deserialize<Reservation>(envelope.Payload);
        if (reservation is null)
        {
            logger.LogWarning("[SqsConsumerWorker] Could not deserialize Reservation payload for {EventType}.", envelope.EventType);
            return;
        }

        using var scope = scopeFactory.CreateScope();
        var dispatcher = scope.ServiceProvider.GetRequiredService<INotificationDispatchService>();
        await dispatcher.DispatchReminderAsync(reservation, ct);

        logger.LogInformation("[SqsConsumerWorker] Dispatched reminder notification for Reservation {ReservationId}.", reservation.Id);
    }
}
