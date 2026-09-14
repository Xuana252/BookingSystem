using System.Net;
using System.Text.RegularExpressions;

namespace Booking.Infrastructure.External;

/// <summary>
/// Builds modern, responsive HTML email templates for reservation reminders and generic system notifications.
/// Highlights important booking details (room name, date/time, timezone, and quick actions) with a clean
/// high-contrast visual hierarchy.
/// </summary>
public static class EmailTemplateBuilder
{
    public static readonly Regex ReminderRegex = new(
        @"^Reminder: (?:(?<host>your reservation for)|(?<attendee>you're attending a reservation for)) (?<room>.*?)(?: starts at|, starting at) (?<time>.*) \((?<tz>.*)\)\.$",
        RegexOptions.Compiled);

    /// <summary>
    /// Builds an HTML email body from the notification message. If the message matches the reminder pattern
    /// (for either host or attendee), a structured reminder card is produced; otherwise, a clean generic
    /// notification template is used.
    /// </summary>
    public static string BuildHtmlBody(string subject, string message, string? dashboardUrl = null)
    {
        var match = ReminderRegex.Match(message);
        if (match.Success)
        {
            var room = match.Groups["room"].Value;
            var time = match.Groups["time"].Value;
            var tz = match.Groups["tz"].Value;
            var isAttendee = match.Groups["attendee"].Success;
            return BuildReminderHtml(subject, room, time, tz, dashboardUrl, isAttendee);
        }

        return BuildGenericHtml(subject, message, dashboardUrl);
    }

