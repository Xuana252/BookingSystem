using Booking.Domain.Entities;
using Booking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Booking.Api.Controllers;

public record CreateRoomRequest(string Name, string Location, int Capacity);

[ApiController]
[Route("api/[controller]")]
public class RoomsController(BookingDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Room>>> GetAll(CancellationToken ct)
        => await db.Rooms.AsNoTracking().ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<Room>> Create(CreateRoomRequest request, CancellationToken ct)
    {
        var room = new Room
        {
            Name = request.Name,
            Location = request.Location,
            Capacity = request.Capacity
        };

        db.Rooms.Add(room);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new { id = room.Id }, room);
    }
}
