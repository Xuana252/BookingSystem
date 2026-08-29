namespace Booking.Domain.Configuration;

public class GmailSmtpSettings
{
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string AppPassword { get; set; } = string.Empty;
    public string FromDisplayName { get; set; } = "BookingSystem";
}
