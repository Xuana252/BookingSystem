using Booking.Application.Interfaces;
using Booking.Application.Services;
using Booking.Domain.Configuration;
using Booking.Infrastructure;
using Booking.Infrastructure.Persistence;
using Booking.Worker;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// JSON, not the human-readable text template — the Splunk log-shipping pipeline (see
// docker-compose.yml's fluent-bit service) parses stdout as structured JSON. No app code
// knows Splunk exists; it just writes structured logs, same as local `dotnet run`.
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console(new Serilog.Formatting.Json.JsonFormatter())
    .CreateLogger();
builder.Services.AddSerilog();

builder.Services.AddBookingInfrastructure(builder.Configuration);

// Not Booking.Application's AddBookingApplication() — that method registers Api-only services
// (RoomService/UserService/ReservationService/AuthService/BookingRuleEngine + validators), none
// of which Worker uses, and BookingRuleEngine needs ReservationRuleSettings, which Worker never
// binds. Worker only needs these two, registered directly here.
builder.Services.AddScoped<IReservationReminderService, ReservationReminderService>();
builder.Services.AddScoped<INotificationDispatchService, NotificationDispatchService>();

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

// UseHangfireDashboard() with no options defaults to a local-requests-only authorization
// filter. That check is against the *container's* view of the connecting IP — a browser on
// the host hitting the docker-compose-published port arrives at the container via the Docker
// bridge network, not 127.0.0.1, so the default filter rejects it as "not local" (401) even
// for genuinely local dev access. No real auth here — fine for local dev, but this dashboard
// exposes job internals and should never be reachable unauthenticated anywhere real; a proper
// IDashboardAuthorizationFilter belongs here before this is ever deployed anywhere but a dev box.
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = []
});

app.Services.GetRequiredService<IRecurringJobManager>().AddOrUpdate<IReservationReminderService>(
    "reservation-reminder-scan",
    svc => svc.ScanAndPublishDueRemindersAsync(CancellationToken.None),
    reminderSettings.CronExpression);

app.Run();
