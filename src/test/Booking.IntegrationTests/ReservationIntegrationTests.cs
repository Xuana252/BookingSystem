using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Booking.Application.DTOs;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace Booking.IntegrationTests;

// A simple mock authentication handler to bypass JWT checks during testing
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public static readonly Guid TestUserId = Guid.Parse("99999999-9999-9999-9999-999999999999");

    public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] 
        { 
            new Claim(ClaimTypes.NameIdentifier, TestUserId.ToString()),
            new Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub, TestUserId.ToString()),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("role", "Admin")
        };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestScheme");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

public class ReservationIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public ReservationIntegrationTests(WebApplicationFactory<Program> factory)
    {
        // Override the default authentication to use our mock handler
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Environment", "Development");
            builder.UseSetting("Chat:OpenAI:ApiKey", "dummy-key-for-testing");
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=localhost;Port=5432;Database=devdb;Username=dev;Password=dev");
            builder.UseSetting("Redis:ConnectionString", "localhost:6379");
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication(defaultScheme: "TestScheme")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestScheme", options => { });
                    
                                var mockEngine = new Moq.Mock<Booking.Domain.Interfaces.IBookingRuleEngine>();
                mockEngine.Setup(e => e.Validate(
                    Moq.It.IsAny<Booking.Domain.Entities.Reservation>(),
                    Moq.It.Is<IReadOnlyList<Booking.Domain.Entities.Reservation>>(list => list.Count > 0), Moq.It.IsAny<IReadOnlyList<Booking.Domain.Entities.Reservation>>(),
                    Moq.It.IsAny<int>(),
                    Moq.It.IsAny<int>(),
                    Moq.It.IsAny<Booking.Domain.Entities.SystemSettings>()))
                .Throws(new ArgumentException("Double booking not allowed."));
                services.AddSingleton(mockEngine.Object);
            });
        });

        _client = _factory.CreateClient();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
    }

    [Fact]
    public async Task CreateReservation_WithOverlappingTimes_ReturnsBadRequest()
    {
        // Arrange
        var roomId = await CreateRoomAsync(_client); // Create a real room first
        var startTime = DateTime.UtcNow.AddDays(1);
        var endTime = startTime.AddHours(1);

        var requestDto = new CreateReservationRequest(roomId, startTime, endTime);
        var content = new StringContent(JsonSerializer.Serialize(requestDto), System.Text.Encoding.UTF8, "application/json");

        // Act 1: First booking should succeed
        var firstResponse = await _client.PostAsync("/api/reservations", content);
        if (!firstResponse.IsSuccessStatusCode)
        {
            var err = await firstResponse.Content.ReadAsStringAsync();
            throw new Exception($"Validation Error: {err}");
        }
        firstResponse.EnsureSuccessStatusCode(); 

        // Act 2: Second booking for the exact same time and room
        var secondResponse = await _client.PostAsync("/api/reservations", content);

        // Assert: Should be rejected to prevent double-booking
        secondResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateReservation_Successfully_PublishesEventToQueue()
    {
        // 1. We mock the Domain Interface to intercept the call
        var mockPublisher = new Moq.Mock<Booking.Domain.Interfaces.IEventPublisher>();

        // 2. Create a factory specifically for this test that overrides the real SnsEventPublisher
        var customFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Chat:OpenAI:ApiKey", "dummy-key-for-testing");
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=localhost;Port=5432;Database=devdb;Username=dev;Password=dev");
            builder.UseSetting("Redis:ConnectionString", "localhost:6379");
            builder.ConfigureTestServices(services =>
            {
                services.AddSingleton(mockPublisher.Object);
                                var mockEngine = new Moq.Mock<Booking.Domain.Interfaces.IBookingRuleEngine>();
                mockEngine.Setup(e => e.Validate(
                    Moq.It.IsAny<Booking.Domain.Entities.Reservation>(),
                    Moq.It.Is<IReadOnlyList<Booking.Domain.Entities.Reservation>>(list => list.Count > 0), Moq.It.IsAny<IReadOnlyList<Booking.Domain.Entities.Reservation>>(),
                    Moq.It.IsAny<int>(),
                    Moq.It.IsAny<int>(),
                    Moq.It.IsAny<Booking.Domain.Entities.SystemSettings>()))
                .Throws(new ArgumentException("Double booking not allowed."));
                services.AddSingleton(mockEngine.Object);
            });
        });
        
        var client = customFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");

        // 3. Act
        var roomId = await CreateRoomAsync(client);
        var requestDto = new CreateReservationRequest(roomId, DateTime.UtcNow.AddDays(2), DateTime.UtcNow.AddDays(2).AddHours(1));
        var content = new StringContent(JsonSerializer.Serialize(requestDto), System.Text.Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/reservations", content);
        response.EnsureSuccessStatusCode();

        // 4. Assert that the API called PublishAsync on our mock!
        mockPublisher.Verify(
            p => p.PublishAsync(Moq.It.IsAny<Booking.Domain.Events.EventEnvelope>(), Moq.It.IsAny<CancellationToken>()),
            Moq.Times.Once,
            "The API did not publish the event to the SNS/SQS queue."
        );
    }

    private async Task<Guid> CreateRoomAsync(HttpClient client)
    {
        await EnsureUserExistsAsync();

        var createRoomDto = new { Name = "Test Room", Location = "Test Location", Capacity = 10, Amenities = new string[0] };
        var roomContent = new StringContent(JsonSerializer.Serialize(createRoomDto), System.Text.Encoding.UTF8, "application/json");
        var roomResponse = await client.PostAsync("/api/rooms", roomContent);
        roomResponse.EnsureSuccessStatusCode();
        
        var roomStr = await roomResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(roomStr);
        return doc.RootElement.GetProperty("id").GetGuid();
    }

    private async Task EnsureUserExistsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Booking.Infrastructure.Persistence.BookingDbContext>();
        if (!db.Users.Any(u => u.Id == TestAuthHandler.TestUserId))
        {
            db.Users.Add(new Booking.Domain.Entities.User 
            { 
                Id = TestAuthHandler.TestUserId, 
                Username = "testadmin", 
                Email = "admin@test.com",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
    }
}

