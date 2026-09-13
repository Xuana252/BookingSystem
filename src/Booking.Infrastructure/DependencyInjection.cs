using Amazon;
using Amazon.Runtime;
using Amazon.SimpleNotificationService;
using Amazon.SQS;
using Booking.Domain.Configuration;
using Booking.Domain.Interfaces;
using Booking.Infrastructure.External;
using Booking.Infrastructure.Http;
using Booking.Infrastructure.Hubs;
using Booking.Infrastructure.Messaging;
using Booking.Infrastructure.Persistence;
using Booking.Infrastructure.Persistence.Repositories;
using Booking.Infrastructure.Security;
using Microsoft.AspNetCore.SignalR;
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

        // Fallback to standard AWS-style env vars for each field.
        // Render (and most PaaS) set AWS_REGION etc. directly; ASP.NET config binding
        // only picks up Aws__Region (double-underscore prefix), so we read them manually.
        if (string.IsNullOrWhiteSpace(awsSettings.EndpointUrl))
            awsSettings.EndpointUrl = Environment.GetEnvironmentVariable("AWS_ENDPOINT_URL") ?? string.Empty;
        if (string.IsNullOrWhiteSpace(awsSettings.Region))
            awsSettings.Region = Environment.GetEnvironmentVariable("AWS_REGION") ?? "us-east-1";
        if (string.IsNullOrWhiteSpace(awsSettings.SnsTopicArn))
            awsSettings.SnsTopicArn = Environment.GetEnvironmentVariable("AWS_SNS_TOPIC_ARN") ?? string.Empty;
        if (string.IsNullOrWhiteSpace(awsSettings.SqsQueueUrl))
            awsSettings.SqsQueueUrl = Environment.GetEnvironmentVariable("AWS_SQS_QUEUE_URL") ?? string.Empty;

        services.AddSingleton(awsSettings);

        // Toggle between Moto and real AWS purely via config: Aws:EndpointUrl set (contains
        // "localhost"/"moto") -> Moto, with dummy creds and ServiceURL overridden to point at
        // it; Aws:EndpointUrl empty -> real AWS, using RegionEndpoint (never ServiceURL — an
        // empty ServiceURL isn't the same as "unset" to the SDK, it tries to hit a blank host)
        // and the default credential provider chain (env vars / shared credentials file / IAM
        // role), never hardcoded credentials.
        var isLocal = awsSettings.EndpointUrl.Contains("localhost") || awsSettings.EndpointUrl.Contains("moto");

        services.AddSingleton<IAmazonSimpleNotificationService>(_ =>
        {
            if (!isLocal)
            {
                var realConfig = new AmazonSimpleNotificationServiceConfig
                {
                    RegionEndpoint = RegionEndpoint.GetBySystemName(awsSettings.Region)
                };
                return new AmazonSimpleNotificationServiceClient(realConfig);
            }

            var config = new AmazonSimpleNotificationServiceConfig
            {
                ServiceURL = awsSettings.EndpointUrl,
                AuthenticationRegion = awsSettings.Region
            };
            return new AmazonSimpleNotificationServiceClient(new BasicAWSCredentials("test", "test"), config);
        });

        services.AddSingleton<IAmazonSQS>(_ =>
        {
            if (!isLocal)
            {
                var realConfig = new AmazonSQSConfig
                {
                    RegionEndpoint = RegionEndpoint.GetBySystemName(awsSettings.Region)
                };
                return new AmazonSQSClient(realConfig);
            }

            var config = new AmazonSQSConfig
            {
                ServiceURL = awsSettings.EndpointUrl,
                AuthenticationRegion = awsSettings.Region
            };
            return new AmazonSQSClient(new BasicAWSCredentials("test", "test"), config);
        });

        services.AddScoped<IEventPublisher, SnsEventPublisher>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICorrelationIdAccessor, HttpContextCorrelationIdAccessor>();

        services.AddScoped<IRoomRepository, RoomRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IReservationAttendeeRepository, ReservationAttendeeRepository>();

        // Shared here (not one composition root's own Program.cs) since both BookingRuleEngine
        // (Api) and NotificationDispatchService (Worker) need it.
        var businessSettings = configuration.GetSection("Business").Get<BusinessSettings>() ?? new BusinessSettings();
        services.AddSingleton(businessSettings);

        var redisSettings = configuration.GetSection("Redis").Get<RedisSettings>() ?? new RedisSettings();
        services.AddSingleton(redisSettings);
        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisSettings.ConnectionString));
        services.AddScoped<ReservationRepository>();
        services.AddScoped<IReservationRepository>(sp => new CachedReservationRepository(
            sp.GetRequiredService<ReservationRepository>(),
            sp.GetRequiredService<IConnectionMultiplexer>()));

        // Shared here too — Booking.Api hosts the actual hub endpoint clients connect to, but
        // Booking.Worker only ever pushes reminder notifications through an IHubContext with no
        // client connections of its own. Both need AddSignalR() registered; the Redis backplane
        // is what relays a broadcast raised from either process to clients connected on Api.
        services.AddSignalR().AddStackExchangeRedis(redisSettings.ConnectionString);
        services.AddSingleton<IUserIdProvider, ReservationHubUserIdProvider>();
        services.AddScoped<IRealtimeNotifier, SignalRRealtimeNotifier>();

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
