using System.Text.Json;
using Booking.Api.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace Booking.UnitTests.Middleware;

public class GlobalExceptionMiddlewareTests
{
    private static async Task<(int StatusCode, ProblemDetails Problem)> InvokeAsync(Exception exceptionToThrow)
    {
        var context = new DefaultHttpContext
        {
            Response = { Body = new MemoryStream() }
        };
        context.Request.Path = "/api/test";

        var sut = new GlobalExceptionMiddleware(_ => throw exceptionToThrow, NullLogger<GlobalExceptionMiddleware>.Instance);

        await sut.InvokeAsync(context);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var body = await reader.ReadToEndAsync();
        var problem = JsonSerializer.Deserialize<ProblemDetails>(body);

        return (context.Response.StatusCode, problem!);
    }

    [Fact]
    public async Task InvokeAsync_ArgumentException_Returns400WithExceptionMessage()
    {
        // Arrange
        var exception = new ArgumentException("EndTime must be after StartTime.");

        // Act
        var (statusCode, problem) = await InvokeAsync(exception);

        // Assert
        statusCode.Should().Be(StatusCodes.Status400BadRequest);
        problem.Detail.Should().Be(exception.Message);
    }

    [Fact]
    public async Task InvokeAsync_UnauthorizedAccessException_Returns401WithExceptionMessage()
    {
        // Arrange
        var exception = new UnauthorizedAccessException("Invalid username or password.");

        // Act
        var (statusCode, problem) = await InvokeAsync(exception);

        // Assert
        statusCode.Should().Be(StatusCodes.Status401Unauthorized);
        problem.Detail.Should().Be(exception.Message);
    }

    [Fact]
    public async Task InvokeAsync_InvalidOperationException_Returns409WithExceptionMessage()
    {
        // Arrange
        var exception = new InvalidOperationException("Username 'bob' is already taken.");

        // Act
        var (statusCode, problem) = await InvokeAsync(exception);

        // Assert
        statusCode.Should().Be(StatusCodes.Status409Conflict);
        problem.Detail.Should().Be(exception.Message);
    }

    [Fact]
    public async Task InvokeAsync_UnknownException_Returns500WithoutLeakingExceptionMessage()
    {
        // Arrange
        var exception = new InvalidCastException("some internal detail that should not leak");

        // Act
        var (statusCode, problem) = await InvokeAsync(exception);

        // Assert
        statusCode.Should().Be(StatusCodes.Status500InternalServerError);
        problem.Detail.Should().NotContain("internal detail");
    }
}
