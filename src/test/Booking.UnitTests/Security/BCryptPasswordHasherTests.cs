using Booking.Infrastructure.Security;
using FluentAssertions;

namespace Booking.UnitTests.Security;

public class BCryptPasswordHasherTests
{
    private static BCryptPasswordHasher CreateSut() => new();

    [Fact]
    public void Verify_CorrectPasswordAgainstItsOwnHash_ReturnsTrue()
    {
        // Arrange
        var sut = CreateSut();
        var hash = sut.Hash("correct-password");

        // Act
        var result = sut.Verify("correct-password", hash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void Verify_WrongPassword_ReturnsFalse()
    {
        // Arrange
        var sut = CreateSut();
        var hash = sut.Hash("correct-password");

        // Act
        var result = sut.Verify("wrong-password", hash);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-real-bcrypt-hash")]
    public void Verify_MalformedStoredHash_ReturnsFalseInsteadOfThrowing(string malformedHash)
    {
        // Arrange
        var sut = CreateSut();

        // Act
        var act = () => sut.Verify("any-password", malformedHash);

        // Assert
        act.Should().NotThrow().Which.Should().BeFalse();
    }
}
