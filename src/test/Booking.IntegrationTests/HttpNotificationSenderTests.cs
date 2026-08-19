using System.Net;
using Booking.Infrastructure.External;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Booking.IntegrationTests;

public class HttpNotificationSenderTests : IDisposable
{
    private readonly WireMockServer _server = WireMockServer.Start();

    private HttpNotificationSender CreateSut()
    {
        var httpClient = new HttpClient { BaseAddress = new Uri(_server.Url!) };
        return new HttpNotificationSender(httpClient, NullLogger<HttpNotificationSender>.Instance);
    }

    [Fact]
    public async Task SendAsync_ProviderReturns200_ReturnsTrueAndPostsExpectedPayload()
    {
        // Arrange
        _server
            .Given(Request.Create().WithPath("/notifications").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        // Act
        var result = await CreateSut().SendAsync("user@example.com", "Reservation Reminder", "Your reservation starts soon.");

        // Assert
        result.Should().BeTrue();
        var logEntry = _server.LogEntries.Should().ContainSingle().Subject;
        var requestBody = logEntry.RequestMessage!.Body;
        requestBody.Should().NotBeNull();
        requestBody!.Should().Contain("user@example.com").And.Contain("Reservation Reminder");
    }

    [Fact]
    public async Task SendAsync_ProviderReturns500_ReturnsFalse()
    {
        // Arrange
        _server
            .Given(Request.Create().WithPath("/notifications").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.InternalServerError));

        // Act
        var result = await CreateSut().SendAsync("user@example.com", "Reservation Reminder", "Your reservation starts soon.");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task SendAsync_ProviderUnreachable_ReturnsFalseInsteadOfThrowing()
    {
        // Arrange
        var sut = CreateSut();
        _server.Stop();

        // Act
        var act = async () => await sut.SendAsync("user@example.com", "Reservation Reminder", "Your reservation starts soon.");

        // Assert
        var result = await act.Should().NotThrowAsync();
        result.Which.Should().BeFalse();
    }

    public void Dispose() => _server.Dispose();
}
