using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Application.Plugins;
using Booking.Application.Services;
using Booking.Application.Validators;
using Booking.Domain.Interfaces;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.SemanticKernel;

namespace Booking.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Api-only. Booking.Worker doesn't call this - it registers its own two services
    /// (IReservationReminderService/INotificationDispatchService) directly in its own
    /// Program.cs instead, since nothing here is actually shared between the two composition
    /// roots. (Previously both were registered here regardless of which root used them, which
    /// crashed at startup whenever a service's settings dependency was only bound in the other
    /// root's Program.cs - DI validation checks the whole graph, not just what gets resolved.)
    /// </summary>
    public static IServiceCollection AddBookingApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IReservationService, ReservationService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IBookingRuleEngine, BookingRuleEngine>();
        services.AddSingleton(TimeProvider.System);

        services.AddScoped<IValidator<CreateReservationRequest>, CreateReservationRequestValidator>();
        services.AddScoped<IValidator<CreateRoomRequest>, CreateRoomRequestValidator>();
        services.AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>();
        services.AddScoped<IValidator<LoginRequest>, LoginRequestValidator>();

        return services;
    }

    /// <summary>
    /// Registers Microsoft Semantic Kernel with the OpenAI chat completion backend,
    /// the two read-only booking plugins, and <see cref="IChatService"/>.
    /// Call this from Booking.Api's Program.cs after AddBookingApplication().
    /// </summary>
    public static IServiceCollection AddBookingChat(
        this IServiceCollection services, IConfiguration configuration)
    {
        var apiKey = configuration["Chat:OpenAI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException(
                "Chat:OpenAI:ApiKey is required. Set it in appsettings.json or via the OPENAI_API_KEY environment variable.");

        var model = configuration["Chat:OpenAI:Model"] ?? "gpt-4o-mini";

        // Build a kernel per DI scope so that scoped services (IRoomService,
        // IReservationService) can be injected into plugins safely.
        services.AddScoped<RoomPlugin>();
        services.AddScoped<ReservationPlugin>();

        services.AddScoped<Kernel>(sp =>
        {
            var kernelBuilder = Kernel.CreateBuilder();
            kernelBuilder.AddOpenAIChatCompletion(model, apiKey);

            // Build the kernel, then attach the scoped plugins from DI.
            var kernel = kernelBuilder.Build();
            kernel.Plugins.AddFromObject(sp.GetRequiredService<RoomPlugin>(), "rooms");
            kernel.Plugins.AddFromObject(sp.GetRequiredService<ReservationPlugin>(), "reservations");
            return kernel;
        });

        services.AddScoped<IChatService>(sp => new ChatService(
            sp.GetRequiredService<Kernel>(),
            sp.GetRequiredService<RoomPlugin>(),
            sp.GetRequiredService<ReservationPlugin>(),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ChatService>>()));

        return services;
    }
}
