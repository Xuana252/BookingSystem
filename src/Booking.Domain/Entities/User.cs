namespace Booking.Domain.Entities;

public enum UserRole
{
    Employee,
    Admin
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Employee;
    public bool IsActive { get; set; } = true;
    public string Department { get; set; } = string.Empty;
    
    // Preferences
    public string TimeZoneId { get; set; } = "UTC";
    public bool EmailAlertsEnabled { get; set; } = true;
    public bool AutoDeclineConflicts { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
