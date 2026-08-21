using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Application.Services;
using Booking.Application.Validators;
using Booking.Domain.Interfaces;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Booking.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Api-only. Booking.Worker doesn't call this — it registers its own two services
    /// (IReservationReminderService/INotificationDispatchService) directly in its own
    /// Program.cs instead, since nothing here is actually shared between the two composition
    /// roots. (Previously both were registered here regardless of which root used them, which
    /// crashed at startup whenever a service's settings dependency was only bound in the other
    /// root's Program.cs — DI validation checks the whole graph, not just what gets resolved.)
    /// </summary>
    public static IServiceCollection AddBookingApplication(this IServiceCollection services)
    {
        services.AddScoped<IRoomService, RoomService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IReservationService, ReservationService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IBookingRuleEngine, BookingRuleEngine>();

        services.AddScoped<IValidator<CreateReservationRequest>, CreateReservationRequestValidator>();
        services.AddScoped<IValidator<CreateRoomRequest>, CreateRoomRequestValidator>();
        services.AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>();
        services.AddScoped<IValidator<LoginRequest>, LoginRequestValidator>();

        return services;
    }
}
