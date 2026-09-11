using System.Security.Claims;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

public record ChatRequest(string SessionId, string Message);

/// <param name="Reply">The assistant text reply.</param>
/// <param name="Rooms">
/// Populated when the LLM called a rooms tool this turn — the exact filtered set
/// the model worked with. Frontend uses this to render booking cards.
/// </param>
/// <param name="SlotStart">Requested slot start (from GetAvailableRooms), pre-fills booking card times.</param>
/// <param name="SlotEnd">Requested slot end (from GetAvailableRooms), pre-fills booking card times.</param>
public record ChatResponse(
    string Reply,
    IReadOnlyList<ChatRoomResult>? Rooms = null,
    DateTime? SlotStart = null,
    DateTime? SlotEnd = null,
    IReadOnlyList<ChatReservationResult>? Reservations = null);

[ApiController, Route("api/[controller]"), Authorize]
public class ChatController(IChatService chatService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ChatResponse>> Chat(
        [FromBody] ChatRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Message))
            return BadRequest("Message cannot be empty.");

        var userIdClaim = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var result = await chatService.ChatAsync(req.SessionId, req.Message, userId, ct);
        return Ok(new ChatResponse(result.Reply, result.Rooms, result.SlotStart, result.SlotEnd, result.Reservations));
    }
}
