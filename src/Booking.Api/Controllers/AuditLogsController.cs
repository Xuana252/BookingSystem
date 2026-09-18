using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogsController(IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    // In a real app we would want [Authorize(Roles = "Admin")] here, but keeping it open based on context
    public async Task<ActionResult<IEnumerable<AuditLogDto>>> GetAll(CancellationToken ct)
    {
        return Ok(await auditLogService.GetAllAsync(ct));
    }
}
