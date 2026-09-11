using System.Text.Json.Serialization;

namespace Booking.Application.DTOs;

public record ChatRoomResult(Guid Id, string Name, string Location, int Capacity);

/// <summary>
/// A reservation card the frontend can render with view/cancel actions.
/// RoomName is resolved server-side so the UI doesn't need a separate room lookup.
/// </summary>
public record ChatReservationResult(
    Guid Id,
    string RoomName,
    string RoomLocation,
    DateTime StartTime,
    DateTime EndTime,
    string Status,
    string BookedByUsername,
    IReadOnlyList<string> AttendeeUsernames);

/// <summary>
/// The structured JSON shape the LLM is required to always respond with.
/// The model explicitly selects which roomIds/reservationIds to surface as cards —
/// this removes the "last plugin ran" ambiguity where internal tool calls leaked as cards.
/// </summary>
public sealed class AssistantStructuredResponse
{
    [JsonPropertyName("reply")]
    public string Reply { get; init; } = string.Empty;

    /// <summary>
    /// IDs the model explicitly chose to surface as booking cards this turn.
    /// Empty means: rooms were fetched internally (e.g. to inform a booking) but
    /// the user doesn't need to see them as swipe-able cards.
    /// </summary>
    [JsonPropertyName("roomIds")]
    public List<string> RoomIds { get; init; } = [];

    /// <summary>
    /// IDs of the current user's reservations to show as cancellable cards.
    /// </summary>
    [JsonPropertyName("reservationIds")]
    public List<string> ReservationIds { get; init; } = [];
}

/// <summary>
/// The full result of a chat turn returned to the controller.
/// Rooms/Reservations contain only what the model explicitly nominated — never a full unfiltered list.
/// SlotStart/SlotEnd carry the queried time window so booking cards pre-fill the right slot.
/// </summary>
public record ChatResult(
    string Reply,
    IReadOnlyList<ChatRoomResult>? Rooms = null,
    DateTime? SlotStart = null,
    DateTime? SlotEnd = null,
    IReadOnlyList<ChatReservationResult>? Reservations = null);
