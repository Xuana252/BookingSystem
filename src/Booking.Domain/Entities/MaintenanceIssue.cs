namespace Booking.Domain.Entities;

public enum MaintenanceIssuePriority
{
    Low,
    Medium,
    High
}

public enum MaintenanceIssueStatus
{
    Open,
    InProgress,
    Resolved
}

public class MaintenanceIssue
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid RoomId { get; set; }
    public Guid ReporterUserId { get; set; }
    
    public string Description { get; set; } = string.Empty;
    
    public MaintenanceIssuePriority Priority { get; set; } = MaintenanceIssuePriority.Medium;
    public MaintenanceIssueStatus Status { get; set; } = MaintenanceIssueStatus.Open;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
