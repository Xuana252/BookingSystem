using Booking.Domain.Configuration;
using Booking.Infrastructure.External;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Booking.UnitTests.External;

public class SmtpNotificationSenderTests
{
    [Fact]
    public async Task SendAsync_CredentialsNotConfigured_ReturnsFalseWithoutConnecting()
    {
        // Arrange
        var settings = new GmailSmtpSettings();
        var sut = new SmtpNotificationSender(settings, NullLogger<SmtpNotificationSender>.Instance);

        // Act
        var result = await sut.SendAsync("user@example.com", "Subject", "Message");

        // Assert
        result.Should().BeFalse();
    }
}
