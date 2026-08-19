using Booking.Application;
using Booking.Application.Interfaces;
using Booking.Domain.Configuration;
using Booking.Infrastructure;
using Booking.Infrastructure.Persistence;
using Booking.Worker;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .CreateLogger();
builder.Services.AddSerilog();

builder.Services.AddBookingInfrastructure(builder.Configuration);
builder.Services.AddBookingApplication();

var reminderSettings = builder.Configuration.GetSection("ReservationReminder").Get<ReservationReminderSettings>() ?? new ReservationReminderSettings();
builder.Services.AddSingleton(reminderSettings);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:DefaultConnection.");

builder.Services.AddHangfire(config => config
    .UsePostgreSqlStorage(options => options.UseNpgsqlConnection(connectionString)));
builder.Services.AddHangfireServer();

builder.Services.AddHostedService<SqsConsumerWorker>();

var app = builder.Build();

// Applies any pending migrations on startup, same as Booking.Api — keeps the fully-dockerized
// stack self-provisioning regardless of which of the two starts first.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<BookingDbContext>().Database.Migrate();
}

app.UseHangfireDashboard();

app.Services.GetRequiredService<IRecurringJobManager>().AddOrUpdate<IReservationReminderService>(
    "reservation-reminder-scan",
    svc => svc.ScanAndPublishDueRemindersAsync(CancellationToken.None),
    reminderSettings.CronExpression);

app.Run();
