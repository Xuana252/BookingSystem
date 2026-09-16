namespace Booking.Application.DTOs;

public record CreateRoomRequest(string Name, string Location, int Capacity, List<string>? Amenities = null, List<string>? WebhookUrls = null);

public record UpdateRoomRequest(string Name, string Location, int Capacity, List<string>? Amenities = null, List<string>? WebhookUrls = null);
