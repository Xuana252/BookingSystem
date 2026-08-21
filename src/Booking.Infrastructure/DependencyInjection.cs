using Amazon.Runtime;
using Amazon.SimpleNotificationService;
using Amazon.SQS;
using Booking.Domain.Configuration;
using Booking.Domain.Interfaces;
using Booking.Infrastructure.External;
using Booking.Infrastructure.Http;
using Booking.Infrastructure.Messaging;
using Booking.Infrastructure.Persistence;
using Booking.Infrastructure.Persistence.Repositories;
using Booking.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Booking.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddBookingInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing ConnectionStrings:DefaultConnection.");

        services.AddDbContext<BookingDbContext>(options => options.UseNpgsql(connectionString));

        var awsSettings = configuration.GetSection("Aws").Get<AwsSettings>() ?? new AwsSettings();
        services.AddSingleton(awsSettings);

        var isLocal = awsSettings.EndpointUrl.Contains("localhost") || awsSettings.EndpointUrl.Contains("moto");

        services.AddSingleton<IAmazonSimpleNotificationService>(_ =>
        {
            var config = new AmazonSimpleNotificationServiceConfig { ServiceURL = awsSettings.EndpointUrl };
            if (!isLocal)
            {
                return new AmazonSimpleNotificationServiceClient(config);
            }
            config.AuthenticationRegion = "us-east-1";
            return new AmazonSimpleNotificationServiceClient(new BasicAWSCredentials("test", "test"), config);
        });

        services.AddSingleton<IAmazonSQS>(_ =>
        {
            var config = new AmazonSQSConfig { ServiceURL = awsSettings.EndpointUrl };
            if (!isLocal)
            {
                return new AmazonSQSClient(config);
            }
            config.AuthenticationRegion = "us-east-1";
            return new AmazonSQSClient(new BasicAWSCredentials("test", "test"), config);
        });

        services.AddScoped<IEventPublisher, SnsEventPublisher>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICorrelationIdAccessor, HttpContextCorrelationIdAccessor>();

        services.AddScoped<IRoomRepository, RoomRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();

        var redisSettings = configuration.GetSection("Redis").Get<RedisSettings>() ?? new RedisSettings();
        services.AddSingleton(redisSettings);
        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisSettings.ConnectionString));
        services.AddScoped<ReservationRepository>();
        services.AddScoped<IReservationRepository>(sp => new CachedReservationRepository(
            sp.GetRequiredService<ReservationRepository>(),
            sp.GetRequiredService<IConnectionMultiplexer>()));

        var jwtSettings = configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
        services.AddSingleton(jwtSettings);
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        var gmailSettings = configuration.GetSection("Gmail").Get<GmailSmtpSettings>() ?? new GmailSmtpSettings();
        services.AddSingleton(gmailSettings);
        services.AddScoped<INotificationSender, SmtpNotificationSender>();

        return services;
    }
}
