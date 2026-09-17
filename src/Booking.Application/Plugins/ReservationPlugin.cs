using System.ComponentModel;
using Booking.Application.DTOs;
using Booking.Application.Features.Rooms.Queries;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using MediatR;
using Microsoft.SemanticKernel;

namespace Booking.Application.Plugins;

/// <summary>
/// Result returned by reservation tool calls for the ChatService to format into cards.
/// </summary>
public sealed class ReservationQueryResult
{
    public IReadOnlyList<ChatReservationResult> Reservations { get; init; } = [];
}

/// <summary>
/// Semantic Kernel plugin that gives the LLM read-only access to reservation data.
/// </summary>
public sealed class ReservationPlugin(IReservationService reservationService, IMediator mediator)
{
    private Guid _currentUserId;

    public ReservationQueryResult? LastQueryResult { get; private set; }

    public void SetCurrentUserId(Guid userId) => _currentUserId = userId;

    [KernelFunction, Description(
        "List all upcoming confirmed reservations booked by the current user. " +
        "Use when the user asks about 'my reservations', 'my upcoming bookings', or wants to view/cancel their bookings. " +
        "Returns structured data; include the IDs you want to show in reservationIds.")]
    public async Task<ReservationQueryResult> GetMyReservationsAsync(CancellationToken cancellationToken = default)
    {
        var allReservations = await reservationService.GetAllAsync(cancellationToken);
        var allRooms = await mediator.Send(new GetRoomsQuery(true), cancellationToken);
        var roomDict = allRooms.ToDictionary(r => r.Id);

        var myUpcoming = allReservations
            .Where(r => r.UserId == _currentUserId && r.Status == ReservationStatus.Confirmed && r.EndTime > DateTime.UtcNow)
            .OrderBy(r => r.StartTime)
            .Select(r =>
            {
                roomDict.TryGetValue(r.RoomId, out var room);
                return new ChatReservationResult(
                    r.Id,
                    room?.Name ?? "Unknown Room",
                    room?.Location ?? "Unknown Location",
                    r.StartTime,
                    r.EndTime,
                    r.Status.ToString(),
                    r.Username,
                    r.Attendees.Select(a => a.Username).ToList());
            })
            .ToList();

        var result = new ReservationQueryResult { Reservations = myUpcoming };
        LastQueryResult = result;
        return result;
    }

    [KernelFunction, Description(
        "Create a new room reservation for the current user. " +
        "ALWAYS confirm the room name, date, and time with the user before calling this. " +
        "Use the room ID (UUID) from a previous ListRooms or GetAvailableRooms call. " +
        "Returns a confirmation message with the booking reference.")]
    public async Task<string> CreateReservationAsync(
        [Description("The room ID (UUID) to book — taken from a previous rooms tool result.")] string roomId,
        [Description("Reservation start time in ISO 8601 UTC format, e.g. 2026-09-12T09:00:00Z.")] DateTime startTime,
        [Description("Reservation end time in ISO 8601 UTC format, e.g. 2026-09-12T10:00:00Z.")] DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(roomId, out var roomGuid))
            return "Error: invalid room ID format. Please use the UUID from a rooms tool result.";

        if (startTime.Kind != DateTimeKind.Utc) startTime = startTime.ToUniversalTime();
        if (endTime.Kind != DateTimeKind.Utc) endTime = endTime.ToUniversalTime();

        try
        {
            var reservation = await reservationService.CreateAsync(
                new CreateReservationRequest(roomGuid, startTime, endTime),
                _currentUserId,
                cancellationToken);

            return $"Reservation created! Reference: BK-{reservation.Id.ToString()[..8].ToUpperInvariant()}. " +
                   $"{reservation.StartTime:ddd dd MMM} from {reservation.StartTime:HH:mm} to {reservation.EndTime:HH:mm} UTC.";
        }
        catch (ArgumentException ex)
        {
            return $"Could not create reservation: {ex.Message}";
        }
        catch (Exception)
        {
            return "An unexpected error occurred while creating the reservation. Please try again.";
        }
    }

    [KernelFunction, Description(
        "Check whether any rooms are available (not already booked) during a requested time window. " +
        "Provide start and end times in ISO 8601 format. Prefer GetAvailableRooms in RoomPlugin when " +
        "you also need to filter by capacity — it handles availability + capacity in one call.")]
    public async Task<string> CheckAvailabilityAsync(
        [Description("Requested start time in ISO 8601 format.")] DateTime startTime,
        [Description("Requested end time in ISO 8601 format.")] DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        if (startTime.Kind != DateTimeKind.Utc) startTime = startTime.ToUniversalTime();
        if (endTime.Kind != DateTimeKind.Utc) endTime = endTime.ToUniversalTime();
        
        var all = await reservationService.GetAllAsync(cancellationToken);

        var conflictingRoomIds = all
            .Where(r => r.Status == ReservationStatus.Confirmed && startTime < r.EndTime && endTime > r.StartTime)
            .Select(r => r.RoomId)
            .ToHashSet();

        LastQueryResult = null;

        if (conflictingRoomIds.Count == 0)
            return $"No conflicts for {startTime:HH:mm}–{endTime:HH:mm} UTC on {startTime:ddd dd MMM yyyy}. All rooms appear free.";

        return $"{conflictingRoomIds.Count} room(s) are booked during {startTime:HH:mm}–{endTime:HH:mm} UTC on {startTime:ddd dd MMM yyyy}.";
    }

    [KernelFunction, Description(
        "Cancel an existing room reservation for the current user. " +
        "You MUST fetch the user's reservations first to get the correct Reservation ID (UUID). " +
        "ALWAYS confirm the exact room name and time with the user before calling this tool, " +
        "especially if they have multiple reservations. Never guess the ID.")]
    public async Task<string> CancelReservationAsync(
        [Description("The reservation ID (UUID) to cancel, obtained from GetMyReservations.")] string reservationId,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(reservationId, out var resGuid))
            return "Error: invalid reservation ID format. Please use the UUID from a reservations tool result.";

        try
        {
            await reservationService.CancelAsync(resGuid, _currentUserId, cancellationToken);
            return $"Successfully cancelled reservation {resGuid}.";
        }
        catch (KeyNotFoundException)
        {
            return $"Error: Reservation {resGuid} not found.";
        }
        catch (UnauthorizedAccessException)
        {
            return $"Error: You do not have permission to cancel reservation {resGuid}.";
        }
        catch (Exception ex)
        {
            return $"An unexpected error occurred while cancelling: {ex.Message}";
        }
    }
}
