using Booking.Domain.Configuration;
using Booking.Domain.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace Booking.Infrastructure.External;

/// <summary>
/// Sends real email via Gmail SMTP (an app password, not the account password — see
/// https://myaccount.google.com/apppasswords). Falls back to a no-op (logged, returns false)
/// when credentials aren't configured, so local dev without a Gmail account still degrades
/// gracefully instead of throwing.
/// </summary>
public sealed class SmtpNotificationSender(GmailSmtpSettings settings, ILogger<SmtpNotificationSender> logger) : INotificationSender
{
    public async Task<bool> SendAsync(string recipientEmail, string subject, string message, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(settings.Username) || string.IsNullOrEmpty(settings.AppPassword))
        {
            logger.LogWarning(
                "[SmtpNotificationSender] Gmail:Username/Gmail:AppPassword not configured; skipping send to {Recipient}.",
                recipientEmail);
            return false;
        }

        var email = new MimeMessage();
        email.From.Add(new MailboxAddress(settings.FromDisplayName, settings.Username));
        email.To.Add(MailboxAddress.Parse(recipientEmail));
        email.Subject = subject;
        email.Body = new TextPart("plain") { Text = message };

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(settings.Host, settings.Port, SecureSocketOptions.StartTls, ct);
            await client.AuthenticateAsync(settings.Username, settings.AppPassword, ct);
            await client.SendAsync(email, ct);
            await client.DisconnectAsync(true, ct);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[SmtpNotificationSender] Failed to send to {Recipient}.", recipientEmail);
            return false;
        }
    }
}
