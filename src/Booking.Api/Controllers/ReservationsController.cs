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
public class ReservationsController(IReservationService reservationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReservationResponse>>> GetAll(CancellationToken ct)
        => Ok(await reservationService.GetAllAsync(ct));

    [HttpPost]
    public async Task<ActionResult<ReservationResponse>> Create(CreateReservationRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var reservation = await reservationService.CreateAsync(request, userId, ct);
        return CreatedAtAction(nameof(GetAll), new { id = reservation.Id }, reservation);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        await reservationService.CancelAsync(id, userId, ct);
        return NoContent();
    }
}
