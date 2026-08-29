using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Middleware;

/// <summary>
/// Catches unhandled exceptions and returns a consistent problem-details-style body, replacing
/// the ad-hoc per-controller try/catch blocks that used to handle this individually.
/// </summary>
public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var (statusCode, title) = ex switch
        {
            ArgumentException => (StatusCodes.Status400BadRequest, "Invalid request."),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Authentication failed."),
            InvalidOperationException => (StatusCodes.Status409Conflict, "Conflict."),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(ex, "[GlobalExceptionMiddleware] Unhandled exception processing {Method} {Path}.",
                context.Request.Method, context.Request.Path);
        }
        else
        {
            logger.LogWarning(ex, "[GlobalExceptionMiddleware] {Title} while processing {Method} {Path}.",
                title, context.Request.Method, context.Request.Path);
        }

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            // Don't leak internal exception messages for unexpected (500) failures.
            Detail = statusCode == StatusCodes.Status500InternalServerError ? "An unexpected error occurred." : ex.Message,
            Instance = context.Request.Path
        };

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(problem);
    }
}