    /// <summary>
    /// Builds a styled HTML reservation reminder email with high-contrast room and time highlights.
    /// Supports tailoring badges and guidance for either the booking host or an attendee.
    /// </summary>
    public static string BuildReminderHtml(
        string subject,
        string room,
        string time,
        string tz,
        string? dashboardUrl = null,
        bool isAttendee = false)
    {
        var encodedSubject = WebUtility.HtmlEncode(subject);
        var encodedRoom = WebUtility.HtmlEncode(room);
        var encodedTime = WebUtility.HtmlEncode(time);
        var encodedTz = WebUtility.HtmlEncode(tz);
        var actionUrl = string.IsNullOrWhiteSpace(dashboardUrl) ? "#" : WebUtility.HtmlEncode(dashboardUrl);
        var currentYear = DateTime.UtcNow.Year;

        var statusPillHtml = isAttendee
            ? @"<span class=""status-pill"" style=""background-color: #fef3c7; color: #92400e; border-color: #fde68a;"">● You are Attending</span>"
            : @"<span class=""status-pill"">● Confirmed Reservation</span>";

        var introText = isAttendee
            ? "Here are the details for the meeting you are attending:"
            : "Here are the details for your upcoming reservation:";

        var tipHtml = isAttendee
            ? "<strong>Need to check details?</strong> You can view the meeting agenda, see other attendees, and check room location directly on the dashboard."
            : "<strong>Need to make changes?</strong> You can invite attendees, update meeting details, or cancel your booking directly on the dashboard before the start time.";

        return $$"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{{encodedSubject}}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        color: #1e293b;
                        background-color: #f1f5f9;
                        margin: 0;
                        padding: 0;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                    .wrapper {
                        width: 100%;
                        background-color: #f1f5f9;
                        padding: 40px 16px;
                    }
                    .container {
                        max-width: 580px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        background: linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #6366f1 100%);
                        padding: 32px 28px;
                        text-align: center;
                    }
                    .brand-badge {
                        display: inline-block;
                        background-color: rgba(255, 255, 255, 0.18);
                        border: 1px solid rgba(255, 255, 255, 0.25);
                        border-radius: 9999px;
                        padding: 4px 14px;
                        margin-bottom: 12px;
                    }
                    .brand-badge span {
                        font-size: 11px;
                        font-weight: 700;
                        color: #ffffff;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                    }
                    .header h1 {
                        color: #ffffff;
                        margin: 0;
                        font-size: 22px;
                        font-weight: 700;
                        letter-spacing: -0.01em;
                        line-height: 1.3;
                    }
                    .content {
                        padding: 32px 28px;
                    }
                    .intro {
                        font-size: 15px;
                        color: #475569;
                        margin: 0 0 24px 0;
                        line-height: 1.6;
                    }
                    .card {
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 24px;
                        margin-bottom: 24px;
                    }
                    .status-pill {
                        display: inline-block;
                        background-color: #ecfdf5;
                        color: #047857;
                        border: 1px solid #a7f3d0;
                        font-size: 11px;
                        font-weight: 700;
                        padding: 3px 10px;
                        border-radius: 9999px;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: 16px;
                    }
                    .field-group {
                        margin-bottom: 16px;
                    }
                    .field-label {
                        font-size: 11px;
                        font-weight: 700;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.06em;
                        display: block;
                        margin-bottom: 6px;
                    }
                    .room-value {
                        font-size: 22px;
                        font-weight: 800;
                        color: #0f172a;
                        letter-spacing: -0.02em;
                        margin: 0;
                    }
                    .divider {
                        height: 1px;
                        background-color: #e2e8f0;
                        margin: 16px 0;
                    }
                    .time-value {
                        font-size: 17px;
                        font-weight: 700;
                        color: #4f46e5;
                        margin: 0;
                    }
                    .tz-badge {
                        display: inline-block;
                        background-color: #e0e7ff;
                        color: #3730a3;
                        font-size: 11px;
                        font-weight: 600;
                        padding: 2px 8px;
                        border-radius: 6px;
                        margin-left: 6px;
                        vertical-align: middle;
                    }
                    .action-container {
                        text-align: center;
                        margin: 28px 0 24px 0;
                    }
                    .btn-primary {
                        display: inline-block;
                        background-color: #4f46e5;
                        color: #ffffff !important;
                        text-decoration: none;
                        font-size: 14px;
                        font-weight: 600;
                        padding: 12px 28px;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);
                    }
                    .tip-card {
                        background-color: #f1f5f9;
                        border-radius: 8px;
                        padding: 14px 18px;
                        margin-bottom: 8px;
                    }
                    .tip-text {
                        margin: 0;
                        font-size: 13px;
                        color: #64748b;
                        line-height: 1.5;
                    }
                    .tip-text strong {
                        color: #334155;
                    }
                    .footer {
                        background-color: #f8fafc;
                        padding: 20px 28px;
                        text-align: center;
                        font-size: 12px;
                        color: #94a3b8;
                        border-top: 1px solid #e2e8f0;
                    }
                    .footer p {
                        margin: 0 0 4px 0;
                    }
                    .footer p:last-child {
                        margin-bottom: 0;
                    }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        <div class="header">
                            <div class="brand-badge">
                                <span>🏢 Booking System</span>
                            </div>
                            <h1>{{encodedSubject}}</h1>
                        </div>
                        <div class="content">
                            <p class="intro">{{introText}}</p>
                            
                            <div class="card">
                                {{statusPillHtml}}
                                
                                <div class="field-group">
                                    <span class="field-label">Reserved Room</span>
                                    <div class="room-value">{{encodedRoom}}</div>
                                </div>
                                
                                <div class="divider"></div>
                                
                                <div class="field-group" style="margin-bottom: 0;">
                                    <span class="field-label">Scheduled Start Time</span>
                                    <div class="time-value">
                                        {{encodedTime}}
                                        <span class="tz-badge">{{encodedTz}}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="action-container">
                                <a href="{{actionUrl}}" class="btn-primary">View in Booking System &rarr;</a>
                            </div>

                            <div class="tip-card">
                                <p class="tip-text">
                                    {{tipHtml}}
                                </p>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This is an automated notification from Booking System.</p>
                            <p>&copy; {{currentYear}} BookingSystem. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """;
    }

    /// <summary>
    /// Builds a styled HTML generic notification email with a modern indigo accent.
    /// </summary>
    public static string BuildGenericHtml(
        string subject,
        string message,
        string? dashboardUrl = null)
    {
        var encodedSubject = WebUtility.HtmlEncode(subject);
        var encodedMessage = WebUtility.HtmlEncode(message);
        var actionUrl = string.IsNullOrWhiteSpace(dashboardUrl) ? "#" : WebUtility.HtmlEncode(dashboardUrl);
        var currentYear = DateTime.UtcNow.Year;

        return $$"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{{encodedSubject}}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        color: #1e293b;
                        background-color: #f1f5f9;
                        margin: 0;
                        padding: 0;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                    .wrapper {
                        width: 100%;
                        background-color: #f1f5f9;
                        padding: 40px 16px;
                    }
                    .container {
                        max-width: 580px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        background: linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #6366f1 100%);
                        padding: 32px 28px;
                        text-align: center;
                    }
                    .brand-badge {
                        display: inline-block;
                        background-color: rgba(255, 255, 255, 0.18);
                        border: 1px solid rgba(255, 255, 255, 0.25);
                        border-radius: 9999px;
                        padding: 4px 14px;
                        margin-bottom: 12px;
                    }
                    .brand-badge span {
                        font-size: 11px;
                        font-weight: 700;
                        color: #ffffff;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                    }
                    .header h1 {
                        color: #ffffff;
                        margin: 0;
                        font-size: 22px;
                        font-weight: 700;
                        letter-spacing: -0.01em;
                        line-height: 1.3;
                    }
                    .content {
                        padding: 32px 28px;
                    }
                    .message-box {
                        font-size: 15px;
                        color: #334155;
                        background-color: #f8fafc;
                        border-left: 4px solid #4f46e5;
                        padding: 18px 20px;
                        margin: 0 0 24px 0;
                        border-radius: 0 8px 8px 0;
                        line-height: 1.6;
                        white-space: pre-line;
                    }
                    .action-container {
                        text-align: center;
                        margin: 28px 0 24px 0;
                    }
                    .btn-primary {
                        display: inline-block;
                        background-color: #4f46e5;
                        color: #ffffff !important;
                        text-decoration: none;
                        font-size: 14px;
                        font-weight: 600;
                        padding: 12px 28px;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);
                    }
                    .footer {
                        background-color: #f8fafc;
                        padding: 20px 28px;
                        text-align: center;
                        font-size: 12px;
                        color: #94a3b8;
                        border-top: 1px solid #e2e8f0;
                    }
                    .footer p {
                        margin: 0 0 4px 0;
                    }
                    .footer p:last-child {
                        margin-bottom: 0;
                    }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        <div class="header">
                            <div class="brand-badge">
                                <span>🏢 Booking System</span>
                            </div>
                            <h1>{{encodedSubject}}</h1>
                        </div>
                        <div class="content">
                            <div class="message-box">
                                {{encodedMessage}}
                            </div>
                            
                            <div class="action-container">
                                <a href="{{actionUrl}}" class="btn-primary">Go to Booking System &rarr;</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This is an automated notification from Booking System.</p>
                            <p>&copy; {{currentYear}} BookingSystem. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """;
    }
}
