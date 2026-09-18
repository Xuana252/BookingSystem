using Booking.Domain.Entities;

namespace Booking.Application.DTOs;

// AttendeeUserIds is optional (null and [] both mean "no attendees") — the host is never listed
// here, they're implicit as the authenticated caller; ReservationService silently drops the
// host's own id if it shows up in this list rather than erroring, since asking "am I my own
// attendee?" isn't a mistake worth failing the whole request over.
public record CreateReservationRequest(Guid RoomId, DateTime StartTime, DateTime EndTime, IReadOnlyList<Guid>? AttendeeUserIds = null);

public record AttendeeSummary(Guid UserId, string Username);

// Adds Username on top of what Reservation itself carries — the point being the caller (the UI's
// room calendar/detail modal) can show who booked a slot without a separate user-directory
// fetch-and-join. Looked up server-side (ReservationService), not left to the client to join
// against a raw user list — see UserSummaryResponse's own comment on why that's not exposed
// wholesale in the first place. Attendees get the same treatment.
public record ReservationResponse(
    Guid Id,
    Guid RoomId,
    Guid UserId,
    string Username,
    DateTime StartTime,
    DateTime EndTime,
    ReservationStatus Status,
    DateTime CreatedAt,
    IReadOnlyList<AttendeeSummary> Attendees,
    DateTime? CheckedInAt = null);
