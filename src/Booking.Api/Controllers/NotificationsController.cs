using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Notification>>> GetAll(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        return Ok(await notificationService.GetForUserAsync(userId, ct));
    }
}
