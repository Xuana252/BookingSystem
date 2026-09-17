# MediatR & CQRS

**Status:** Applied in project
**OJT tracker category:** Architecture

## Summary

MediatR is an open-source library for .NET that implements the Mediator pattern. It decouples components (like API Controllers and Business Logic) by providing an in-process messaging system where "Requests" are routed to their designated "Handlers". This makes it incredibly easy to adopt the Command Query Responsibility Segregation (CQRS) architectural pattern.

## Key Concepts

*   **CQRS (Command Query Responsibility Segregation):** Splitting application operations into Commands (which modify state) and Queries (which only read data).
*   **Requests (Commands/Queries):** Objects representing the intent to do something or get something. They implement `IRequest<TResponse>`.
*   **Handlers:** The classes that contain the actual business logic for a specific request. They implement `IRequestHandler<TRequest, TResponse>`.
*   **Notifications (Events):** Messages that can be handled by multiple subscribers simultaneously (Pub/Sub pattern). They implement `INotification`.
*   **Pipeline Behaviors:** Middleware for your handlers (`IPipelineBehavior`). Useful for cross-cutting concerns like validation (e.g., using FluentValidation), logging, and transaction management, allowing them to wrap around the execution of the handler.

## Reference / Cheatsheet

### The Single File Pattern
It is a best practice to keep the Request and the Handler in the exact same file for discoverability:

```csharp
using MediatR;

// 1. The Request (Command)
public record CreateRoomCommand(string Name, int Capacity) : IRequest<Room>;

// 2. The Handler
public class CreateRoomCommandHandler : IRequestHandler<CreateRoomCommand, Room>
{
    private readonly IRoomRepository _rooms;
    
    public CreateRoomCommandHandler(IRoomRepository rooms)
    {
        _rooms = rooms;
    }

    public async Task<Room> Handle(CreateRoomCommand request, CancellationToken cancellationToken)
    {
       // Execute logic...
       return new Room();
    }
}
```

## Applied In This Project

The project extensively uses MediatR with Feature-Based Folders (Vertical Slicing) and the Single-File Pattern:

*   `src/Booking.Api/Controllers/RoomsController.cs` — The controller relies solely on the `IMediator` interface to dispatch commands, keeping it thin and decoupled from business logic.
*   `src/Booking.Application/Features/Rooms/Commands/CreateRoomCommand.cs` — An example of the Single-File pattern where the `CreateRoomCommand` record and its `CreateRoomCommandHandler` are co-located.
*   `src/Booking.Application/Features/Rooms/Queries/GetRoomsQuery.cs` — Demonstrates separation of read concerns (Queries) from write concerns (Commands).
*   `src/Booking.Application/DependencyInjection.cs` — Where MediatR is registered with the ASP.NET Core DI container using `services.AddMediatR(...)`.

## Related Notes

*   [[csharp-dotnet]] — Core language ecosystem where MediatR is utilized.

## Open Questions / Next Steps

*   Explore adding FluentValidation into the MediatR Pipeline Behaviors to handle all request validation automatically before the request reaches the handler.
