using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.SignalR;

namespace Booking.Infrastructure.Hubs;

/// <summary>
/// SignalR's default IUserIdProvider reads ClaimTypes.NameIdentifier, but Booking.Api's JWT
/// Bearer config sets MapInboundClaims = false (see Program.cs), so the "sub" claim
/// JwtTokenGenerator issues stays "sub" instead of being remapped to that longer URI — this
/// reads the claim SignalR would otherwise never find, so Clients.User(userId) actually works.
/// </summary>
public class ReservationHubUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
}
