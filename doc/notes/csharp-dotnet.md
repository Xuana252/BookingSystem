# C# & .NET for Backend — Basics

**Status:** Applied in project
**OJT tracker category:** Backend / Language

## Summary

.NET is Microsoft's free, cross-platform runtime and framework for building applications, most
commonly used here for backend servers. C# is its main language: statically typed,
object-oriented, compiles to IL that the CLR runs.

## Key Concepts

- **CLR (Common Language Runtime)** — executes compiled code, handles memory (garbage collection)
  and type safety.
- **BCL (Base Class Library)** — standard library: collections, I/O, networking, LINQ, etc.
- **SDK / CLI** — `dotnet` command to build, run, test, and publish.
- C# everyday features: classes/interfaces, async/await (non-blocking I/O), LINQ, generics,
  records (immutable data types, good for DTOs), exception handling (`try`/`catch`/`finally`).
- **ASP.NET Core** — framework for web APIs/apps (routing, middleware, controllers or minimal
  APIs).
- **Entity Framework Core (EF Core)** — ORM for relational databases; Dapper is a lighter
  alternative.
- **Dependency Injection** — built into ASP.NET Core by default, used to wire up services.
- **Middleware pipeline** — request handling as a chain of middleware (auth, logging, error
  handling, etc.).

## Reference / Cheatsheet

Why it's a common backend choice:
- Strong performance (JIT-compiled, actively optimized runtime)
- Cross-platform, deploys easily to containers/cloud
- Mature tooling (Visual Studio, VS Code, Rider) and debugging
- Large package ecosystem via NuGet
- Backward-compatible — old code tends to keep working across upgrades

## Applied In This Project

This is the language/runtime for the whole solution — not one file, but pervasive:
- .NET 10, targeting `net10.0` across all five projects (`src/BookingSystem.slnx`).
- Async/await everywhere I/O happens: repository methods (`Booking.Infrastructure/Persistence/Repositories/*.cs`), Application services (`Booking.Application/Services/*.cs`), controller actions.
- Records used for immutable DTOs: `CreateRoomRequest`/`CreateUserRequest`/`CreateReservationRequest` (`Booking.Application/DTOs/`), `EventEnvelope` (`Booking.Domain/Events/EventEnvelope.cs`).
- Dependency Injection: `Booking.Infrastructure/DependencyInjection.cs` and `Booking.Application/DependencyInjection.cs` register services/repositories/AWS clients; `Booking.Api/Program.cs` wires it all together.
- ASP.NET Core: `Booking.Api` (controllers, health checks, Scalar/OpenAPI middleware).
- EF Core: `Booking.Infrastructure/Persistence/BookingDbContext.cs` + migrations.

## Open Questions / Next Steps

- Middleware pipeline is minimal so far (just `UseHttpsRedirection`/`UseAuthorization`) — global
  exception handling middleware would be a natural Phase 2+ addition once error-shape
  requirements are clearer.
