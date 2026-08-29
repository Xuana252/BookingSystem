namespace Booking.Domain.Events;

/// <summary>
/// Standard envelope for all events flowing through SNS → SQS.
/// Both the Api (publisher) and Worker (consumer) share this record.
/// </summary>
public record EventEnvelope
{
    /// <summary>Unique identifier for this event instance. Used for deduplication.</summary>
    public string MessageId { get; init; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Groups every log line involved in producing and processing this event, across the
    /// Api/Worker boundary — deliberately not the same thing as ASP.NET Core's per-request
    /// TraceId/SpanId (which stay as free, automatic, single-service correlation). A plain,
    /// independent field rather than reused/propagated trace context: Worker's SQS polling loop
    /// has no ambient Activity to parent a real child span from, and stamping TraceId onto an
    /// event without properly parenting a new Activity from it would look like real distributed
    /// tracing data to any tool that later tries to visualize it, while actually being wrong.
    /// </summary>
    public string CorrelationId { get; init; } = Guid.NewGuid().ToString();

    /// <summary>Canonical event type. Must match an EventTypes constant.</summary>
    public string EventType { get; init; } = string.Empty;

    /// <summary>Source service that emitted the event (e.g. "Booking.Api").</summary>
    public string Source { get; init; } = string.Empty;

    /// <summary>JSON-serialized inner payload. Deserialize based on EventType.</summary>
    public string Payload { get; init; } = string.Empty;

    /// <summary>UTC timestamp when the event was created.</summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}
