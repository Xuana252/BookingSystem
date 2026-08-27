# Moto (AWS Mocking)

**Status:** Applied in project
**OJT tracker category:** Testing

## Summary

Moto is a library/tool for mocking AWS services, letting code that depends on AWS be developed
and tested without touching real AWS infrastructure. It can run as a Python test
decorator/context manager, or as a standalone server that any AWS SDK — including non-Python
ones like .NET — can talk to.

## Key Concepts

- Moto **reimplements the AWS API surface** rather than proxying or recording real AWS traffic —
  a self-contained fake backend with in-memory state.
- Any AWS SDK is pointed at Moto's endpoint instead of a real AWS regional endpoint; Moto
  inspects each request and responds the way real AWS would (same shapes, same identifiers, same
  error behavior). From the SDK's perspective it's indistinguishable from real AWS.
- **No real AWS account or credentials needed** — dummy credentials are enough since Moto doesn't
  enforce real authentication by default.
- **No cost, no network calls to AWS** — everything runs locally, deterministic, clean isolated
  state per run.
- **Language-agnostic in server mode** — since it speaks the same HTTP API as AWS, any language's
  AWS SDK can point at it, not just Python.

## Reference / Cheatsheet

Two modes of use:
1. **In-process (Python only)** — via `@mock_aws` decorator or `with mock_aws():` context manager,
   intercepting `boto3` calls directly within a test process.
2. **Standalone server** — runs as a long-lived HTTP server (e.g. via Docker: `motoserver/moto`)
   that any AWS SDK, in any language, can point at by overriding its service endpoint URL.

Supported services (relevant subset): **SNS** (topics, subscriptions, filter policies, raw
message delivery, FIFO), **SQS** (queues, message policies, FIFO, dead-letter queues),
**DynamoDB** (tables, indexes, conditional writes, transactions, streams, TTL).

Because Moto implements the same protocol as real AWS, application code doesn't need to branch
or special-case for testing — the same AWS SDK client code that talks to Moto locally will talk
to real AWS in production, with only the endpoint configuration differing.

## Applied In This Project

Standalone-server mode, since this is .NET (not Python) — no in-process `@mock_aws` option here:
- `src/docker-compose.yml` — `moto` service (`motoserver/moto` image), configured with
  `MOTO_SERVICE: sns,sqs,dynamodb` and a health check.
- `src/moto-init/init-all.sh` — uses the AWS CLI (a different-language SDK, exactly the
  "language-agnostic in server mode" point) to create the `booking-events` SNS topic, the
  `booking-events-queue` SQS queue, a `booking-events-dlq`, and subscribe the queue to the topic —
  all against Moto's endpoint.
- `Booking.Infrastructure/DependencyInjection.cs` — the .NET AWS SDK clients
  (`IAmazonSimpleNotificationService`, `IAmazonSQS`) are configured with `ServiceURL` pointing at
  Moto (`http://localhost:5000` locally), and dummy credentials
  (`new BasicAWSCredentials("test", "test")`) when the endpoint looks local — exactly the "dummy
  credentials are enough" property from these notes.
- Verified live: the Api published an event and the Worker consumed it, entirely through Moto,
  with zero real AWS account or network calls involved.

## Switching SNS/SQS from Moto to real AWS

Both SNS and SQS have a generous perpetual free tier (1M requests/month each, not a 12-month
trial), so this is a real, cheap option for practicing against actual AWS — the toggle is
config-only, no code change needed:

- `Booking.Infrastructure/DependencyInjection.cs` picks Moto vs. real AWS purely from whether
  `Aws:EndpointUrl` looks local (`Contains("localhost")`/`Contains("moto")`). Moto path: sets
  `ServiceURL` + dummy `BasicAWSCredentials`. Real-AWS path: sets `RegionEndpoint` (never
  `ServiceURL` — an *empty* `ServiceURL` isn't the same as "unset" to the SDK, it tries to hit a
  blank host) and passes no explicit credentials at all, so the SDK's default credential
  provider chain (env vars → shared credentials file → IAM role) resolves them.
- `src/.env.example` documents the switch: `AWS_ENDPOINT_URL=` (blank, on purpose) plus
  `AWS_REGION`/`AWS_SNS_TOPIC_ARN`/`AWS_SQS_QUEUE_URL` for a real topic/queue you've created,
  and `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` — the AWS SDK's own recognized env var names
  (not bound through the `Aws__` config prefix), ignored entirely while still pointed at Moto.
  `src/docker-compose.yml`'s `api`/`worker` services read all of these with `${VAR:-<moto-default>}`
  fallbacks, so the default `docker compose up` behavior is unchanged unless `.env` sets them.
- **The one gotcha Moto hides**: `moto-init/init-all.sh` subscribes the queue to the topic but
  never sets a queue *access policy* — Moto doesn't enforce SNS→SQS delivery permissions. Real
  AWS does. Without a resource policy on the real SQS queue granting `sns.amazonaws.com`
  `sqs:SendMessage`, scoped via a `SourceArn` condition to the topic's ARN, the subscription
  looks "confirmed" but published messages never arrive — no error, they just silently don't
  show up. Set this in the SQS console (Access Policy) or via CLI/Terraform when provisioning
  the real queue; it has no local equivalent to catch it earlier.
- Also worth doing for real AWS that Moto didn't require: scope the IAM user/role down to just
  `sns:Publish` on that one topic ARN and `sqs:ReceiveMessage`/`DeleteMessage`/`GetQueueAttributes`/
  `GetQueueUrl` on that one queue ARN, not admin credentials.

## Open Questions / Next Steps

- DynamoDB isn't used yet even though `MOTO_SERVICE` enables it — reserved for the Phase 2
  DynamoDB research topic (per the OJT plan, that stays research-only, not merged into the app).
- The real-AWS toggle above is implemented and builds/tests clean, but hasn't actually been
  exercised against a real AWS account yet — worth a live pass (create a real topic/queue, flip
  `.env`, confirm a reservation event round-trips) before relying on it for a demo.
