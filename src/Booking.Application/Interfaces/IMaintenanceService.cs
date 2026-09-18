using Booking.Application.DTOs;

namespace Booking.Application.Interfaces;

public interface IMaintenanceService
{
    Task<IReadOnlyList<MaintenanceIssueDto>> GetAllAsync(CancellationToken ct = default);
    Task<MaintenanceIssueDto> CreateAsync(CreateMaintenanceIssueRequest request, Guid userId, CancellationToken ct = default);
    Task<MaintenanceIssueDto> UpdateStatusAsync(Guid issueId, UpdateMaintenanceStatusRequest request, CancellationToken ct = default);
}
