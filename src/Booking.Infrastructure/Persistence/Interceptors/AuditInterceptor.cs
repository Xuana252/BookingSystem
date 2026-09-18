using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Booking.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Booking.Infrastructure.Persistence.Interceptors;

public class AuditInterceptor(IHttpContextAccessor httpContextAccessor) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, 
        InterceptionResult<int> result, 
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context == null) return base.SavingChangesAsync(eventData, result, cancellationToken);

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)
            .Where(e => e.Entity is not AuditLog && e.Entity is not Notification) // Ignore logging noise
            .ToList();

        if (!entries.Any()) return base.SavingChangesAsync(eventData, result, cancellationToken);

        var userId = httpContextAccessor.HttpContext?.User?.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? "System";

        var logs = new List<AuditLog>();
        foreach (var entry in entries)
        {
            var log = new AuditLog
            {
                UserId = userId,
                ActionType = entry.State.ToString(),
                EntityName = entry.Entity.GetType().Name,
                EntityId = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.CurrentValue?.ToString() ?? "Unknown",
                Details = JsonSerializer.Serialize(entry.Properties.ToDictionary(
                    p => p.Metadata.Name, 
                    p => entry.State == EntityState.Deleted ? p.OriginalValue : p.CurrentValue))
            };
            logs.Add(log);
        }

        context.Set<AuditLog>().AddRange(logs);

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
