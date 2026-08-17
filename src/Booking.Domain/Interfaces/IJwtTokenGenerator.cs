using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
