using Booking.Application.DTOs;
using Booking.Application.Features.Rooms.Commands;
using Booking.Application.Features.Rooms.Queries;
using Booking.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Room>>> GetAll([FromQuery] bool includeInactive = true, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetRoomsQuery(includeInactive), ct);
        return Ok(result);
    }

    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<Room>>> GetAllIncludingInactive(CancellationToken ct)
    {
        var result = await mediator.Send(new GetRoomsQuery(true), ct);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Room>> Create(CreateRoomRequest request, CancellationToken ct)
    {
        var command = new CreateRoomCommand(request.Name, request.Location, request.Capacity, request.Amenities, request.WebhookUrls);
        var room = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetAll), new { id = room.Id }, room);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Room>> Update(Guid id, UpdateRoomRequest request, CancellationToken ct)
    {
        var command = new UpdateRoomCommand(id, request.Name, request.Location, request.Capacity, request.Amenities, request.WebhookUrls);
        var room = await mediator.Send(command, ct);
        return Ok(room);
    }

    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        await mediator.Send(new SetRoomActiveStateCommand(id, false), ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
    {
        await mediator.Send(new SetRoomActiveStateCommand(id, true), ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/webhooks")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateWebhooks(Guid id, [FromBody] List<string> webhookUrls, CancellationToken ct)
    {
        await mediator.Send(new UpdateRoomWebhooksCommand(id, webhookUrls), ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/amenities")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAmenities(Guid id, [FromBody] List<string> amenities, CancellationToken ct)
    {
        await mediator.Send(new UpdateRoomAmenitiesCommand(id, amenities), ct);
        return NoContent();
    }
}
