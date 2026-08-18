using Booking.Application.Interfaces;
using Booking.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Booking.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddBookingApplication(this IServiceCollection services)
    {
        services.AddScoped<IRoomService, RoomService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IReservationService, ReservationService>();
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }
}
