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

        var bodyBuilder = new BodyBuilder
        {
            TextBody = message,
            HtmlBody = EmailTemplateBuilder.BuildHtmlBody(subject, message)
        };

        email.Body = bodyBuilder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            
            // PaaS providers (like Render) often have partial/broken IPv6 routing. 
            // If DNS resolves an IPv6 address for smtp.gmail.com first and it blackholes,
            // MailKit's ConnectAsync times out before it can fall back to IPv4.
            // We resolve DNS manually and force IPv4 to bypass this.
            var ips = await System.Net.Dns.GetHostAddressesAsync(settings.Host, ct);
            var ipv4 = ips.FirstOrDefault(ip => ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                ?? throw new InvalidOperationException($"No IPv4 address found for {settings.Host}");

            using var socket = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.InterNetwork, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp);
            await socket.ConnectAsync(ipv4, settings.Port, ct);
            
            await client.ConnectAsync(socket, settings.Host, settings.Port, SecureSocketOptions.Auto, ct);
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
