using Booking.Domain.Entities;

namespace Booking.Application.DTOs;

public record UserSummaryResponse(Guid Id, string Username);

/// <summary>The admin room/user-management view — everything UserSummaryResponse deliberately
/// leaves out (Email, Role, IsActive), still short of PasswordHash.</summary>
public record UserManagementResponse(Guid Id, string Username, string Email, UserRole Role, bool IsActive);
