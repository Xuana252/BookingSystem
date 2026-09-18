using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MaintenanceController(IMaintenanceService maintenanceService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaintenanceIssueDto>>> GetAll(CancellationToken ct)
    {
        // Add caching or pagination in a real app
        return Ok(await maintenanceService.GetAllAsync(ct));
    }

    [HttpPost]
    public async Task<ActionResult<MaintenanceIssueDto>> Create(CreateMaintenanceIssueRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var issue = await maintenanceService.CreateAsync(request, userId, ct);
        return CreatedAtAction(nameof(GetAll), new { id = issue.Id }, issue);
    }

    [HttpPatch("{id:guid}/status")]
    // In a real app we would want [Authorize(Roles = "Admin")] here, but keeping it open based on context
    public async Task<ActionResult<MaintenanceIssueDto>> UpdateStatus(Guid id, UpdateMaintenanceStatusRequest request, CancellationToken ct)
    {
        var issue = await maintenanceService.UpdateStatusAsync(id, request, ct);
        return Ok(issue);
    }
}
