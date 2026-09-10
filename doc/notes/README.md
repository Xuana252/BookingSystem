# OJT Knowledge Notes

This directory contains topic notes and architectural write-ups for the BookingSystem OJT program,
organized by sprint phase. Each note adheres to the structure defined in
[`_TEMPLATE.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/_TEMPLATE.md).

> [!NOTE]
> Notes use Obsidian-style wikilinks (`[[note-name]]`) for cross-referencing. Obsidian resolves
> links across subdirectories automatically, preserving graph view relationships.

---

## Directory Structure

```
doc/notes/
├── _TEMPLATE.md                 # Base template for new topic notes
├── README.md                    # Table of contents and phase index (this file)
├── phase-1/                     # Sprint 1: Foundations (Aug 4 – Aug 17, 2026)
│   ├── csharp-dotnet.md
│   ├── docker.md
│   ├── event-driven-microservices.md
│   ├── git-flow.md
│   ├── moto.md
│   ├── postgresql_fundamentals.md
│   └── xunit-service-testing-notes.md
├── phase-2/                     # Sprint 2: Core domain (Aug 18 – Aug 31, 2026)
│   ├── dynamodb.md
│   ├── hangfire.md
│   ├── redis.md
│   ├── sidecar-pattern.md
│   ├── splunk.md
│   └── wiremock.md
└── phase-3/                     # Sprint 3: Research, Integration, CI/CD & UI (Sep 1 – Sep 28, 2026)
    ├── new-relic.md
    ├── nginx.md
    ├── pagerduty.md
    └── spec-kit.md
```

---

## Phase 1 — Sprint 1: Foundations

| Note | Topic | Category | Status | Summary |
| :--- | :--- | :--- | :--- | :--- |
| [`csharp-dotnet.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-1/csharp-dotnet.md) | C# & .NET 10 | Backend / Language | Applied | Language/runtime foundations across all solution projects. |
| [`docker.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-1/docker.md) | Docker & Compose | DevOps | Applied | Local infrastructure containerization and Docker Compose setup. |
| [`event-driven-microservices.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-1/event-driven-microservices.md) | Event-Driven Architecture | Architecture | Applied | Decoupled messaging pattern with SNS topics, SQS queues, and DLQs. |
| [`git-flow.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-1/git-flow.md) | Git Flow | Process | Applied | Branching model (`main`, `develop`, `feature/*`) and commit conventions. |
| [`moto.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-1/moto.md) | Moto AWS Mocking | Testing | Applied | Offline AWS service simulation (SNS/SQS) for local development and CI. |
| [`postgresql_fundamentals.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-1/postgresql_fundamentals.md) | PostgreSQL Fundamentals | Database | Applied | Relational storage, EF Core migrations, indices, and transactions. |
| [`xunit-service-testing-notes.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-1/xunit-service-testing-notes.md) | xUnit Service Testing | Testing | Applied | Unit testing application services with xUnit, FluentAssertions, and Moq. |

---

## Phase 2 — Sprint 2: Core Domain

| Note | Topic | Category | Status | Summary |
| :--- | :--- | :--- | :--- | :--- |
| [`dynamodb.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-2/dynamodb.md) | DynamoDB | Database | Research only | NoSQL single-digit millisecond key-value and document store concepts. |
| [`hangfire.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-2/hangfire.md) | Hangfire | Backend / Background Jobs | Applied | Storage-backed background worker and recurring reminder-scan job. |
| [`redis.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-2/redis.md) | Redis Caching | Caching | Applied | Distributed caching for room-availability lookups with TTL invalidation. |
| [`sidecar-pattern.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-2/sidecar-pattern.md) | Sidecar Pattern | Architecture | Applied | Decoupled log routing using Fluent Bit sidecar shipping to Splunk. |
| [`splunk.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-2/splunk.md) | Splunk Log Indexing | DevOps / Observability | Applied | Centralized log indexing and search reached via Fluent Bit HEC. |
| [`wiremock.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-2/wiremock.md) | WireMock.Net | Testing | Applied | HTTP mock server for testing external third-party notification APIs. |

---

## Phase 3 — Sprint 3: Research, Integration, CI/CD & UI

Merged final sprint covering research write-ups along with solution integration, SignalR real-time,
GitHub Actions CI/CD, React UI completion, and Nginx proxying.

### Notes

| Note | Topic | Category | Status | Summary |
| :--- | :--- | :--- | :--- | :--- |
| [`codeship.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-3/codeship.md) | Codeship CI/CD | DevOps / CI/CD | Research only | Hosted container-native CI/CD platform (Codeship Pro/Basic), Jet CLI local runner, and AWS ECS/ECR deployment pipelines. |
| [`github-actions.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-3/github-actions.md) | GitHub Actions CI/CD | DevOps / CI/CD | Applied | Automated build, test, and containerized integration test workflows for .NET and React. |
| [`new-relic.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-3/new-relic.md) | New Relic | DevOps / Observability | Research only | SaaS APM, M.E.L.T. telemetry, distributed tracing, Apdex, and NRQL. |
| [`nginx.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-3/nginx.md) | Nginx Reverse Proxy Gateway | DevOps / Web Server | Applied | Standalone reverse-proxy gateway routing `/` to Vite UI, `/api/*`, and `/hubs/*` with dynamic Docker DNS. |
| [`pagerduty.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-3/pagerduty.md) | PagerDuty | DevOps / Observability | Research only | On-call incident response, escalation policies, and Events API v2 routing. |
| [`spec-kit.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/phase-3/spec-kit.md) | Spec Kit | AI | Research only | Specification-driven development workflow and artifact structuring. |

### Integration & Build Scope Topics

- **GitHub Actions CI**: Automated build, test, and containerized integration test workflows (`.github/workflows/ci.yml`).
- **SignalR Real-Time**: Live availability updates and notification feed backplane via Redis.
- **React Frontend**: Room calendar, booking flow, and responsive UI with Tailwind (`ui/Booking.UI`).
- **Nginx Reverse Proxy Gateway**: Standalone single-origin reverse-proxy gateway for UI (`ui:5173`), `/api/*`, and `/hubs/*`.
- **AWS Infrastructure Reading**: ECS, Parameter Store, CloudWatch, EC2, VPC, Codeship.

---

## Authoring New Notes

When adding a note for a new topic:
1. Copy [`_TEMPLATE.md`](file:///d:/Mock/MockProject/BookingSystem/doc/notes/_TEMPLATE.md).
2. Save it under the appropriate phase directory (`doc/notes/phase-<N>/<topic-name>.md`).
3. Maintain the standard sections: Summary, Key Concepts, Reference / Cheatsheet, Applied In This Project, Related Notes, and Open Questions / Next Steps.
4. Update this `README.md` index table.
