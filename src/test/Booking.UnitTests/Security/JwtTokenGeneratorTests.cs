using System.IdentityModel.Tokens.Jwt;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Infrastructure.Security;
using FluentAssertions;

namespace Booking.UnitTests.Security;

public class JwtTokenGeneratorTests
{
    private static readonly JwtSettings Settings = new()
    {
        Secret = "test-signing-secret-at-least-256-bits-long-for-hmacsha256",
        Issuer = "BookingSystem",
        Audience = "BookingSystem",
        ExpiryMinutes = 60
    };

    private static JwtTokenGenerator CreateSut() => new(Settings);

    [Fact]
    public void GenerateToken_AdminUser_IncludesAdminRoleClaim()
    {
        // Arrange
        var user = new User { Username = "admin", Email = "admin@bookingsystem.local", Role = UserRole.Admin };

        // Act
        var token = CreateSut().GenerateToken(user);

        // Assert
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Claims.Should().ContainSingle(c => c.Type == "role" && c.Value == "Admin");
    }

    [Fact]
    public void GenerateToken_EmployeeUser_IncludesEmployeeRoleClaim()
    {
        // Arrange
        var user = new User { Username = "alice", Email = "alice@example.com", Role = UserRole.Employee };

        // Act
        var token = CreateSut().GenerateToken(user);

        // Assert
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Claims.Should().ContainSingle(c => c.Type == "role" && c.Value == "Employee");
    }
}
