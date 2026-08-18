# Event-Driven Microservices: Summary Notes

**Status:** Applied in project
**OJT tracker category:** Architecture

## Summary

Instead of Service A calling Service B directly and waiting for a response, Service A
**publishes an event** — a fact that something happened (`OrderPlaced`, `PaymentFailed`) — to a
broker. Any service that cares can subscribe and react, without Service A knowing or caring who's
listening.

```
OrderService --publish--> Event Bus
                             |--> Payment service    (charges the card)
                             |--> Inventory service  (reserves stock)
                             |--> Notification service (emails customer)
```

## Key Concepts

- **Loose coupling** — the producer doesn't know or care how many consumers exist or what they
  do. You can add a new subscriber without touching the producer.
- **Async by default** — the producer doesn't wait for consumers to finish, making the system
  more resilient to slow or temporarily-down services.
- **Independent scaling and failure** — if one consumer goes down, producers keep working; the
  consumer catches up on its backlog once it's back.
- **Choreography vs. orchestration** — choreography has services react to events and emit their
  own (simple to start, hard to trace as it grows); orchestration has a central coordinator
  explicitly calling each step (easier to reason about, but reintroduces a coupling point).

## Reference / Cheatsheet

### Choreography vs. Orchestration

| | Choreography | Orchestration |
|---|---|---|
| **How it works** | Services react to events and emit their own events; no central coordinator | A central orchestrator (e.g. saga coordinator) explicitly calls each step and tracks state |
| **Pros** | Simple to start, fully decoupled | Easy to reason about and debug |
| **Cons** | Hard to trace the overall flow as it grows | Reintroduces a coupling point |

### Common pitfalls

- **Event schema drift** — changing an event's payload can silently break every consumer. Version
  your event schemas.
- **Duplicate delivery** — most brokers guarantee "at least once," not "exactly once." Consumers
  must be idempotent (safe to process the same event twice).
- **Debugging is harder** — a request's journey spans services and time. Use distributed tracing
  (correlation IDs threaded through events) to reconstruct what happened.
- **Eventual consistency** — data across services won't be instantly in sync. Not automatically a
  good fit if a piece of logic needs strict consistency.

### Pub/Sub broker implementation notes

A common concrete example is a **topic that fans out to multiple queues** — a producer publishes
to a topic, and each consumer polls its own dedicated queue independently (e.g. AWS SNS + SQS, or
equivalents like Google Pub/Sub, Azure Service Bus).

- **Message envelopes** — many pub/sub systems wrap your payload in a metadata envelope on
  delivery, so consuming code often needs to unwrap one layer before getting to the actual event
  data.
- **At-least-once delivery** — consumers should be idempotent, since most brokers don't guarantee
  exactly-once delivery.
- **Filter policies** — subscriptions can often be scoped so a queue only receives a subset of
  event types, rather than everything published to the topic.
- **Local testing** — libraries like `moto` can mock cloud messaging services, letting you test
  publish/subscribe flows without hitting real infrastructure (see `moto.md`).

## Applied In This Project

This is the choreography/pub-sub pattern, concretely, via SNS → SQS:
- `Booking.Domain/Events/EventEnvelope.cs` — the message envelope described above, made real:
  `MessageId`, `EventType`, `Source`, `Payload` (JSON string), `Timestamp`.
- `Booking.Domain/Events/EventTypes.cs` — canonical event-type constants (currently just
  `ReservationCreated`), the "version your event schemas" idea in practice (`.v1` suffix).
- `Booking.Infrastructure/Messaging/SnsEventPublisher.cs` — the producer: publishes an
  `EventEnvelope` to the SNS topic on reservation creation.
- `Booking.Worker/SqsConsumerWorker.cs` — the consumer: long-polls SQS, and explicitly
  **unwraps the SNS notification envelope** before deserializing the actual `EventEnvelope` — the
  exact "consuming code often needs to unwrap one layer" gotcha from these notes, hit and handled
  for real.
- `src/moto-init/init-all.sh` — provisions a `booking-events-dlq` dead-letter queue alongside the
  main queue (the "at-least-once, consumers must be idempotent" pitfall's usual mitigation: a DLQ
  catches messages that fail repeatedly instead of retrying forever).
- Producer/consumer are two independent processes (`Booking.Api` / `Booking.Worker`) — verified
  they work independently: the Worker picks up events even though it never talks to the Api
  directly.

## Open Questions / Next Steps

- No filter policies yet — only one event type exists, so the queue receives everything published
  to the topic. Revisit once more event types (`ReservationCancelled`, `ReservationReminderDue`)
  land in Phase 2.
- Consumer idempotency isn't handled yet (the Worker just logs and deletes) — becomes relevant
  once the Worker starts writing to the DB in Phase 2 (e.g. creating `Notification` rows), where
  double-processing would create duplicates.
