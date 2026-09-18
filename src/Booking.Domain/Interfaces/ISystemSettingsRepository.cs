using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface ISystemSettingsRepository
{
    Task<SystemSettings> GetSettingsAsync(CancellationToken ct = default);
    Task UpdateSettingsAsync(SystemSettings settings, CancellationToken ct = default);
}
