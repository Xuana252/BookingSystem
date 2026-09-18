using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SystemSettingsController(ISystemSettingsRepository settingsRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SystemSettings>> GetSettings(CancellationToken ct)
    {
        return Ok(await settingsRepo.GetSettingsAsync(ct));
    }

    [HttpPut]
    public async Task<ActionResult<SystemSettings>> UpdateSettings(SystemSettings request, CancellationToken ct)
    {
        var settings = await settingsRepo.GetSettingsAsync(ct);
        settings.MaxBookingLeadTimeDays = request.MaxBookingLeadTimeDays;
        settings.AutoCancelMinutes = request.AutoCancelMinutes;
        settings.BusinessHoursStart = request.BusinessHoursStart;
        settings.BusinessHoursEnd = request.BusinessHoursEnd;
        settings.MaxDurationHours = request.MaxDurationHours;
        settings.TimeZoneId = request.TimeZoneId;
        
        await settingsRepo.UpdateSettingsAsync(settings, ct);
        return Ok(settings);
    }
}
