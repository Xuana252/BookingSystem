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
    public async Task<ActionResult<IEnumerable<Room>>> GetAll([FromQuery] bool includeInactive = true, CancellationToken ct = default)
    {
        var result = includeInactive
            ? await roomService.GetAllIncludingInactiveAsync(ct)
            : await roomService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<Room>>> GetAllIncludingInactive(CancellationToken ct)
        => Ok(await roomService.GetAllIncludingInactiveAsync(ct));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Room>> Create(CreateRoomRequest request, CancellationToken ct)
    {
        var room = await roomService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetAll), new { id = room.Id }, room);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Room>> Update(Guid id, UpdateRoomRequest request, CancellationToken ct)
    {
        var room = await roomService.UpdateAsync(id, request, ct);
        return Ok(room);
    }

    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        await roomService.DeactivateAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
    {
        await roomService.ActivateAsync(id, ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/webhooks")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateWebhooks(Guid id, [FromBody] List<string> webhookUrls, CancellationToken ct)
    {
        await roomService.UpdateWebhooksAsync(id, webhookUrls, ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/amenities")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAmenities(Guid id, [FromBody] List<string> amenities, CancellationToken ct)
    {
        await roomService.UpdateAmenitiesAsync(id, amenities, ct);
        return NoContent();
    }
}
