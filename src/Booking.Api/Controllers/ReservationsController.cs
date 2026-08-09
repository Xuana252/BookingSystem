using System.Text.Json;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;
using Booking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Booking.Api.Controllers;

public record CreateReservationRequest(Guid RoomId, Guid UserId, DateTime StartTime, DateTime EndTime);

[ApiController]
[Route("api/[controller]")]
public class ReservationsController(BookingDbContext db, IEventPublisher eventPublisher) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Reservation>>> GetAll(CancellationToken ct)
        => await db.Reservations.AsNoTracking().ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<Reservation>> Create(CreateReservationRequest request, CancellationToken ct)
    {
        if (request.EndTime <= request.StartTime)
        {
            return BadRequest("EndTime must be after StartTime.");
        }

        var reservation = new Reservation
        {
            RoomId = request.RoomId,
            UserId = request.UserId,
            StartTime = request.StartTime,
            EndTime = request.EndTime
        };

        db.Reservations.Add(reservation);
        await db.SaveChangesAsync(ct);

        var envelope = new EventEnvelope
        {
            EventType = EventTypes.ReservationCreated,
            Source = "Booking.Api",
            Payload = JsonSerializer.Serialize(reservation)
        };
        await eventPublisher.PublishAsync(envelope, ct);

        return CreatedAtAction(nameof(GetAll), new { id = reservation.Id }, reservation);
    }
}
