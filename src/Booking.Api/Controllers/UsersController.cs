using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetAll(CancellationToken ct)
        => Ok(await userService.GetAllAsync(ct));

    [HttpPost]
    public async Task<ActionResult<User>> Create(CreateUserRequest request, CancellationToken ct)
    {
        var user = await userService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetAll), new { id = user.Id }, user);
    }
}
