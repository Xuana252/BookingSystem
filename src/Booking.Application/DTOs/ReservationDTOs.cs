using Booking.Domain.Entities;

namespace Booking.Application.DTOs;

public record CreateReservationRequest(Guid RoomId, DateTime StartTime, DateTime EndTime);

// Adds Username on top of what Reservation itself carries — the point being the caller (the UI's
// room calendar/detail modal) can show who booked a slot without a separate user-directory
// fetch-and-join. Looked up server-side (ReservationService), not left to the client to join
// against a raw user list — see UserSummaryResponse's own comment on why that's not exposed
// wholesale in the first place.
public record ReservationResponse(
    Guid Id,
    Guid RoomId,
    Guid UserId,
    string Username,
    DateTime StartTime,
    DateTime EndTime,
    ReservationStatus Status,
    DateTime CreatedAt);
