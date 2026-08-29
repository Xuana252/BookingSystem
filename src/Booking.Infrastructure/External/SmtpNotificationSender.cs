using System.Text.RegularExpressions;
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
    private static readonly Regex ReminderRegex = new(
        @"^Reminder: your reservation for (?<room>.*) starts at (?<time>.*) \((?<tz>.*)\)\.$",
        RegexOptions.Compiled);

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
            TextBody = message
        };

        var match = ReminderRegex.Match(message);
        if (match.Success)
        {
            var room = match.Groups["room"].Value;
            var time = match.Groups["time"].Value;
            var tz = match.Groups["tz"].Value;

            bodyBuilder.HtmlBody = $$"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            color: #1f2937;
                            background-color: #f3f4f6;
                            margin: 0;
                            padding: 0;
                            -webkit-font-smoothing: antialiased;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            background-color: #ffffff;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                            border: 1px solid #e5e7eb;
                        }
                        .header {
                            background-color: #4f46e5;
                            padding: 24px;
                            text-align: center;
                        }
                        .header h1 {
                            color: #ffffff;
                            margin: 0;
                            font-size: 20px;
                            font-weight: 600;
                            letter-spacing: 0.025em;
                        }
                        .content {
                            padding: 32px 24px;
                            line-height: 1.6;
                        }
                        .intro {
                            font-size: 16px;
                            color: #4b5563;
                            margin: 0 0 20px 0;
                        }
                        .card {
                            background-color: #f9fafb;
                            border: 1px solid #e5e7eb;
                            border-radius: 6px;
                            padding: 20px;
                            margin-bottom: 24px;
                        }
                        .card-item {
                            margin-bottom: 16px;
                        }
                        .card-item:last-child {
                            margin-bottom: 0;
                        }
                        .card-label {
                            font-size: 12px;
                            font-weight: 600;
                            color: #6b7280;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            display: block;
                            margin-bottom: 4px;
                        }
                        .card-value-room {
                            font-size: 22px;
                            font-weight: 800;
                            color: #111827;
                        }
                        .card-value-time {
                            font-size: 18px;
                            font-weight: 700;
                            color: #4f46e5;
                        }
                        .card-value-tz {
                            font-size: 14px;
                            font-weight: 400;
                            color: #6b7280;
                        }
                        .footer {
                            background-color: #f9fafb;
                            padding: 16px 24px;
                            text-align: center;
                            font-size: 12px;
                            color: #9ca3af;
                            border-top: 1px solid #e5e7eb;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>{{subject}}</h1>
                        </div>
                        <div class="content">
                            <p class="intro">Here are the details for your upcoming reservation:</p>
                            
                            <div class="card">
                                <div class="card-item">
                                    <span class="card-label">Room</span>
                                    <span class="card-value-room">{{room}}</span>
                                </div>
                                <div class="card-item">
                                    <span class="card-label">Starts At</span>
                                    <span class="card-value-time">{{time}} <span class="card-value-tz">({{tz}})</span></span>
                                </div>
                            </div>

                            <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                If you need to make changes or cancel your booking, please log in to the Booking System dashboard.
                            </p>
                        </div>
                        <div class="footer">
                            &copy; {{DateTime.UtcNow.Year}} BookingSystem. All rights reserved.
                        </div>
                    </div>
                </body>
                </html>
                """
            ;
        }
        else
        {
            bodyBuilder.HtmlBody = $$"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            color: #1f2937;
                            background-color: #f3f4f6;
                            margin: 0;
                            padding: 0;
                            -webkit-font-smoothing: antialiased;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            background-color: #ffffff;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                            border: 1px solid #e5e7eb;
                        }
                        .header {
                            background-color: #4f46e5;
                            padding: 24px;
                            text-align: center;
                        }
                        .header h1 {
                            color: #ffffff;
                            margin: 0;
                            font-size: 20px;
                            font-weight: 600;
                            letter-spacing: 0.025em;
                        }
                        .content {
                            padding: 32px 24px;
                            line-height: 1.6;
                        }
                        .message {
                            font-size: 16px;
                            color: #374151;
                            background-color: #f9fafb;
                            border-left: 4px solid #4f46e5;
                            padding: 16px;
                            margin: 0 0 24px 0;
                            border-radius: 0 4px 4px 0;
                        }
                        .footer {
                            background-color: #f9fafb;
                            padding: 16px 24px;
                            text-align: center;
                            font-size: 12px;
                            color: #9ca3af;
                            border-top: 1px solid #e5e7eb;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>{{subject}}</h1>
                        </div>
                        <div class="content">
                            <div class="message">
                                {{message}}
                            </div>
                            <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                If you need to make changes or cancel your booking, please log in to the Booking System dashboard.
                            </p>
                        </div>
                        <div class="footer">
                            &copy; {{DateTime.UtcNow.Year}} BookingSystem. All rights reserved.
                        </div>
                    </div>
                </body>
                </html>
                """
            ;
        }

        email.Body = bodyBuilder.ToMessageBody();

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
