using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController(IRoomService roomService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Room>>> GetAll(CancellationToken ct)
        => Ok(await roomService.GetAllAsync(ct));

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Room>> Create(CreateRoomRequest request, CancellationToken ct)
    {
        var room = await roomService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetAll), new { id = room.Id }, room);
    }
}
