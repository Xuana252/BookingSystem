namespace Booking.Application.DTOs;

public record ColleagueDirectoryDto(
    Guid Id,
    string Username,
    string Department,
    bool IsAvailable,
    Guid? CurrentMeetingRoomId
);
