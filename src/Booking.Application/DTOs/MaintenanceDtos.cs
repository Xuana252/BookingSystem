using Booking.Domain.Entities;

namespace Booking.Application.DTOs;

public record MaintenanceIssueDto(
    Guid Id,
    Guid RoomId,
    Guid ReporterUserId,
    string Description,
    MaintenanceIssuePriority Priority,
    MaintenanceIssueStatus Status,
    DateTime CreatedAt,
    DateTime? ResolvedAt
);

public record CreateMaintenanceIssueRequest(
    Guid RoomId,
    string Description,
    MaintenanceIssuePriority Priority
);

public record UpdateMaintenanceStatusRequest(
    MaintenanceIssueStatus Status
);
