using Booking.Domain.Entities;
using Booking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Booking.Api.Controllers;

// Minimal user creation for Phase 1 (create a room, reserve a slot). Real auth
// (password hashing, JWT login) is out of scope until it's actually needed.
public record CreateUserRequest(string Username, string Email);

[ApiController]
[Route("api/[controller]")]
public class UsersController(BookingDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetAll(CancellationToken ct)
        => await db.Users.AsNoTracking().ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<User>> Create(CreateUserRequest request, CancellationToken ct)
    {
        var user = new User
        {
            Username = request.Username,
            Email = request.Email
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new { id = user.Id }, user);
    }
}
