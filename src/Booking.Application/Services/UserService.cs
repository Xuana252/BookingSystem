using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class UserService(
    IUserRepository users, 
    IReservationRepository reservations,
    IReservationAttendeeRepository attendees) : IUserService
{
    public async Task<IReadOnlyList<UserSummaryResponse>> GetAllAsync(CancellationToken ct = default)
        => (await users.GetAllAsync(ct))
            .Select(u => new UserSummaryResponse(u.Id, u.Username))
            .ToList();

    public async Task<IReadOnlyList<UserManagementResponse>> GetAllForManagementAsync(CancellationToken ct = default)
        => (await users.GetAllAsync(ct))
            .Select(u => new UserManagementResponse(u.Id, u.Username, u.Email, u.Role, u.IsActive))
            .ToList();

    public async Task DeactivateAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new KeyNotFoundException($"User '{userId}' not found.");

        if (!user.IsActive)
        {
            return;
        }

        // Deactivating an Admin has the same "nobody left to administer the system" risk as
        // demoting one — same guard, same reasoning (see DemoteAsync).
        if (user.Role == UserRole.Admin)
        {
            await EnsureNotLastActiveAdminAsync(user.Id, ct);
        }

        user.IsActive = false;
        await users.SaveChangesAsync(ct);
    }

    public async Task ActivateAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new KeyNotFoundException($"User '{userId}' not found.");

        if (user.IsActive)
        {
            return;
        }

        user.IsActive = true;
        await users.SaveChangesAsync(ct);
    }

    public async Task PromoteAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new KeyNotFoundException($"User '{userId}' not found.");

        if (user.Role == UserRole.Admin)
        {
            return;
        }

        user.Role = UserRole.Admin;
        await users.SaveChangesAsync(ct);
    }

    public async Task DemoteAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new KeyNotFoundException($"User '{userId}' not found.");

        if (user.Role == UserRole.Employee)
        {
            return;
        }

        await EnsureNotLastActiveAdminAsync(user.Id, ct);

        user.Role = UserRole.Employee;
        await users.SaveChangesAsync(ct);
    }

    // Without this, demoting or deactivating the only remaining Admin leaves the system with
    // nobody who can administer it at all — no way back in short of editing Postgres directly.
    // Counts active Admins only: a deactivated Admin can't log in anyway, so it wouldn't help
    // recover the system either way and shouldn't count as "still available".
    private async Task EnsureNotLastActiveAdminAsync(Guid excludingUserId, CancellationToken ct)
    {
        var allUsers = await users.GetAllAsync(ct);
        var otherActiveAdmins = allUsers.Any(u => u.Id != excludingUserId && u.Role == UserRole.Admin && u.IsActive);

        if (!otherActiveAdmins)
        {
            throw new InvalidOperationException("Can't remove the last remaining Admin.");
        }
    }

    public async Task<UserPreferencesDto> GetPreferencesAsync(Guid id, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(id, ct)
            ?? throw new KeyNotFoundException($"User '{id}' not found.");

        return new UserPreferencesDto(user.TimeZoneId, user.EmailAlertsEnabled, user.AutoDeclineConflicts);
    }

    public async Task<UserPreferencesDto> UpdatePreferencesAsync(Guid id, UpdateUserPreferencesRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(id, ct)
            ?? throw new KeyNotFoundException($"User '{id}' not found.");

        user.TimeZoneId = request.TimeZoneId;
        user.EmailAlertsEnabled = request.EmailAlertsEnabled;
        user.AutoDeclineConflicts = request.AutoDeclineConflicts;

        await users.SaveChangesAsync(ct);

        return new UserPreferencesDto(user.TimeZoneId, user.EmailAlertsEnabled, user.AutoDeclineConflicts);
    }

    public async Task<IReadOnlyList<ColleagueDirectoryDto>> GetDirectoryAsync(CancellationToken ct = default)
    {
        var allUsers = await users.GetAllAsync(ct);
        var allReservations = await reservations.GetAllAsync(ct);
        
        var now = DateTime.UtcNow;

        // Find active meetings right now
        var activeMeetings = allReservations
            .Where(r => r.StartTime <= now && r.EndTime > now && r.Status != ReservationStatus.Cancelled && r.CheckedInAt.HasValue)
            .ToList();

        var activeMeetingIds = activeMeetings.Select(m => m.Id).ToList();
        var activeAttendees = await attendees.GetForReservationsAsync(activeMeetingIds, ct);

        var result = new List<ColleagueDirectoryDto>();

        foreach (var user in allUsers.Where(u => u.IsActive))
        {
            var currentMeeting = activeMeetings.FirstOrDefault(m => 
                m.UserId == user.Id || 
                activeAttendees.Any(a => a.ReservationId == m.Id && a.UserId == user.Id));

            var isAvailable = currentMeeting == null;

            result.Add(new ColleagueDirectoryDto(
                user.Id,
                user.Username,
                user.Department,
                isAvailable,
                currentMeeting?.RoomId
            ));
        }

        return result.OrderBy(r => r.Username).ToList();
    }
}
