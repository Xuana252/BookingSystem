# xUnit & Service Testing — Definition Notes

**Status:** Applied in project
**OJT tracker category:** Testing

## Summary

xUnit is a unit testing framework for .NET — lets you write automated tests that verify your code
behaves as expected, instead of manually checking it by running the app. Service testing extends
this to classes that depend on external systems (database, API, file system).

## Key Concepts

- **`[Fact]`** — a single, non-parameterized test. Either passes or fails.
- **`[Theory]` + `[InlineData]`** — a parameterized test, runs the same logic once per data row.
- **The AAA pattern** — Arrange (set up objects/data), Act (call the method/code under test),
  Assert (check the result matches expectations). Standard structure for any test.
- **Mocking** — creating a fake version of a dependency (e.g., a repository interface) that
  returns controlled, predictable data, so tests don't hit a real database or API.
- **Testing pyramid** — most tests should be unit tests (fast, dependencies mocked), fewer
  integration tests (real test DB, external services faked), fewest end-to-end tests (whole app
  running).

## Reference / Cheatsheet

### `[Fact]`

```csharp
[Fact]
public void Add_ReturnsSum()
{
    Assert.Equal(5, new Calculator().Add(2, 3));
}
```

### `[Theory]` + `[InlineData]`

```csharp
[Theory]
[InlineData(2, 3, 5)]
[InlineData(-1, 1, 0)]
public void Add_VariousInputs(int a, int b, int expected)
{
    Assert.Equal(expected, new Calculator().Add(a, b));
}
```

### Common assertions

| Assertion | Meaning |
|---|---|
| `Assert.Equal(expected, actual)` | Values match |
| `Assert.True(condition)` / `Assert.False(condition)` | Boolean check |
| `Assert.Null(obj)` / `Assert.NotNull(obj)` | Null check |
| `Assert.Throws<T>(() => ...)` | Expects an exception |
| `Assert.Contains(item, collection)` | Collection contains item |

### Running tests

```bash
dotnet test
```

### Mocking & verification

```csharp
var mockRepo = new Mock<IOrderRepository>();
mockRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(fakeOrder);

var service = new OrderService(mockRepo.Object);
```

`Verify` checks that a mocked method was actually called (and how many times) — used when you
care about behavior, not just a return value:

```csharp
mockRepo.Verify(r => r.SaveAsync(order), Times.Once);
```

**Integration test** — uses a real (but temporary/isolated) dependency, such as an in-memory
database, to confirm the service works with real data flow, not just mocked responses.

**End-to-end / API test** — spins up the entire application (e.g., via `WebApplicationFactory`)
and sends real HTTP requests to verify full request/response behavior.

### Testing pyramid

| Layer | What's Real | What's Faked | Speed | Volume |
|---|---|---|---|---|
| **Unit Test** | Class under test | All dependencies (mocked) | Fastest | Most |
| **Integration Test** | Class + real test DB | External 3rd-party services | Medium | Fewer |
| **End-to-End Test** | Whole app running | Maybe nothing | Slowest | Fewest |

**Rule of thumb:** most tests should be unit tests, with progressively fewer integration and
end-to-end tests as they get slower and more complex to maintain.

## Applied In This Project

Unit-test layer only so far, the base of the pyramid:
- `test/Booking.UnitTests/Entities/ReservationTests.cs` — three `[Fact]` tests for
  `Reservation.IsValidTimeRange`, following the AAA pattern (arrange the start/end times, act by
  calling the method, assert with FluentAssertions' `.Should().BeTrue()`/`.BeFalse()` instead of
  raw `Assert.Equal` — same idea, different assertion library). Pure static method, no mocking
  needed.
- `test/Booking.UnitTests/Services/{RoomServiceTests,UserServiceTests,ReservationServiceTests}.cs`
  — `Moq`-based tests for the Application services, each mocking its repository interface(s) (and
  `IEventPublisher` for `ReservationService`) so nothing touches EF Core or the AWS SDK. Covers
  `GetAllAsync` delegating to the repository, `CreateAsync` persisting the requested fields, and
  for `ReservationService` specifically: a valid reservation both persists *and* publishes
  `ReservationCreated` (`mock.Verify(..., Times.Once)`), while an invalid time range throws
  without touching the repository or publisher at all (`Times.Never`).
- `dotnet test` run as part of every phase's verification pass (see `doc/phase-outputs/`).

## Open Questions / Next Steps

- No integration or end-to-end tests yet. Phase 2's plan calls for a `Booking.IntegrationTests`
  project using WireMock to mock an external notification-sending API — that's the middle layer
  of the pyramid landing next, once there's an external dependency worth testing against.
