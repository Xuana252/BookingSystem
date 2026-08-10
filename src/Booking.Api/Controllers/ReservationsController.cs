using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservationsController(IReservationService reservationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Reservation>>> GetAll(CancellationToken ct)
        => Ok(await reservationService.GetAllAsync(ct));

    [HttpPost]
    public async Task<ActionResult<Reservation>> Create(CreateReservationRequest request, CancellationToken ct)
    {
        try
        {
            var reservation = await reservationService.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetAll), new { id = reservation.Id }, reservation);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
