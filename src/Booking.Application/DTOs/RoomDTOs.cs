namespace Booking.Application.DTOs;

public record CreateRoomRequest(string Name, string Location, int Capacity);
