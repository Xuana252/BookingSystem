using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class MaintenanceService(IMaintenanceRepository maintenanceRepo, IRoomRepository roomRepo) : IMaintenanceService
{
    public async Task<IReadOnlyList<MaintenanceIssueDto>> GetAllAsync(CancellationToken ct = default)
    {
        var issues = await maintenanceRepo.GetAllAsync(ct);
        return issues.Select(ToDto).ToList();
    }

    public async Task<MaintenanceIssueDto> CreateAsync(CreateMaintenanceIssueRequest request, Guid userId, CancellationToken ct = default)
    {
        var room = await roomRepo.GetByIdAsync(request.RoomId, ct);
        if (room == null)
            throw new KeyNotFoundException($"Room {request.RoomId} not found.");

        var issue = new MaintenanceIssue
        {
            RoomId = request.RoomId,
            ReporterUserId = userId,
            Description = request.Description,
            Priority = request.Priority,
            Status = MaintenanceIssueStatus.Open
        };

        await maintenanceRepo.AddAsync(issue, ct);
        return ToDto(issue);
    }

    public async Task<MaintenanceIssueDto> UpdateStatusAsync(Guid issueId, UpdateMaintenanceStatusRequest request, CancellationToken ct = default)
    {
        var issue = await maintenanceRepo.GetByIdAsync(issueId, ct);
        if (issue == null)
            throw new KeyNotFoundException($"Maintenance issue {issueId} not found.");

        issue.Status = request.Status;
        if (issue.Status == MaintenanceIssueStatus.Resolved && issue.ResolvedAt == null)
        {
            issue.ResolvedAt = DateTime.UtcNow;
        }

        await maintenanceRepo.UpdateAsync(issue, ct);
        return ToDto(issue);
    }

    private static MaintenanceIssueDto ToDto(MaintenanceIssue issue) => new(
        issue.Id,
        issue.RoomId,
        issue.ReporterUserId,
        issue.Description,
        issue.Priority,
        issue.Status,
        issue.CreatedAt,
        issue.ResolvedAt
    );
}
