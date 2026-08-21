using System.Text;
using Booking.Api.Configuration;
using Booking.Api.Filters;
using Booking.Api.Middleware;
using Booking.Application;
using Booking.Domain.Configuration;
using Booking.Infrastructure;
using Booking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// JSON, not the human-readable text template — the Splunk log-shipping pipeline (see
// docker-compose.yml's fluent-bit service) parses stdout as structured JSON. No app code
// knows Splunk exists; it just writes structured logs, same as local `dotnet run`.
builder.Host.UseSerilog((context, config) => config
    .ReadFrom.Configuration(context.Configuration)
    .WriteTo.Console(new Serilog.Formatting.Json.JsonFormatter()));

builder.Services.AddControllers(options => options.Filters.Add<FluentValidationActionFilter>());
builder.Services.AddHealthChecks();

// Booking.UI is served from a different origin (Vite dev server or the dockerized nginx build
// both land on localhost:5173 — see docker-compose.yml's ui service) than the Api (5133/8080),
// so browser fetch() calls need an explicit CORS policy or they're blocked client-side even
// though the Api itself responds fine. Bearer-token auth (no cookies), so no AllowCredentials.
const string uiCorsPolicy = "BookingUi";
builder.Services.AddCors(options =>
{
    options.AddPolicy(uiCorsPolicy, policy => policy
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeDocumentTransformer>();
    options.AddOperationTransformer<BearerSecurityRequirementOperationTransformer>();
});
builder.Services.AddBookingInfrastructure(builder.Configuration);
builder.Services.AddBookingApplication();

var reservationRuleSettings = builder.Configuration.GetSection("ReservationRules").Get<ReservationRuleSettings>() ?? new ReservationRuleSettings();
builder.Services.AddSingleton(reservationRuleSettings);

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ValidateLifetime = true
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// Applies any pending migrations on startup (idempotent — no-op once the DB is current).
// Keeps the fully-dockerized stack self-provisioning, the same way moto-init provisions SNS/SQS.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<BookingDbContext>().Database.Migrate();
}

app.UseGlobalExceptionHandling();
app.UseHttpsRedirection();
app.UseCors(uiCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.Run();
