using System.ComponentModel;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Microsoft.SemanticKernel;

namespace Booking.Application.Plugins;

/// <summary>
/// Typed result returned by room tool calls. Returning a class (not a string) means SK:
///   1. Serialises it to JSON so the LLM can reason over the data.
///   2. Stores the original object in FunctionResultContent.Result so ChatService can
///      cast it back to structured card data ΓÇö no second DB round-trip needed.
/// </summary>
public sealed class RoomQueryResult
{
    public IReadOnlyList<ChatRoomResult> Rooms { get; init; } = [];
    public DateTime? SlotStart { get; init; }
    public DateTime? SlotEnd { get; init; }
}

/// <summary>
/// Semantic Kernel plugin that gives the LLM read-only access to room data.
/// </summary>
public sealed class RoomPlugin(IRoomService roomService, IReservationService reservationService)
{
    /// <summary>
    /// Set by each tool call so ChatService can read the exact filtered result
    /// without a second DB fetch. Safe because RoomPlugin is registered as Scoped ΓÇö
    /// the same instance is used by the Kernel and by ChatService within one request.
    /// </summary>
    public RoomQueryResult? LastQueryResult { get; private set; }
    [KernelFunction, Description(
        "List all active bookable rooms, optionally filtered by minimum seating capacity. " +
        "Use GetAvailableRooms instead when the user also specifies a time window.")]
    public async Task<RoomQueryResult> ListRoomsAsync(
        [Description("Minimum required seating capacity. Pass 0 or omit to show all rooms.")] int minCapacity = 0,
        CancellationToken cancellationToken = default)
    {
        var rooms = await roomService.GetAllAsync(cancellationToken);

        var filtered = (minCapacity > 0 ? rooms.Where(r => r.Capacity >= minCapacity) : rooms)
            .OrderBy(r => r.Capacity)
            .Select(r => new ChatRoomResult(r.Id, r.Name, r.Location, r.Capacity))
            .ToList();

        var result = new RoomQueryResult { Rooms = filtered };
        LastQueryResult = result;
        return result;
    }

    [KernelFunction, Description(
        "Find rooms that are BOTH large enough AND not already booked for a specific time window. " +
        "Always prefer this over ListRooms + CheckAvailability when the user specifies a time.")]
    public async Task<RoomQueryResult> GetAvailableRoomsAsync(
        [Description("Requested start time in ISO 8601 format (e.g. 2026-09-11T09:00:00Z).")] DateTime startTime,
        [Description("Requested end time in ISO 8601 format (e.g. 2026-09-11T12:00:00Z).")] DateTime endTime,
        [Description("Minimum required seating capacity. Pass 0 or omit for no capacity filter.")] int minCapacity = 0,
        CancellationToken cancellationToken = default)
    {
        var allRooms = await roomService.GetAllAsync(cancellationToken);
        var allReservations = await reservationService.GetAllAsync(cancellationToken);

        var conflictingRoomIds = allReservations
            .Where(r => r.Status == ReservationStatus.Confirmed
                        && startTime < r.EndTime
                        && endTime > r.StartTime)
            .Select(r => r.RoomId)
            .ToHashSet();

        var available = allRooms
            .Where(r => !conflictingRoomIds.Contains(r.Id) && r.Capacity >= minCapacity)
            .OrderBy(r => r.Capacity)
            .Select(r => new ChatRoomResult(r.Id, r.Name, r.Location, r.Capacity))
            .ToList();

        var result = new RoomQueryResult { Rooms = available, SlotStart = startTime, SlotEnd = endTime };
        LastQueryResult = result;
        return result;
    }
}
