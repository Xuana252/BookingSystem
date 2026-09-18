using System.Security.Claims;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserSummaryResponse>>> GetAll(CancellationToken ct)
        => Ok(await userService.GetAllAsync(ct));

    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<UserManagementResponse>>> GetAllForManagement(CancellationToken ct)
        => Ok(await userService.GetAllForManagementAsync(ct));

    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        await userService.DeactivateAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
    {
        await userService.ActivateAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/promote")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Promote(Guid id, CancellationToken ct)
    {
        await userService.PromoteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/demote")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Demote(Guid id, CancellationToken ct)
    {
        await userService.DemoteAsync(id, ct);
        return NoContent();
    }

    [HttpGet("me/preferences")]
    public async Task<ActionResult<UserPreferencesDto>> GetMyPreferences(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!);
        return Ok(await userService.GetPreferencesAsync(userId, ct));
    }

    [HttpPut("me/preferences")]
    public async Task<ActionResult<UserPreferencesDto>> UpdateMyPreferences(UpdateUserPreferencesRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!);
        return Ok(await userService.UpdatePreferencesAsync(userId, request, ct));
    }

    [HttpGet("directory")]
    public async Task<ActionResult<IEnumerable<ColleagueDirectoryDto>>> GetDirectory(CancellationToken ct)
    {
        return Ok(await userService.GetDirectoryAsync(ct));
    }
}
