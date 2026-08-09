namespace Booking.Domain.Configuration;

/// <summary>
/// AWS endpoint config. Points at Moto locally, real AWS in production.
/// </summary>
public class AwsSettings
{
    public string EndpointUrl { get; set; } = string.Empty;
    public string SnsTopicArn { get; set; } = string.Empty;
    public string SqsQueueUrl { get; set; } = string.Empty;
}
