using System.Security.Claims;
using Booking.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

public record ChatRequest(string SessionId, string Message);
public record ChatResponse(string Reply);

[ApiController, Route("api/[controller]"), Authorize]
public class ChatController(IChatService chatService) : ControllerBase
{
    /// <summary>
    /// Send a message to the AI booking concierge and receive a reply.
    /// Conversation context is maintained server-side per SessionId.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ChatResponse>> Chat(
        [FromBody] ChatRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Message))
            return BadRequest("Message cannot be empty.");

        var userIdClaim = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var reply = await chatService.ChatAsync(req.SessionId, req.Message, userId, ct);
        return Ok(new ChatResponse(reply));
    }
}
