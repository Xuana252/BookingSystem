using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class UserRepository(BookingDbContext db) : IUserRepository
{
    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default)
        => await db.Users.AsNoTracking().ToListAsync(ct);

    // Deliberately tracked, unlike GetAllAsync/GetByUsernameAsync — UserService.{Deactivate,
    // Activate,Promote,Demote}Async mutate the returned entity and rely on EF Core's change
    // tracking to persist it via SaveChangesAsync, the same pattern Room/ReservationRepository's
    // GetByIdAsync already use.
    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default)
        => await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username, ct);

    public async Task AddAsync(User user, CancellationToken ct = default)
        => await db.Users.AddAsync(user, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
