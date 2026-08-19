using Booking.Api.Filters;
using Booking.Application.DTOs;
using Booking.Application.Validators;
using FluentAssertions;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Booking.UnitTests.Filters;

public class FluentValidationActionFilterTests
{
    private static IServiceProvider BuildServiceProvider()
    {
        var services = new ServiceCollection();
        services.AddScoped<IValidator<CreateRoomRequest>, CreateRoomRequestValidator>();
        return services.BuildServiceProvider();
    }

    private static ActionExecutingContext CreateContext(object argument, IServiceProvider serviceProvider)
    {
        var httpContext = new DefaultHttpContext { RequestServices = serviceProvider };
        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        return new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?> { ["request"] = argument },
            controller: new object());
    }

    private static ActionExecutionDelegate NextDelegate(Action onCalled) => () =>
    {
        onCalled();
        return Task.FromResult<ActionExecutedContext>(null!);
    };

    [Fact]
    public async Task OnActionExecutionAsync_InvalidArgument_ShortCircuitsWith400()
    {
        // Arrange
        var serviceProvider = BuildServiceProvider();
        var sut = new FluentValidationActionFilter(serviceProvider);
        var context = CreateContext(new CreateRoomRequest(string.Empty, "HQ", 0), serviceProvider);
        var nextCalled = false;

        // Act
        await sut.OnActionExecutionAsync(context, NextDelegate(() => nextCalled = true));

        // Assert
        nextCalled.Should().BeFalse();
        var result = context.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var problem = result.Value.Should().BeOfType<ValidationProblemDetails>().Subject;
        problem.Status.Should().Be(StatusCodes.Status400BadRequest);
        problem.Errors.Should().ContainKey("Name");
    }

    [Fact]
    public async Task OnActionExecutionAsync_ValidArgument_CallsNext()
    {
        // Arrange
        var serviceProvider = BuildServiceProvider();
        var sut = new FluentValidationActionFilter(serviceProvider);
        var context = CreateContext(new CreateRoomRequest("Room A", "HQ", 4), serviceProvider);
        var nextCalled = false;

        // Act
        await sut.OnActionExecutionAsync(context, NextDelegate(() => nextCalled = true));

        // Assert
        nextCalled.Should().BeTrue();
        context.Result.Should().BeNull();
    }

    [Fact]
    public async Task OnActionExecutionAsync_NoValidatorRegisteredForArgumentType_CallsNext()
    {
        // Arrange
        var serviceProvider = BuildServiceProvider();
        var sut = new FluentValidationActionFilter(serviceProvider);
        var context = CreateContext("a plain string with no validator", serviceProvider);
        var nextCalled = false;

        // Act
        await sut.OnActionExecutionAsync(context, NextDelegate(() => nextCalled = true));

        // Assert
        nextCalled.Should().BeTrue();
    }
}
