using Amazon.Runtime;
using Amazon.SQS;
using Booking.Domain.Configuration;
using Booking.Worker;
using Serilog;

var builder = Host.CreateApplicationBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .CreateLogger();
builder.Services.AddSerilog();

var awsSettings = builder.Configuration.GetSection("Aws").Get<AwsSettings>() ?? new AwsSettings();
builder.Services.AddSingleton(awsSettings);

var isLocal = awsSettings.EndpointUrl.Contains("localhost") || awsSettings.EndpointUrl.Contains("moto");
builder.Services.AddSingleton<IAmazonSQS>(_ =>
{
    var config = new AmazonSQSConfig { ServiceURL = awsSettings.EndpointUrl };
    if (!isLocal)
    {
        return new AmazonSQSClient(config);
    }
    config.AuthenticationRegion = "us-east-1";
    return new AmazonSQSClient(new BasicAWSCredentials("test", "test"), config);
});

builder.Services.AddHostedService<SqsConsumerWorker>();

var host = builder.Build();
host.Run();
