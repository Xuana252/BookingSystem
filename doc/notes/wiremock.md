# WireMock

**Status:** Applied in project
**OJT tracker category:** Testing

## Summary

WireMock.Net is an HTTP stub server for integration tests — it spins up a real, listening HTTP
server that returns programmed responses, so code under test makes genuine HTTP calls without
reaching an actual external service.

## Key Concepts

- **Not a mock in the Moq/interface-substitution sense** — it's an actual embedded HTTP server.
  The code under test's real `HttpClient` plumbing (serialization, headers, status-code handling,
  timeouts) runs for real, not bypassed the way a mocked interface would bypass it.
- **Given/RespondWith DSL** — match an incoming request by path/method/headers/body, and
  configure what response (status code, body, headers) to send back for matches.
- **Embedded, per-test lifecycle** — `WireMockServer.Start()` spins up an in-process server for
  the duration of a test, disposed afterward. No separate container or long-lived process needed
  (unlike Moto, which runs as a standalone server this project also uses — see
  `doc/notes/moto.md`).
- **Testing failure modes, not just happy paths** — stopping the server mid-test simulates the
  dependency being unreachable, which is otherwise hard to reproduce deterministically.
- **`LogEntries`** — after a call, lets a test assert on what was actually sent (path, request
  body) rather than only checking how the response was handled.

## Reference / Cheatsheet

```csharp
var server = WireMockServer.Start();

server
    .Given(Request.Create().WithPath("/notifications").UsingPost())
    .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

var client = new HttpClient { BaseAddress = new Uri(server.Url!) };
// ... exercise code under test using client ...

var logEntry = server.LogEntries.Should().ContainSingle().Subject;
logEntry.RequestMessage!.Body.Should().Contain("expected-value");

server.Dispose();
```

## Applied In This Project

- `test/Booking.IntegrationTests/HttpNotificationSenderTests.cs` — three tests against
  `HttpNotificationSender` (`Booking.Infrastructure/External/HttpNotificationSender.cs`):
  - a `200` response returns `true` and posts the expected JSON payload, asserted via
    `server.LogEntries`;
  - a `500` response returns `false` (no exception);
  - the server stopped mid-call (simulating an unreachable provider) returns `false` instead of
    throwing — this case caught a real gap where `HttpRequestException`/`TaskCanceledException`
    weren't originally being caught, since it's easy to only think about non-2xx responses and
    forget the "can't even reach it" case.
- `HttpNotificationSender` itself is **not** wired into DI as the live path anymore —
  `Booking.Infrastructure/DependencyInjection.cs` registers `SmtpNotificationSender` (real Gmail
  SMTP) as the actual `INotificationSender`. `HttpNotificationSender` and its WireMock tests stay
  in the codebase deliberately, as valid, working coverage of the WireMock integration-testing
  pattern, even though it's no longer the production notification path.
- Sits at the middle layer of the testing pyramid described in
  `doc/notes/xunit-service-testing-notes.md` — the first (and so far only) integration test in
  the project, between the Moq-based unit tests and a hypothetical end-to-end test.

## Open Questions / Next Steps

- None open — the pattern is demonstrated and all 3 tests pass. No further WireMock-covered HTTP
  dependency is currently planned.
