using Booking.Domain.Interfaces;

namespace Booking.Infrastructure.Security;

public class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);

    public bool Verify(string password, string passwordHash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch (Exception)
        {
            // Malformed/empty stored hash (e.g. legacy rows from before password hashing
            // existed) throws ArgumentException for an empty string, BCrypt.Net.SaltParseException
            // for a non-empty-but-invalid one — different, unrelated exception types, and this
            // method does nothing but this one library call, so any failure here legitimately
            // means "can't verify" — treat it like any wrong password (false), not an unhandled
            // parsing error that leaks BCrypt's internals via a 400.
            return false;
        }
    }
}
