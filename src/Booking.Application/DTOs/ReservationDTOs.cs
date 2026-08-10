namespace Booking.Application.DTOs;

public record CreateReservationRequest(Guid RoomId, Guid UserId, DateTime StartTime, DateTime EndTime);
