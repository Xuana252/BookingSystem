namespace Booking.Application.DTOs;

public record CreateReservationRequest(Guid RoomId, DateTime StartTime, DateTime EndTime);
