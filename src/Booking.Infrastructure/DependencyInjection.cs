using Amazon.Runtime;
using Amazon.SimpleNotificationService;
using Amazon.SQS;
using Booking.Domain.Configuration;
using Booking.Domain.Interfaces;
using Booking.Infrastructure.Messaging;
using Booking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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

        return services;
    }
}
