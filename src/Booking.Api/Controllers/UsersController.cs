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
}
