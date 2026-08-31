using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace Booking.Infrastructure.Security;

public class JwtTokenGenerator(JwtSettings settings) : IJwtTokenGenerator
{
    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            // Short claim type, not ClaimTypes.Role — matches "sub" elsewhere in this token,
            // and Program.cs sets RoleClaimType = "role" so [Authorize(Roles = ...)]/IsInRole
            // still resolve it correctly despite MapInboundClaims = false leaving it unmapped.
            new Claim("role", user.Role.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(settings.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
