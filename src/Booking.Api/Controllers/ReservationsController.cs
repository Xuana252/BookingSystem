using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReservationsController(IReservationService reservationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Reservation>>> GetAll(CancellationToken ct)
        => Ok(await reservationService.GetAllAsync(ct));

    [HttpPost]
    public async Task<ActionResult<Reservation>> Create(CreateReservationRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var reservation = await reservationService.CreateAsync(request, userId, ct);
        return CreatedAtAction(nameof(GetAll), new { id = reservation.Id }, reservation);
    }
}
