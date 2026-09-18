using Booking.Domain.Interfaces;
using Booking.Domain.Entities;
using Booking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Repositories;

public class SystemSettingsRepository(BookingDbContext dbContext) : ISystemSettingsRepository
{
    public async Task<SystemSettings> GetSettingsAsync(CancellationToken ct = default)
    {
        var settings = await dbContext.SystemSettings.FirstOrDefaultAsync(ct);
        if (settings == null)
        {
            settings = new SystemSettings
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                MaxBookingLeadTimeDays = 30,
                AutoCancelMinutes = 15,
                BusinessHoursStart = new TimeSpan(8, 0, 0),
                BusinessHoursEnd = new TimeSpan(18, 0, 0),
                MaxDurationHours = 4,
                TimeZoneId = "Asia/Ho_Chi_Minh"
            };
            dbContext.SystemSettings.Add(settings);
            await dbContext.SaveChangesAsync(ct);
        }
        return settings;
    }

    public async Task UpdateSettingsAsync(SystemSettings settings, CancellationToken ct = default)
    {
        var existing = await GetSettingsAsync(ct);
        existing.MaxBookingLeadTimeDays = settings.MaxBookingLeadTimeDays;
        existing.AutoCancelMinutes = settings.AutoCancelMinutes;
        existing.BusinessHoursStart = settings.BusinessHoursStart;
        existing.BusinessHoursEnd = settings.BusinessHoursEnd;
        existing.MaxDurationHours = settings.MaxDurationHours;
        existing.TimeZoneId = settings.TimeZoneId;
        
        await dbContext.SaveChangesAsync(ct);
    }
}
