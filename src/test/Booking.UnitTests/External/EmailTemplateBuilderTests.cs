using Booking.Infrastructure.External;
using FluentAssertions;

namespace Booking.UnitTests.External;

public class EmailTemplateBuilderTests
{
    [Fact]
    public void BuildHtmlBody_WithReminderFormat_RendersStyledReminderCardWithHighlights()
    {
        // Arrange
        var subject = "Upcoming Meeting Reminder";
        var message = "Reminder: your reservation for Boardroom Alpha starts at Monday, September 7 at 2:00 PM (Asia/Ho_Chi_Minh).";

        // Act
        var html = EmailTemplateBuilder.BuildHtmlBody(subject, message);

        // Assert
        html.Should().Contain("Boardroom Alpha");
        html.Should().Contain("Monday, September 7 at 2:00 PM");
        html.Should().Contain("Asia/Ho_Chi_Minh");
        html.Should().Contain("Upcoming Meeting Reminder");
        html.Should().Contain("Confirmed Reservation");
        html.Should().Contain("brand-badge");
        html.Should().Contain("room-value");
        html.Should().Contain("time-value");
        html.Should().Contain("tz-badge");
        html.Should().Contain("btn-primary");
        html.Should().Contain("tip-card");
    }

    [Fact]
    public void BuildHtmlBody_WithGenericMessage_RendersGenericCardWithMessage()
    {
        // Arrange
        var subject = "Welcome to Booking System";
        var message = "Your account has been activated successfully.";

        // Act
        var html = EmailTemplateBuilder.BuildHtmlBody(subject, message);

        // Assert
        html.Should().Contain("Welcome to Booking System");
        html.Should().Contain("Your account has been activated successfully.");
        html.Should().Contain("message-box");
        html.Should().Contain("btn-primary");
        html.Should().Contain("brand-badge");
        html.Should().NotContain("room-value");
    }

    [Fact]
    public void BuildHtmlBody_WithSpecialCharacters_HtmlEncodesValues()
    {
        // Arrange
        var subject = "Alert <Test> & Note";
        var message = "Reminder: your reservation for Room <Omega> & Lounge starts at 3:00 PM (UTC).";

        // Act
        var html = EmailTemplateBuilder.BuildHtmlBody(subject, message);

        // Assert
        html.Should().Contain("Room &lt;Omega&gt; &amp; Lounge");
        html.Should().Contain("Alert &lt;Test&gt; &amp; Note");
        html.Should().NotContain("<Omega>");
    }

    [Fact]
    public void BuildReminderHtml_WithCustomDashboardUrl_RendersActionUrl()
    {
        // Arrange
        var dashboardUrl = "https://booking.company.internal/dashboard";

        // Act
        var html = EmailTemplateBuilder.BuildReminderHtml("Subject", "Falcon", "10:00 AM", "UTC", dashboardUrl);

        // Assert
        html.Should().Contain("href=\"https://booking.company.internal/dashboard\"");
    }

    [Fact]
    public void BuildHtmlBody_WithAttendeeReminderFormat_RendersStyledReminderCardForAttendee()
    {
        // Arrange
        var subject = "Upcoming Meeting Reminder";
        var message = "Reminder: you're attending a reservation for Executive Suite, starting at Tuesday, October 12 at 3:30 PM (UTC).";

        // Act
        var html = EmailTemplateBuilder.BuildHtmlBody(subject, message);

        // Assert
        html.Should().Contain("Executive Suite");
        html.Should().Contain("Tuesday, October 12 at 3:30 PM");
        html.Should().Contain("UTC");
        html.Should().Contain("You are Attending");
        html.Should().Contain("meeting you are attending");
        html.Should().Contain("brand-badge");
        html.Should().Contain("room-value");
        html.Should().Contain("time-value");
        html.Should().Contain("tz-badge");
        html.Should().Contain("btn-primary");
        html.Should().Contain("tip-card");
        html.Should().NotContain("cancel your booking");
    }
}
