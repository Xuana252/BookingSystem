namespace Booking.Application.DTOs;

public record AuditLogDto(
    Guid Id,
    DateTime Timestamp,
    string? UserId,
    string ActionType,
    string EntityName,
    string EntityId,
    string Details
);
